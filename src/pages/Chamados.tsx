import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatarData } from '@/lib/formato'
import { rotuloStatus, corStatus, corPrioridade, STATUS_ORDEM } from '@/lib/status'

const POR_PAGINA = 25

export default function Chamados() {
  const { usuario, podeAtender } = useAuth()
  const [itens, setItens] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState('todos')
  const [carregando, setCarregando] = useState(true)

  const filtro = useMemo(() => {
    const partes: string[] = []
    if (!podeAtender && usuario?.id) {
      partes.push(`solicitante_id.usuario_id='${usuario.id}'`)
    }
    if (status !== 'todos') partes.push(`status='${status}'`)
    const b = busca.trim().replace(/'/g, "\\'")
    if (b) {
      partes.push(
        `(protocolo~'${b}' || titulo~'${b}' || solicitante_nome~'${b}' || estacao~'${b}' || ip~'${b}')`,
      )
    }
    return partes.join(' && ')
  }, [busca, status, podeAtender, usuario?.id])

  useEffect(() => {
    let vivo = true
    const t = setTimeout(async () => {
      setCarregando(true)
      try {
        const r = await pb.collection('chamados').getList(pagina, POR_PAGINA, {
          filter: filtro || undefined,
          sort: '-abertura',
        })
        if (!vivo) return
        setItens(r.items)
        setTotal(r.totalItems)
      } finally {
        if (vivo) setCarregando(false)
      }
    }, 250)
    return () => {
      vivo = false
      clearTimeout(t)
    }
  }, [filtro, pagina])

  useEffect(() => {
    setPagina(1)
  }, [filtro])

  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {podeAtender ? 'Chamados' : 'Meus chamados'}
          </h1>
          <p className="text-sm text-slate-500">{total.toLocaleString('pt-BR')} chamado(s)</p>
        </div>
        <Button asChild>
          <Link to="/novo">Abrir chamado</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Protocolo, título, solicitante, estação ou IP"
            className="pl-8"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {STATUS_ORDEM.map((s) => (
              <SelectItem key={s} value={s}>
                {rotuloStatus(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            <div className="hidden gap-3 bg-slate-50 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-500 sm:flex">
              <span className="w-32">Protocolo</span>
              <span className="flex-1">Incidente</span>
              <span className="w-28">Estação</span>
              <span className="w-16">Prior.</span>
              <span className="w-36">Status</span>
              <span className="w-32">Aberto em</span>
            </div>

            {carregando && <div className="p-6 text-sm text-slate-500">Carregando...</div>}
            {!carregando && itens.length === 0 && (
              <div className="p-6 text-sm text-slate-500">
                Nenhum chamado encontrado com esses filtros.
              </div>
            )}

            {itens.map((c) => (
              <Link
                key={c.id}
                to={`/chamados/${c.id}`}
                className="flex flex-wrap items-center gap-3 px-4 py-2.5 hover:bg-slate-50 sm:flex-nowrap"
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
                <span className="w-32 shrink-0 text-[11px] text-slate-500">
                  {formatarData(c.abertura)}
                </span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          Página {pagina} de {paginas}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagina <= 1}
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pagina >= paginas}
            onClick={() => setPagina((p) => Math.min(paginas, p + 1))}
          >
            Próxima
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
