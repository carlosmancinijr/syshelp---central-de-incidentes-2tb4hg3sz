import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, ChevronLeft, ChevronRight, History } from 'lucide-react'
import { rotuloStatus, STATUS_ORDEM, STATUS_ENCERRADO, filtroNaoEncerrados } from '@/lib/status'
import TabelaChamados from '@/components/TabelaChamados'

const POR_PAGINA = 25

export default function Chamados() {
  const { usuario, podeAtender } = useAuth()
  const [itens, setItens] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState('todos')
  const [carregando, setCarregando] = useState(true)
  const [recarregar, setRecarregar] = useState(0)

  const filtro = useMemo(() => {
    const partes: string[] = [filtroNaoEncerrados()]
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
  }, [filtro, pagina, recarregar])

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
          <p className="text-sm text-slate-500">
            {total.toLocaleString('pt-BR')} chamado(s) em andamento
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/historico">
              <History className="mr-1.5 h-4 w-4" />
              Histórico
            </Link>
          </Button>
          <Button asChild>
            <Link to="/novo">Abrir chamado</Link>
          </Button>
        </div>
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
            {STATUS_ORDEM.filter((s) => !(STATUS_ENCERRADO as readonly string[]).includes(s)).map(
              (s) => (
                <SelectItem key={s} value={s}>
                  {rotuloStatus(s)}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </div>

      <TabelaChamados
        itens={itens}
        carregando={carregando}
        podeCancelar={podeAtender}
        aoCancelar={() => setRecarregar((n) => n + 1)}
      />

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
