/**
 * Cumprimento de SLA por prioridade — base do painel.
 *
 * Considera os chamados ENCERRADOS (resolvido/fechado) dos últimos N dias e
 * agrupa por prioridade. "No prazo" é o chamado cuja situação final é
 * cumprido; os encerrados antes da implantação do SLA não têm prazo e ficam
 * fora da conta.
 */

export type LinhaSla = {
  prioridade: string
  total: number
  noPrazo: number
  violados: number
  percentual: number | null
  meta: number | null
  atinge: boolean | null
}

export function agruparCumprimento(
  chamados: any[],
  metas: Record<string, number | null>,
): LinhaSla[] {
  const prioridades = ['P1', 'P2', 'P3', 'P4', 'P5']
  const mapa: Record<string, { total: number; noPrazo: number }> = {}
  for (const p of prioridades) mapa[p] = { total: 0, noPrazo: 0 }

  for (const c of chamados) {
    const p = c.prioridade || 'P3'
    if (!mapa[p]) mapa[p] = { total: 0, noPrazo: 0 }
    // só entra quem teve prazo calculado (chamado criado depois do SLA)
    if (!c.prazo_resolucao) continue
    mapa[p].total++
    if (c.sla_situacao === 'cumprido') mapa[p].noPrazo++
  }

  return prioridades
    .filter((p) => mapa[p])
    .map((p) => {
      const { total, noPrazo } = mapa[p]
      const meta = metas[p] ?? null
      const percentual = total > 0 ? Math.round((noPrazo / total) * 100) : null
      return {
        prioridade: p,
        total,
        noPrazo,
        violados: total - noPrazo,
        percentual,
        meta,
        atinge: percentual === null || meta === null ? null : percentual >= meta,
      }
    })
}

/** Percentual geral de cumprimento, somando todas as prioridades. */
export function cumprimentoGeral(linhas: LinhaSla[]) {
  const total = linhas.reduce((s, l) => s + l.total, 0)
  const noPrazo = linhas.reduce((s, l) => s + l.noPrazo, 0)
  if (total === 0) return { total: 0, noPrazo: 0, percentual: null as number | null }
  return { total, noPrazo, percentual: Math.round((noPrazo / total) * 100) }
}
