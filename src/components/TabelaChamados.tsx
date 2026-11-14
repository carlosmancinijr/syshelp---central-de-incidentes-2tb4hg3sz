import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatarData } from '@/lib/formato'
import { rotuloStatus, corStatus, corPrioridade } from '@/lib/status'
import { corSla, restanteEmTexto } from '@/lib/sla'
import BotaoCancelar from '@/components/BotaoCancelar'

/** Linhas da listagem de chamados — compartilhada entre /chamados e /historico. */
export default function TabelaChamados({
  itens,
  carregando,
  vazio = 'Nenhum chamado encontrado com esses filtros.',
  podeCancelar = false,
  aoCancelar,
}: {
  itens: any[]
  carregando?: boolean
  vazio?: string
  podeCancelar?: boolean
  aoCancelar?: (atualizado: any) => void
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          <div className="hidden gap-3 bg-slate-50 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-500 sm:flex">
            <span className="w-32">Protocolo</span>
            <span className="flex-1">Incidente</span>
            <span className="w-28">Estação</span>
            <span className="w-16">Prior.</span>
            <span className="w-36">Status</span>
            <span className="w-40">SLA</span>
            <span className="w-32">Aberto em</span>
          </div>

          {carregando && <div className="p-6 text-sm text-slate-500">Carregando...</div>}
          {!carregando && itens.length === 0 && (
            <div className="p-6 text-sm text-slate-500">{vazio}</div>
          )}

          {itens.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center gap-3 px-4 py-2.5 hover:bg-slate-50 sm:flex-nowrap"
            >
              <Link
                to={`/chamados/${c.id}`}
                className="flex min-w-0 flex-1 flex-wrap items-center gap-3 sm:flex-nowrap"
              >
                <span className="w-32 shrink-0 font-mono text-[11px] text-slate-500">
                  {c.protocolo}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{c.titulo}</span>
                  <span className="block truncate text-[11px] text-slate-500">
                    {c.solicitante_nome || '—'} · {c.setor || '—'}
                  </span>
                </span>
                <span className="w-28 shrink-0 font-mono text-[11px] text-slate-500">
                  {c.estacao || '—'}
                </span>
                <span className="w-16 shrink-0">
                  <Badge variant="secondary" className={corPrioridade(c.prioridade)}>
                    {c.prioridade || '—'}
                  </Badge>
                </span>
                <span className="w-36 shrink-0">
                  <Badge variant="secondary" className={corStatus(c.status)}>
                    {rotuloStatus(c.status)}
                  </Badge>
                </span>
                <span className="w-40 shrink-0">
                  {c.sla_situacao ? (
                    <span className="flex flex-col gap-0.5">
                      <Badge variant="secondary" className={corSla(c.sla_situacao)}>
                        {c.sla_situacao === 'violado'
                          ? 'Estourado'
                          : c.sla_situacao === 'cumprido'
                            ? 'No prazo'
                            : c.sla_situacao === 'em_risco'
                              ? 'Em risco'
                              : c.sla_situacao === 'pausado'
                                ? 'Pausado'
                                : 'No prazo'}
                      </Badge>
                      {c.prazo_resolucao && !['cumprido', 'violado'].includes(c.sla_situacao) && (
                        <span className="text-[10px] text-slate-500">
                          {restanteEmTexto(c.prazo_resolucao)}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">sem prazo</span>
                  )}
                </span>
                <span className="w-32 shrink-0 text-[11px] text-slate-500">
                  {formatarData(c.abertura)}
                </span>
              </Link>
              {podeCancelar && c.status !== 'cancelado' && (
                <span className="shrink-0">
                  <BotaoCancelar
                    chamado={c}
                    variante="ghost"
                    aoCancelar={(atualizado) => aoCancelar?.(atualizado)}
                  />
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
