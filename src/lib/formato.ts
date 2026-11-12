/** Formatação de datas e rótulos compartilhados. */

export function formatarData(v?: string | null): string {
  if (!v) return '—'
  // PocketBase devolve "2026-11-12 22:50:01.638Z"
  const s = String(v).replace(' ', 'T')
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatarDataCurta(v?: string | null): string {
  if (!v) return '—'
  const s = String(v).replace(' ', 'T')
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR')
}

export function iniciais(nome?: string): string {
  if (!nome) return '?'
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}
