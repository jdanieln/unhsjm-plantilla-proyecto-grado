export function aggregateDeliveryStatus(states: string[]): string {
  if (states.length && states.every((s) => s === 'confirmed')) return 'entregado'
  if (states.includes('disputed')) return 'entrega_disputada'
  if (states.includes('rescheduled')) return 'requiere_nueva_entrega'
  if (states.some((s) => s === 'pending' || s === 'in_transit')) return 'en_transito'
  return 'pendiente_confirmacion'
}
export function needsDeliveryReview(status: string, reportedAt: Date | string, now = Date.now()) {
  return (
    status === 'disputed' ||
    (status === 'awaiting_confirmation' &&
      now - new Date(reportedAt).getTime() >= 48 * 60 * 60 * 1000)
  )
}
