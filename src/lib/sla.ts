/** SLA: rótulos, cores e formatação de prazo — usados no chamado e no painel. */

export const ROTULO_SITUACAO_SLA: Record<string, string> = {
  no_prazo: 'No prazo',
  em_risco: 'Em risco',
  violado: 'Violado',
  cumprido: 'Cumprido',
  pausado: 'Pausado',
}

export function rotuloSla(s?: string) {
  if (!s) return '—'
  return ROTULO_SITUACAO_SLA[s] || s
}

export function corSla(s?: string) {
  if (s === 'no_prazo') return 'bg-emerald-100 text-emerald-800'
  if (s === 'em_risco') return 'bg-amber-100 text-amber-900'
  if (s === 'violado') return 'bg-red-100 text-red-800'
  if (s === 'cumprido') return 'bg-teal-100 text-teal-800'
  return 'bg-violet-100 text-violet-800'
}

/** "480" minutos → "8 h" · "90" → "1 h 30 min" · "45" → "45 min" */
export function minutosEmTexto(min?: number | null) {
  if (min === null || min === undefined || !isFinite(Number(min))) return '—'
  const total = Math.round(Number(min))
  if (total <= 0) return '—'
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

/** Tempo restante até um prazo, em texto curto ("3 h 12 min", "2 dias"). */
export function restanteEmTexto(prazo?: string | null) {
  if (!prazo) return '—'
  const d = new Date(String(prazo).replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return '—'
  const diff = d.getTime() - Date.now()
  const abs = Math.abs(diff)
  const h = Math.floor(abs / 3600000)
  const m = Math.round((abs % 3600000) / 60000)
  const texto =
    h >= 24 ? `${Math.floor(h / 24)} d ${h % 24} h` : h > 0 ? `${h} h ${m} min` : `${m} min`
  return diff >= 0 ? `em ${texto}` : `há ${texto}`
}

/** Percentual do prazo já consumido (0 a 100+). */
export function percentualConsumido(abertura?: string | null, prazo?: string | null) {
  if (!abertura || !prazo) return null
  const a = new Date(String(abertura).replace(' ', 'T')).getTime()
  const p = new Date(String(prazo).replace(' ', 'T')).getTime()
  if (!isFinite(a) || !isFinite(p) || p <= a) return null
  return Math.max(0, Math.round(((Date.now() - a) / (p - a)) * 100))
}

/** Filtro PocketBase: chamados ativos (nem resolvidos, fechados ou cancelados). */
export function filtroAtivos() {
  return "status!='resolvido' && status!='fechado' && status!='cancelado'"
}
