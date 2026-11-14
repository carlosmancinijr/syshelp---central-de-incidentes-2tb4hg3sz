import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/lib/auth'
import { Input } from '@/components/ui/input'
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
import { Search, AlertCircle, CheckCircle2, KeyRound, Copy } from 'lucide-react'
import { formatarData } from '@/lib/formato'
import { gerarSenhaProvisoria } from '@/lib/senha'

const PERFIS = [
  { valor: 'admin', rotulo: 'Administrador' },
  { valor: 'tecnico', rotulo: 'Técnico' },
  { valor: 'usuario', rotulo: 'Usuário' },
]

export default function Contas() {
  const { usuario } = useAuth()
  const [itens, setItens] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [busca, setBusca] = useState('')
  const [aviso, setAviso] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [senhaNova, setSenhaNova] = useState<{ nome: string; senha: string } | null>(null)
  const [copiada, setCopiada] = useState(false)

  async function carregar() {
    setCarregando(true)
    try {
      const b = busca.trim().replace(/'/g, "\\'")
      const filtro = b ? `email~'${b}' || name~'${b}' || matricula~'${b}'` : undefined
      const r = await pb.collection('users').getList(1, 100, { filter: filtro, sort: 'name' })
      setItens(r.items)
      setTotal(r.totalItems)
    } catch {
      setErro('Não foi possível carregar as contas.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(carregar, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca])

  async function mudarPerfil(id: string, perfil: string) {
    setAviso('')
    setErro('')
    if (id === usuario?.id) {
      setErro('Você não pode mudar o próprio perfil.')
      return
    }
    try {
      await pb.collection('users').update(id, { perfil })
      setAviso('Perfil alterado. A mudança vale no próximo acesso da pessoa.')
      carregar()
    } catch {
      setErro('Não foi possível alterar o perfil.')
    }
  }

  async function gerarSenha(c: any) {
    setAviso('')
    setErro('')
    setCopiada(false)
    if (c.id === usuario?.id) {
      setErro('Não é possível gerar senha provisória para a sua própria conta.')
      return
    }
    const senha = gerarSenhaProvisoria()
    // O login por matrícula procura "<matrícula>@smsub.local": alinha o e-mail da conta a esse
    // padrão, senão a senha gerada nunca seria usada com a matrícula.
    const corpo: Record<string, string> = { password: senha, passwordConfirm: senha }
    if (c.matricula) corpo.email = `${String(c.matricula).trim().toLowerCase()}@smsub.local`
    try {
      await pb.collection('users').update(c.id, corpo)
      setSenhaNova({ nome: c.name || 'conta', senha })
    } catch {
      setErro('Não foi possível gerar a senha provisória.')
    }
  }

  async function copiarSenha() {
    if (!senhaNova) return
    try {
      await navigator.clipboard.writeText(senhaNova.senha)
      setCopiada(true)
    } catch {
      setErro('Não foi possível copiar. Selecione e copie a senha manualmente.')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Contas e perfis</h1>
        <p className="text-sm text-slate-500">{total.toLocaleString('pt-BR')} conta(s)</p>
      </div>

      {senhaNova && (
        <Card>
          <CardContent className="space-y-2 p-4 text-sm">
            <p className="font-medium">Senha provisória de {senhaNova.nome}</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded bg-slate-100 px-2 py-1 font-mono text-base">
                {senhaNova.senha}
              </code>
              <Button size="sm" variant="outline" onClick={copiarSenha}>
                <Copy className="mr-1 h-4 w-4" />
                {copiada ? 'Copiada' : 'Copiar'}
              </Button>
            </div>
            <p className="text-[11px] text-slate-500">
              Esta senha aparece uma única vez. Repasse-a à pessoa, que deve trocá-la no próximo
              acesso.
            </p>
          </CardContent>
        </Card>
      )}

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

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="E-mail, nome ou matrícula"
          className="pl-8"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            <div className="hidden gap-3 bg-slate-50 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-500 sm:flex">
              <span className="flex-1">Pessoa</span>
              <span className="w-24">Matrícula</span>
              <span className="w-40">Perfil</span>
              <span className="w-36">Criada em</span>
              <span className="w-32" />
            </div>

            {carregando && <div className="p-6 text-sm text-slate-500">Carregando...</div>}
            {!carregando && itens.length === 0 && (
              <div className="p-6 text-sm text-slate-500">Nenhuma conta encontrada.</div>
            )}

            {itens.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {c.name || '(sem nome)'}
                  </span>
                  <span className="block truncate text-[11px] text-slate-500">{c.email}</span>
                </span>
                <span className="w-24 shrink-0 font-mono text-[11px] text-slate-500">
                  {c.matricula || '—'}
                </span>
                <span className="w-40 shrink-0">
                  <Select
                    value={c.perfil || 'usuario'}
                    onValueChange={(v) => mudarPerfil(c.id, v)}
                    disabled={c.id === usuario?.id}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERFIS.map((p) => (
                        <SelectItem key={p.valor} value={p.valor}>
                          {p.rotulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </span>
                <span className="w-36 shrink-0 text-[11px] text-slate-500">
                  {formatarData(c.created)}
                </span>
                <span className="w-32 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-full"
                    disabled={c.id === usuario?.id}
                    onClick={() => gerarSenha(c)}
                  >
                    <KeyRound className="mr-1 h-3.5 w-3.5" />
                    Gerar senha
                  </Button>
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-4 text-sm">
          <p className="font-medium">O que cada perfil pode fazer</p>
          <div className="grid gap-1 text-xs text-slate-600">
            <span>
              <b>Administrador</b> — vê todos os chamados, altera status, gerencia servidores e
              contas.
            </span>
            <span>
              <b>Técnico</b> — vê todos os chamados e altera status.
            </span>
            <span>
              <b>Usuário</b> — abre chamado no próprio nome e vê apenas os seus.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
