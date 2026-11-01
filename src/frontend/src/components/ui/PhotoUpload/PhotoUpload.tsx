"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { Icon } from "@/components/ui/Icon/Icon";
import { PhotoCropDialog } from "./PhotoCropDialog";
import { MAX_PHOTO_BYTES } from "./cropImage";
import styles from "./PhotoUpload.module.css";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function PhotoUpload({ label = "Fotografía", value, onChange, existingUrl, disabled = false }: {
  label?: string;
  value: File | null;
  onChange: (file: File | null) => void;
  existingUrl?: string | null;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const hintId = useId();
  const [editorFile, setEditorFile] = useState<File | null>(null);
  const [applied, setApplied] = useState<{ source: File; output: File } | null>(null);
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!value) return;
    const reader = new FileReader();
    reader.onload = () => setPreview({ file: value, url: String(reader.result) });
    reader.readAsDataURL(value);
    return () => reader.abort();
  }, [value]);

  const selectedPreview = value && preview?.file === value ? preview.url : null;
  const imageUrl = selectedPreview || (!value ? existingUrl : null);

  return <div className={styles.root} aria-labelledby={labelId} aria-describedby={hintId}>
    <div className={styles.labelRow}><span id={labelId} className={styles.label}>{label}</span><span className={styles.optional}>Opcional</span></div>
    <div className={styles.card}>
      <div className={styles.thumbnail}>
        {imageUrl ? <Image src={imageUrl} alt={value ? "Vista previa de la fotografía seleccionada" : "Fotografía actual"} width={64} height={64} unoptimized /> : <Icon name="image" size={26} />}
      </div>
      <div className={styles.details}>
        <strong>{value ? value.name : existingUrl ? "Fotografía actual" : "Agrega una fotografía"}</strong>
        <span>{value ? `${(value.size / 1024).toFixed(0)} KB · Recorte listo para guardar` : existingUrl ? "Selecciona otra foto si quieres reemplazarla." : "Elige una imagen y ajusta el encuadre."}</span>
      </div>
      <input ref={inputRef} className={styles.hiddenInput} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled}
        aria-label={label} onChange={(event) => {
          const selected = event.target.files?.[0];
          event.target.value = "";
          if (!selected) return;
          if (!IMAGE_TYPES.includes(selected.type) || selected.size > MAX_PHOTO_BYTES) {
            setError("Selecciona una imagen JPG, PNG o WebP de hasta 2 MB.");
            return;
          }
          setError("");
          setEditorFile(selected);
        }} />
    </div>
    <div className={styles.controls}>
      <button type="button" className={styles.choose} disabled={disabled} onClick={() => inputRef.current?.click()}>
        <Icon name={value || existingUrl ? "edit" : "plus"} size={16} />{value || existingUrl ? "Cambiar foto" : "Elegir foto"}
      </button>
      {value && <>
        <button type="button" className={styles.adjust} disabled={disabled} onClick={() => setEditorFile(applied?.output === value ? applied.source : value)}>
          Ajustar recorte
        </button>
        <button type="button" className={styles.remove} disabled={disabled} onClick={() => { setApplied(null); setError(""); onChange(null); }}>
          <Icon name="trash" size={15} />Quitar selección
        </button>
      </>}
    </div>
    <small id={hintId} className={styles.hint}>JPG, PNG o WebP · máximo 2 MB. La foto se envía al guardar el formulario.</small>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {editorFile && <PhotoCropDialog file={editorFile} onClose={() => setEditorFile(null)} onApply={(cropped) => {
      setApplied({ source: editorFile, output: cropped });
      onChange(cropped);
      setEditorFile(null);
    }} />}
  </div>;
}
