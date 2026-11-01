"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon/Icon";
import { cropBounds, drawSquareCrop, MAX_PHOTO_BYTES, moveCropCenter, OUTPUT_SIZE, type CropCenter } from "./cropImage";
import styles from "./PhotoUpload.module.css";

const INITIAL_CENTER = { x: 0.5, y: 0.5 };

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

export function PhotoCropDialog({ file, onApply, onClose }: {
  file: File;
  onApply: (file: File) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const titleId = useId();
  const zoomId = useId();
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<CropCenter>(INITIAL_CENTER);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    const focused = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    let active = true;
    let image: ImageBitmap | null = null;
    createImageBitmap(file).then((result) => {
      image = result;
      if (active) setBitmap(result);
      else result.close();
    }).catch(() => {
      if (active) setError("No pudimos abrir esa imagen. Prueba con otra foto.");
    });
    return () => {
      active = false;
      image?.close();
      dialog?.close();
      focused?.focus();
    };
  }, [file]);

  useEffect(() => {
    if (!bitmap || !canvasRef.current) return;
    const context = canvasRef.current.getContext("2d");
    if (context) drawSquareCrop(context, bitmap, canvasRef.current.width, zoom, center);
  }, [bitmap, zoom, center]);

  function moveBy(deltaX: number, deltaY: number) {
    if (!bitmap) return;
    setCenter((current) => moveCropCenter(bitmap.width, bitmap.height, zoom, current, deltaX, deltaY));
  }

  async function applyCrop() {
    if (!bitmap || busy) return;
    setBusy(true);
    setError("");
    try {
      const output = document.createElement("canvas");
      output.width = OUTPUT_SIZE;
      output.height = OUTPUT_SIZE;
      const context = output.getContext("2d");
      if (!context) throw new Error("Tu navegador no pudo procesar la fotografía.");
      drawSquareCrop(context, bitmap, OUTPUT_SIZE, zoom, center);
      let blob = await canvasBlob(output, file.type, 0.9);
      if (!blob || blob.size > MAX_PHOTO_BYTES) {
        context.globalCompositeOperation = "destination-over";
        context.fillStyle = "#fff";
        context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
        context.globalCompositeOperation = "source-over";
        for (const quality of [0.86, 0.7, 0.54]) {
          blob = await canvasBlob(output, "image/jpeg", quality);
          if (blob && blob.size <= MAX_PHOTO_BYTES) break;
        }
      }
      if (!blob || blob.size > MAX_PHOTO_BYTES) throw new Error("No pudimos reducir la foto a 2 MB. Prueba con otra imagen.");
      const extension = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
      const name = `${file.name.replace(/\.[^.]+$/, "")}-recortada.${extension}`;
      onApply(new File([blob], name, { type: blob.type }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos recortar la fotografía.");
    } finally {
      setBusy(false);
    }
  }

  const crop = bitmap && cropBounds(bitmap.width, bitmap.height, zoom, center);
  return <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId}
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <header className={styles.dialogHeader}>
      <div><span className={styles.eyebrow}>AJUSTA TU FOTOGRAFÍA</span><h2 id={titleId}>Recortar imagen</h2></div>
      <button type="button" className={styles.close} onClick={onClose} disabled={busy} aria-label="Cancelar recorte"><Icon name="close" /></button>
    </header>
    <div className={styles.dialogBody}>
      <p>Arrastra la imagen para encuadrarla y usa el control para acercarla. El recorte será cuadrado.</p>
      <div className={styles.canvasFrame}>
        <canvas ref={canvasRef} width={640} height={640} tabIndex={bitmap ? 0 : -1}
          role="img" aria-label="Vista previa del recorte. Usa las flechas para mover la foto."
          onPointerDown={(event) => {
            if (!bitmap) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerMove={(event) => {
            if (!dragRef.current) return;
            const rect = event.currentTarget.getBoundingClientRect();
            moveBy((event.clientX - dragRef.current.x) / rect.width, (event.clientY - dragRef.current.y) / rect.height);
            dragRef.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerUp={(event) => { dragRef.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
          onPointerCancel={() => { dragRef.current = null; }}
          onKeyDown={(event) => {
            const step = event.shiftKey ? 0.08 : 0.025;
            const movement: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
            if (movement[event.key]) { event.preventDefault(); moveBy(...movement[event.key]); }
          }}
        />
        {!bitmap && <span className={styles.canvasLoading}>Preparando imagen…</span>}
      </div>
      <label className={styles.zoomLabel} htmlFor={zoomId}>Acercar <strong>{Math.round(zoom * 100)} %</strong></label>
      <input id={zoomId} className={styles.zoom} type="range" min="1" max="3" step="0.05" value={zoom} disabled={!bitmap || busy}
        onChange={(event) => setZoom(Number(event.target.value))} />
      {crop && <span className={styles.cropSize}>Área seleccionada: {Math.round(crop.side)} × {Math.round(crop.side)} px</span>}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
    <footer className={styles.dialogActions}>
      <button type="button" className={styles.secondary} onClick={onClose} disabled={busy}>Cancelar</button>
      <button type="button" className={styles.primary} onClick={() => void applyCrop()} disabled={!bitmap || busy}>
        {busy ? "Procesando…" : "Usar esta foto"}
      </button>
    </footer>
  </dialog>;
}
