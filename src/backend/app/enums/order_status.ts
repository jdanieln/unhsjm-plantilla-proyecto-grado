export enum OrderStatus {
  DELIVERY_PENDING = 'pendiente_confirmacion',
  DELIVERY_DISPUTED = 'entrega_disputada',
  REDELIVERY = 'requiere_nueva_entrega',
  PENDING = 'pendiente',
  IN_TRANSIT = 'en_transito',
  DELIVERED = 'entregado',
  CANCELLED = 'cancelado',
  ANNULLED = 'anulado',
  WAITING_APPROVAL = 'esperando_aprobacion',
  ACCEPTED = 'aceptado',
  DENIED = 'denegado',
}
