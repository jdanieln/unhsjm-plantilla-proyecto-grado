"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Icon } from "@/components/ui/Icon/Icon";
import { Modal } from "@/components/ui/Workspace/Workspace";
import { formatMoney, type OrderDetail } from "../../types/client";
import styles from "./PaymentCheckout.module.css";

export type PaymentSubmission = {
  method: "card" | "transfer";
  billingEmail: string;
  cardHolderName?: string;
  cardNumber?: string;
  expiry?: string;
  cvc?: string;
  transferReference?: string;
};

type Props = {
  orderId: number;
  companyName: string;
  details: OrderDetail[];
  amount: number;
  billingEmail: string;
  busy: boolean;
  error: string;
  acceptedWithoutPayment: boolean;
  onClose: () => void;
  onPay: (data: PaymentSubmission) => void;
};

function formatCardNumber(value: string) {
  return (value.replace(/\D/g, "").slice(0, 19).match(/.{1,4}/g) || []).join(" ");
}

function restoreCardCursor(input: HTMLInputElement, formatted: string, digitsBeforeCursor: number) {
  window.requestAnimationFrame(() => {
    if (document.activeElement !== input) return;
    let cursor = 0;
    let digits = 0;
    while (cursor < formatted.length && digits < digitsBeforeCursor) {
      if (/\d/.test(formatted[cursor])) digits++;
      cursor++;
    }
    if (formatted[cursor] === " ") cursor++;
    input.setSelectionRange(cursor, cursor);
  });
}

export function PaymentCheckout({ orderId, companyName, details, amount, billingEmail, busy, error, acceptedWithoutPayment, onClose, onPay }: Props) {
  const [method, setMethod] = useState<"card" | "transfer">("card");
  const [cardNumber, setCardNumber] = useState("");

  function updateCardNumber(input: HTMLInputElement) {
    const digitsBeforeCursor = input.value.slice(0, input.selectionStart ?? input.value.length).replace(/\D/g, "").length;
    const formatted = formatCardNumber(input.value);
    setCardNumber(formatted);
    restoreCardCursor(input, formatted, digitsBeforeCursor);
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const cursor = input.selectionStart ?? 0;
    if (event.key !== "Backspace" || input.selectionEnd !== cursor || input.value[cursor - 1] !== " ") return;
    event.preventDefault();
    const digits = cardNumber.replace(/\D/g, "");
    const digitPosition = input.value.slice(0, cursor - 1).replace(/\D/g, "").length;
    const formatted = formatCardNumber(digits.slice(0, digitPosition - 1) + digits.slice(digitPosition));
    setCardNumber(formatted);
    restoreCardCursor(input, formatted, digitPosition - 1);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    onPay({
      method,
      billingEmail: String(fields.get("billingEmail") || "").trim(),
      ...(method === "card" ? {
        cardHolderName: String(fields.get("cardHolderName") || "").trim(),
        cardNumber: String(fields.get("cardNumber") || "").replace(/\s/g, ""),
        expiry: String(fields.get("expiry") || "").trim(),
        cvc: String(fields.get("cvc") || "").trim(),
      } : { transferReference: String(fields.get("transferReference") || "").trim() }),
    });
  }

  return <Modal title="Finalizar pago" eyebrow="TRAVELDLS · PASARELA DE PRUEBA" size="wide" busy={busy} onClose={onClose}>
    <div className={styles.checkout}>
      <aside className={styles.summary} aria-label="Resumen del pedido">
        <div className={styles.brand}><span><Icon name="truck" size={21} /></span><strong>TravelDLS</strong><small>Pago de prueba</small></div>
        <p className={styles.summaryLabel}>Total del transporte</p>
        <strong className={styles.total}>{formatMoney(amount)}</strong>
        <div className={styles.orderMeta}><Icon name="box" size={17} /><span>Pedido #{orderId}<small>Empresa: {companyName}</small></span></div>
        <div className={styles.lineItems}>
          <h3>Cargas incluidas</h3>
          <ul>{details.map((detail) => <li key={detail.idDetails}><span>{detail.cargoDescription}</span><strong>{formatMoney(Number(detail.amount))}</strong></li>)}</ul>
        </div>
        <p className={styles.testNotice}><Icon name="help" size={17} />Esta pasarela es una simulación. No se hará ningún cobro real.</p>
      </aside>

      <form className={styles.form} onSubmit={submit}>
        <div className={styles.formIntro}><span className={styles.step}>01 / 02</span><h3>Elige cómo pagar</h3><p>Completa el pago de prueba para {acceptedWithoutPayment ? "habilitar la asignación de conductor" : "aceptar la cotización"}.</p></div>
        <div className={styles.methods} role="group" aria-label="Método de pago">
          <button type="button" className={styles.method} data-active={method === "card"} aria-pressed={method === "card"} disabled={busy} onClick={() => setMethod("card")}><Icon name="tag" size={20} /><span>Tarjeta de prueba</span><span className={styles.methodMark} aria-hidden="true" /></button>
          <button type="button" className={styles.method} data-active={method === "transfer"} aria-pressed={method === "transfer"} disabled={busy} onClick={() => setMethod("transfer")}><Icon name="building" size={20} /><span>Transferencia</span><span className={styles.methodMark} aria-hidden="true" /></button>
        </div>

        <div className={styles.fields}>
          <label className={styles.field}>Correo de facturación<input type="email" name="billingEmail" defaultValue={billingEmail} autoComplete="email" required /></label>
          {method === "card" ? <>
            <label className={styles.field}>Nombre en la tarjeta<input name="cardHolderName" autoComplete="off" placeholder="Nombre de prueba" required minLength={3} /></label>
            <label className={styles.field}>Número de tarjeta de prueba<input name="cardNumber" inputMode="numeric" autoComplete="off" placeholder="4242 4242 4242 4242" value={cardNumber} onChange={(event) => updateCardNumber(event.currentTarget)} onKeyDown={handleCardKeyDown} required minLength={14} maxLength={23} /></label>
            <div className={styles.fieldPair}><label className={styles.field}>Vencimiento<input name="expiry" autoComplete="off" placeholder="MM/AA" required minLength={4} maxLength={5} /></label><label className={styles.field}>CVC de prueba<input name="cvc" inputMode="numeric" autoComplete="off" placeholder="123" required minLength={3} maxLength={4} /></label></div>
          </> : <label className={styles.field}>Referencia de transferencia de prueba<input name="transferReference" autoComplete="off" placeholder="Ej. TRANSFER-1234" required minLength={4} maxLength={100} /></label>}
        </div>

        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.footer}>
          <p><Icon name="lock" size={15} />Usa únicamente datos ficticios. El pago se registrará en TravelDLS como simulación.</p>
          <div className={styles.actions}><button type="button" className={styles.back} disabled={busy} onClick={onClose}>Volver al pedido</button><button className={styles.pay} disabled={busy}>{busy ? "Procesando pago de prueba…" : `Pagar ${formatMoney(amount)}${acceptedWithoutPayment ? "" : " y aceptar"}`}<Icon name="arrow" size={17} /></button></div>
        </div>
      </form>
    </div>
  </Modal>;
}
