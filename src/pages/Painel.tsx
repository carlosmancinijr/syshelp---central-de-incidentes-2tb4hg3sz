import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Ticket, Clock, CheckCircle2, AlertTriangle, AlarmClockOff } from 'lucide-react'
import { agruparCumprimento, cumprimentoGeral } from '@/lib/slaPainel'
import { corSla, minutosEmTexto } from '@/lib/sla'
import { corPrioridade } from '@/lib/status'
import { formatarData } from '@/lib/formato'
import { rotuloStatus, corStatus, filtroNaoEncerrados } from '@/lib/status'
import { History } from 'lucide-react'

type Resumo = {
  total: number
  abertos: number
  resolvidosMes: number
  atrasados: number
  porStatus: { status: string; total: number }[]
  recentes: any[]
  linhasSla: any[]
  geralSla: { total: number; noPrazo: number; percentual: number | null }
  emRisco: any[]
  backlog: number
  mediaResposta: number | null
}

export default function Painel() {
  const { usuario, podeAtender } = useAuth()
  const [dados, setDados] = useState<Resumo | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let vivo = true
    async function carregar() {
      setCarregando(true)
      try {
        const filtroDono = podeAtender ? '' : ` && solicitante_id.usuario_id='${usuario?.id}'`
        const inicioMes = new Date()
        inicioMes.setDate(1)
        inicioMes.setHours(0, 0, 0, 0)

        const agoraTxt = new Date().toISOString().replace('T', ' ')
        const [total, abertos, resolvidos, recentes, backlog] = await Promise.all([
          pb.collection('chamados').getList(1, 1, { filter: `id!=''${filtroDono}` }),
          pb.collection('chamados').getList(1, 1, {
            filter: `status='aberto' || status='em_atendimento' || status='aguardando_solicitante' || status='aguardando_terceiro'${filtroDono}`,
          }),
          pb.collection('chamados').getList(1, 1, {
            filter: `(status='resolvido' || status='fechado') && fechamento>='${inicioMes.toISOString().replace('T', ' ')}'${filtroDono}`,
          }),
          pb.collection('chamados').getList(1, 8, {
            filter: `id!='' && (${filtroNaoEncerrados()})${filtroDono}`,
            sort: '-abertura',
          }),
          // Backlog: em andamento com prazo de resolução já vencido.
          pb.collection('chamados').getList(1, 1, {
            filter: `${filtroNaoEncerrados()} && prazo_resolucao != '' && prazo_resolucao < '${agoraTxt}' && status!='aguardando_solicitante' && status!='aguardando_terceiro'${filtroDono}`,
          }),
        ])

        // ── SLA: encerrados dos últimos 30 dias, regras e risco atual ────
        const desde = new Date()
        desde.setDate(desde.getDate() - 30)
        desde.setHours(0, 0, 0, 0)
        const desdeTxt = desde.toISOString().replace('T', ' ')

        const [encerrados, regras, emRisco] = await Promise.all([
          pb
            .collection('chamados')
            .getFullList({
              filter: `(status='resolvido' || status='fechado') && prazo_resolucao != '' && fechamento>='${desdeTxt}'${filtroDono}`,
              sort: '-fechamento',
            })
            .catch(() => []),
          pb
            .collection('sla_regras')
            .getFullList({ sort: 'prioridade' })
            .catch(() => []),
          pb
            .collection('chamados')
            .getFullList({
              filter: `${filtroNaoEncerrados()} && (sla_situacao='em_risco' || sla_situacao='violado')${filtroDono}`,
              sort: 'prazo_resolucao',
            })
            .catch(() => []),
        ])

        const metas: Record<string, number | null> = {}
        for (const r of regras) metas[r.prioridade] = r.meta_percentual ?? null
        const linhasSla = agruparCumprimento(encerrados, metas)
        const geralSla = cumprimentoGeral(linhasSla)

        // tempo médio de 1ª resposta (minutos úteis aproximados por relógio)
        const comResposta = encerrados.filter((c) => c.primeira_resposta_em && c.abertura)
        const mediaResposta =
          comResposta.length > 0
            ? Math.round(
                comResposta.reduce((s, c) => {
                  const a = new Date(String(c.abertura).replace(' ', 'T')).getTime()
                  const r = new Date(String(c.primeira_resposta_em).replace(' ', 'T')).getTime()
                  return s + Math.max(0, (r - a) / 60000)
                }, 0) / comResposta.length,
              )
            : null

        if (!vivo) return
        setDados({
          total: total.totalItems,
          abertos: abertos.totalItems,
          resolvidosMes: resolvidos.totalItems,
          atrasados: emRisco.length,
          porStatus: [],
          recentes: recentes.items,
          linhasSla,
          geralSla,
          emRisco,
          backlog: backlog.totalItems,
          mediaResposta,
        })
      } finally {
        if (vivo) setCarregando(false)
      }
    }
    carregar()
    return () => {
      vivo = false
    }
  }, [podeAtender, usuario?.id])

  const temBacklog = (dados?.backlog ?? 0) > 0

  const cartoes = [
    { titulo: 'Total de chamados', valor: dados?.total, icone: Ticket, cor: 'text-blue-600' },
    { titulo: 'Em aberto', valor: dados?.abertos, icone: Clock, cor: 'text-amber-600' },
    {
      titulo: 'Resolvidos no mês',
      valor: dados?.resolvidosMes,
      icone: CheckCircle2,
      cor: 'text-emerald-600',
    },
    {
      titulo: 'Backlog de SLA',
      valor: dados?.backlog ?? 0,
      icone: AlarmClockOff,
      cor: temBacklog ? 'text-red-600' : 'text-slate-500',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Painel</h1>
        <p className="text-sm text-slate-500">
          {podeAtender ? 'Visão geral de todos os chamados' : 'Seus chamados'}
        </p>
      </div>

      <div className="flex justify-end gap-2">
        {temBacklog && (
          <Button asChild variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
            <Link to="/backlog">
              <AlarmClockOff className="mr-1.5 h-4 w-4" />
              Backlog de SLA ({(dados?.backlog ?? 0).toLocaleString('pt-BR')})
            </Link>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link to="/historico">
            <History className="mr-1.5 h-4 w-4" />
            Histórico de chamados encerrados
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {cartoes.map((c) => {
          const Icone = c.icone
          return (
            <Card key={c.titulo}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`rounded-lg bg-slate-100 p-2 ${c.cor}`}>
                  <Icone className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-2xl font-semibold tabular-nums">
                    {carregando ? '—' : (c.valor ?? 0).toLocaleString('pt-BR')}
                  </div>
                  <div className="text-xs text-slate-500">{c.titulo}</div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Cumprimento de SLA — últimos 30 dias</CardTitle>
          <p className="text-xs text-slate-500">
            {dados?.geralSla.percentual !== null && dados?.geralSla.percentual !== undefined
              ? `${dados.geralSla.noPrazo} de ${dados.geralSla.total} chamados encerrados no prazo (${dados.geralSla.percentual}%)`
              : 'Nenhum chamado encerrado com prazo calculado ainda.'}
            {dados?.mediaResposta
              ? ` · 1ª resposta em média ${minutosEmTexto(dados.mediaResposta)}`
              : ''}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {(dados?.linhasSla || []).map((l) => (
              <div key={l.prioridade} className="flex flex-wrap items-center gap-3 px-4 py-2">
                <span className="w-12 shrink-0">
                  <Badge variant="secondary" className={corPrioridade(l.prioridade)}>
                    {l.prioridade}
                  </Badge>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <span
                      className={
                        l.atinge === false
                          ? 'block h-full bg-red-500'
                          : l.atinge === true
                            ? 'block h-full bg-emerald-500'
                            : 'block h-full bg-slate-300'
                      }
                      style={{ width: `${l.percentual ?? 0}%` }}
                    />
                  </span>
                  <span className="mt-1 block text-[11px] text-slate-500">
                    {l.total === 0
                      ? 'sem chamados encerrados'
                      : `${l.noPrazo}/${l.total} no prazo · ${l.violados} fora`}
                  </span>
                </span>
                <span className="w-28 shrink-0 text-right text-xs">
                  <span className="font-medium tabular-nums">
                    {l.percentual === null ? '—' : `${l.percentual}%`}
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    meta {l.meta === null ? '—' : `${l.meta}%`}
                  </span>
                </span>
                <span className="w-20 shrink-0 text-right">
                  {l.atinge === null ? (
                    <span className="text-[11px] text-slate-400">—</span>
                  ) : l.atinge ? (
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                      Atinge
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      Abaixo
                    </Badge>
                  )}
                </span>
              </div>
            ))}
            {!carregando && (dados?.linhasSla || []).length === 0 && (
              <div className="p-6 text-sm text-slate-500">Sem dados de SLA ainda.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {(dados?.emRisco?.length || 0) > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              Precisa de atenção agora
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {dados?.emRisco.map((c: any) => (
                <Link
                  key={c.id}
                  to={`/chamados/${c.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50"
                >
                  <span className="w-32 shrink-0 font-mono text-[11px] text-slate-500">
                    {c.protocolo}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{c.titulo}</span>
                  <Badge variant="secondary" className={corPrioridade(c.prioridade)}>
                    {c.prioridade}
                  </Badge>
                  <Badge variant="secondary" className={corSla(c.sla_situacao)}>
                    {c.sla_situacao === 'violado' ? 'Estourado' : 'Em risco'}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Últimos chamados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {carregando && <div className="p-6 text-sm text-slate-500">Carregando...</div>}
          {!carregando && dados?.recentes.length === 0 && (
            <div className="p-6 text-sm text-slate-500">Nenhum chamado.</div>
          )}
          <div className="divide-y">
            {dados?.recentes.map((c) => (
              <Link
                key={c.id}
                to={`/chamados/${c.id}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50"
              >
                <span className="w-32 shrink-0 font-mono text-[11px] text-slate-500">
                  {c.protocolo}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{c.titulo}</span>
                <span className="hidden shrink-0 text-xs text-slate-500 sm:block">
                  {formatarData(c.abertura)}
                </span>
                <Badge className={`shrink-0 ${corStatus(c.status)}`} variant="secondary">
                  {rotuloStatus(c.status)}
                </Badge>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
