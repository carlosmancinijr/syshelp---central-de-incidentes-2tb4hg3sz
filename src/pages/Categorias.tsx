import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { corPrioridade } from '@/lib/status'
import { getErrorMessage } from '@/lib/pocketbase/errors'

const CRITICIDADES = ['P1', 'P2', 'P3', 'P4', 'P5']

export default function Categorias() {
  const { usuario } = useAuth()
  const [itens, setItens] = useState<any[]>([])
  const [aviso, setAviso] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvandoId, setSalvandoId] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    pb.collection('categorias')
      .getFullList({ sort: 'nome' })
      .then((r) => {
        if (vivo) setItens(r)
      })
      .catch(() => {
        if (vivo) setErro('Não foi possível carregar as categorias.')
      })
      .finally(() => {
        if (vivo) setCarregando(false)
      })
    return () => {
      vivo = false
    }
  }, [])

  async function mudarCriticidade(id: string, valor: string) {
    setAviso('')
    setErro('')
    setSalvandoId(id)
    try {
      await pb.collection('categorias').update(id, { criticidade_padrao: valor })
      setItens((prev) => prev.map((c) => (c.id === id ? { ...c, criticidade_padrao: valor } : c)))
      setAviso('Criticidade padrão da categoria atualizada. Vale para os próximos chamados.')
    } catch (e) {
      setErro(`Não foi possível salvar: ${getErrorMessage(e)}`)
    } finally {
      setSalvandoId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Categorias e criticidade</h1>
        <p className="text-sm text-slate-500">
          {itens.length.toLocaleString('pt-BR')} categoria(s) · a criticidade definida aqui é
          aplicada automaticamente a cada novo chamado desta categoria.
        </p>
      </div>

      {aviso && (
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription>{aviso}</AlertDescription>
        </Alert>
      )}
      {erro && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            <div className="hidden gap-3 bg-slate-50 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-500 sm:flex">
              <span className="flex-1">Categoria</span>
              <span className="w-24 text-right">SLA (h)</span>
              <span className="w-56">Criticidade padrão</span>
            </div>

            {carregando && <div className="p-6 text-sm text-slate-500">Carregando...</div>}
            {!carregando && itens.length === 0 && (
              <div className="p-6 text-sm text-slate-500">Nenhuma categoria encontrada.</div>
            )}

            {itens.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.nome}</span>
                <span className="w-24 shrink-0 text-right text-xs text-slate-500">
                  {c.sla_horas || '—'}
                </span>
                <span className="w-56 shrink-0">
                  <Select
                    value={c.criticidade_padrao || 'P3'}
                    onValueChange={(v) => mudarCriticidade(c.id, v)}
                    disabled={salvandoId !== null}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CRITICIDADES.map((p) => (
                        <SelectItem key={p} value={p}>
                          <Badge variant="secondary" className={corPrioridade(p)}>
                            {p}
                          </Badge>
                          <span className="ml-2">
                            {p === 'P1'
                              ? 'Alta'
                              : p === 'P2'
                                ? 'Média-alta'
                                : p === 'P3'
                                  ? 'Média'
                                  : 'Baixa'}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-4 text-sm">
          <p className="font-medium">Como funciona</p>
          <div className="grid gap-1 text-xs text-slate-600">
            <span>
              A criticidade de um chamado <b>não</b> é escolhida pelo usuário: ao abrir o chamado,
              ela é definida automaticamente pela categoria selecionada.
            </span>
            <span>
              <b>P1 — Alta</b> · serviços essenciais e indisponibilidade total (rede, e-mail,
              servidor, sistemas centrais).
            </span>
            <span>
              <b>P2 — Média-alta</b> · sistemas administrativos e acesso (SEI, SGZ, certificado,
              VPN).
            </span>
            <span>
              <b>P3 — Média</b> · equipamentos e rotinas do dia a dia (impressora, monitor,
              aplicações).
            </span>
            <span>
              <b>P4/P5 — Baixa</b> · solicitações, dúvidas e periféricos (teclado, mouse,
              orientação).
            </span>
            <span>
              A alteração vale para os <b>próximos</b> chamados — chamados já abertos não são
              reclassificados.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
