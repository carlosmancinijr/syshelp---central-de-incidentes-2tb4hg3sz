import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Ticket, Clock, CheckCircle2 } from 'lucide-react'
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

        const [total, abertos, resolvidos, recentes] = await Promise.all([
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
        ])

        if (!vivo) return
        setDados({
          total: total.totalItems,
          abertos: abertos.totalItems,
          resolvidosMes: resolvidos.totalItems,
          atrasados: 0,
          porStatus: [],
          recentes: recentes.items,
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

  const cartoes = [
    { titulo: 'Total de chamados', valor: dados?.total, icone: Ticket, cor: 'text-blue-600' },
    { titulo: 'Em aberto', valor: dados?.abertos, icone: Clock, cor: 'text-amber-600' },
    {
      titulo: 'Resolvidos no mês',
      valor: dados?.resolvidosMes,
      icone: CheckCircle2,
      cor: 'text-emerald-600',
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

      <div className="flex justify-end">
        <Button asChild variant="outline">
          <Link to="/historico">
            <History className="mr-1.5 h-4 w-4" />
            Histórico de chamados encerrados
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
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
