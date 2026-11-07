import type { DemoFault } from '@/api/demoFaults'

export const DEMO_SCENARIOS: readonly {
  readonly id: DemoFault
  readonly label: string
  readonly group: string
  readonly hint?: string
}[] = [
  { id: 'offline', label: 'API sin conexión', group: 'Conexión y sesión' },
  { id: 'serverError', label: 'Error del servidor', group: 'Conexión y sesión' },
  { id: 'slow', label: 'Respuesta lenta', group: 'Conexión y sesión', hint: 'Las respuestas tardan 3 segundos.' },
  { id: 'invalidSuccess', label: 'Respuesta inválida', group: 'Conexión y sesión' },
  { id: 'sessionExpired', label: 'Sesión vencida', group: 'Conexión y sesión', hint: 'Se apaga al rechazar la próxima petición autenticada. No afecta al inicio de sesión.' },
  { id: 'pendingUnavailable', label: 'No cargan los pendientes', group: 'Saldos', hint: 'El disponible queda desconocido y los débitos se bloquean.' },
  { id: 'responseLost', label: 'Se pierde la respuesta', group: 'Operaciones', hint: 'La operación se envía de verdad, pero se pierde la respuesta. Revisa Movimientos antes de repetirla.' },
  { id: 'serverValidation', label: 'Validación del servidor', group: 'Operaciones', hint: 'Rechaza la operación sin enviarla al servidor.' },
  { id: 'transferInsufficientFunds', label: 'Fondos insuficientes en el servidor', group: 'Transferencias', hint: 'Rechaza el envío sin mover dinero.' },
  { id: 'transferStuck', label: 'Liquidación demorada', group: 'Transferencias', hint: 'Solo altera el seguimiento: la API sigue liquidando y los saldos y Movimientos muestran el resultado real.' },
  { id: 'transferFailed', label: 'Transferencia fallida', group: 'Transferencias', hint: 'Solo altera el seguimiento: la API sigue liquidando y los saldos y Movimientos muestran el resultado real.' },
  { id: 'transferTrackingFails', label: 'Falla el seguimiento', group: 'Transferencias', hint: 'Solo altera el seguimiento: la API sigue liquidando y los saldos y Movimientos muestran el resultado real.' },
  { id: 'fxOffline', label: 'Cotización no disponible', group: 'Cotización' },
  { id: 'fxInvalid', label: 'Cotización con datos inválidos', group: 'Cotización' },
]
