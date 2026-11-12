/** Rótulos e cores de status — usados por várias telas. */

export const ROTULO_STATUS: Record<string, string> = {
  aberto: 'Aberto',
  em_atendimento: 'Em atendimento',
  aguardando_solicitante: 'Aguardando solicitante',
  aguardando_terceiro: 'Aguardando terceiro',
  resolvido: 'Resolvido',
  fechado: 'Fechado',
  cancelado: 'Cancelado',
}

export function rotuloStatus(s: string) {
  return ROTULO_STATUS[s] || s || '—'
}

export function corStatus(s: string) {
  if (s === 'aberto') return 'bg-amber-100 text-amber-800'
  if (s === 'em_atendimento') return 'bg-blue-100 text-blue-800'
  if (s === 'resolvido' || s === 'fechado') return 'bg-emerald-100 text-emerald-800'
  if (s === 'cancelado') return 'bg-slate-100 text-slate-600'
  return 'bg-violet-100 text-violet-800'
}

export function corPrioridade(p?: string) {
  if (p === 'P1') return 'bg-red-100 text-red-800'
  if (p === 'P2') return 'bg-orange-100 text-orange-800'
  if (p === 'P3') return 'bg-blue-100 text-blue-800'
  return 'bg-slate-100 text-slate-600'
}

export const STATUS_ORDEM = [
  'aberto',
  'em_atendimento',
  'aguardando_solicitante',
  'aguardando_terceiro',
  'resolvido',
  'fechado',
  'cancelado',
]
