import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Search, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import { filtroNaoEncerrados } from '@/lib/status'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import TabelaChamados from '@/components/TabelaChamados'

const POR_PAGINA = 25

// Status em que o relógio do SLA está congelado (hook sla_andamento): o prazo
// não pode ser cobrado enquanto o chamado espera o solicitante/terceiro.
const EM_PAUSA = ["status!='aguardando_solicitante'", "status!='aguardando_terceiro'"]

/** Fila de backlog: chamados em andamento com o prazo de resolução já vencido. */
export default function Backlog() {
  const { usuario, podeAtender } = useAuth()
  const [itens, setItens] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const filtro = useMemo(() => {
    const agora = new Date().toISOString().replace('T', ' ')
    const partes: string[] = [
      filtroNaoEncerrados(),
      "prazo_resolucao != ''",
      `prazo_resolucao < '${agora}'`,
      ...EM_PAUSA,
    ]
    if (!podeAtender && usuario?.id) {
      partes.push(`solicitante_id.usuario_id='${usuario.id}'`)
    }
    const b = busca.trim().replace(/'/g, "\\'")
    if (b) {
      partes.push(
        `(protocolo~'${b}' || titulo~'${b}' || solicitante_nome~'${b}' || estacao~'${b}')`,
      )
    }
    return partes.join(' && ')
  }, [busca, podeAtender, usuario?.id])

  useEffect(() => {
    let vivo = true
    const t = setTimeout(async () => {
      setCarregando(true)
      setErro('')
      try {
        // Prazo mais antigo primeiro = o que está estourado há mais tempo.
        const r = await pb.collection('chamados').getList(pagina, POR_PAGINA, {
          filter: filtro,
          sort: 'prazo_resolucao',
        })
        if (!vivo) return
        setItens(r.items)
        setTotal(r.totalItems)
      } catch (e) {
        if (vivo) setErro(`Não foi possível carregar o backlog: ${getErrorMessage(e)}`)
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
          <h1 className="text-xl font-semibold tracking-tight">Backlog</h1>
          <p className="text-sm text-slate-500">
            {total.toLocaleString('pt-BR')} chamado(s) em andamento com o prazo de SLA vencido — do
            mais antigo para o mais recente
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/chamados">
            Chamados em andamento
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {erro && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Protocolo, título, solicitante ou estação"
            className="pl-8"
          />
        </div>
      </div>

      <TabelaChamados
        itens={itens}
        carregando={carregando}
        vazio="Nenhum chamado com o prazo estourado — tudo em dia."
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
