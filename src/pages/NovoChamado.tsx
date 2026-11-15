import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { corPrioridade } from '@/lib/status'
import { Search, Check, AlertCircle } from 'lucide-react'

export default function NovoChamado() {
  const navegar = useNavigate()
  const { usuario, podeAtender } = useAuth()

  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<any[]>([])
  const [servidor, setServidor] = useState<any>(null)
  const [categorias, setCategorias] = useState<any[]>([])
  const [ultimaEstacao, setUltimaEstacao] = useState<{ estacao: string; ip: string } | null>(null)

  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    categoria_id: '',
    canal: 'portal',
    estacao: '',
    ip: '',
  })
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  // criticidade calculada a partir da categoria escolhida (o usuário não edita)
  const criticidadeCalculada =
    categorias.find((c) => c.id === form.categoria_id)?.criticidade_padrao || 'P3'

  useEffect(() => {
    pb.collection('categorias')
      .getFullList({ sort: 'nome' })
      .then(setCategorias)
      .catch(() => {})
  }, [])

  // IP do acesso atual: consultado a cada entrada na tela (logo após o login
  // na prática) no endpoint do backend, que lê o IP real da requisição.
  // Não é detectável sem Active Directory — aqui é só o IP de rede.
  useEffect(() => {
    let vivo = true
    pb.send('/backend/v1/meu-ip', {})
      .then((r: any) => {
        if (vivo && r?.ip) setForm((f) => ({ ...f, ip: r.ip }))
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [])

  // ID da estação: preenchimento MANUAL. Pré-carrega o último valor salvo
  // pelo próprio usuário (coleção ambientes_usuario), se houver.
  useEffect(() => {
    if (!usuario?.id) return
    pb.collection('ambientes_usuario')
      .getFirstListItem(`usuario_id='${usuario.id}'`)
      .then((a) => {
        if (a?.estacao) setForm((f) => ({ ...f, estacao: f.estacao || a.estacao }))
      })
      .catch(() => {})
  }, [usuario?.id])

  // usuário comum: carrega o próprio cadastro automaticamente
  useEffect(() => {
    if (podeAtender || !usuario?.matricula) return
    pb.collection('servidores')
      .getFirstListItem(`matricula='${usuario.matricula}'`)
      .then((s) => {
        setServidor(s)
        carregarContexto(s)
      })
      .catch(() => {})
  }, [podeAtender, usuario?.matricula])

  useEffect(() => {
    const t = setTimeout(async () => {
      const b = busca.trim().replace(/'/g, "\\'")
      if (b.length < 2) {
        setResultados([])
        return
      }
      try {
        const r = await pb.collection('servidores').getList(1, 8, {
          filter: `matricula~'${b}' || nome~'${b}' || login_rede~'${b}'`,
          sort: 'nome',
        })
        setResultados(r.items)
      } catch {
        setResultados([])
      }
    }, 250)
    return () => clearTimeout(t)
  }, [busca])

  async function carregarContexto(s: any) {
    try {
      // último chamado do solicitante: sugere estação e IP
      const r = await pb.collection('chamados').getList(1, 1, {
        filter: `solicitante_id='${s.id}' && estacao!=''`,
        sort: '-abertura',
      })
      const ultimo = r.items[0]
      if (ultimo) {
        setUltimaEstacao({ estacao: ultimo.estacao, ip: ultimo.ip || '' })
        setForm((f) => ({
          ...f,
          estacao: f.estacao || ultimo.estacao || '',
          ip: f.ip || ultimo.ip || '',
        }))
      }
    } catch {
      /* sem histórico */
    }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!servidor) return setErro('Selecione o solicitante.')
    if (!form.titulo.trim()) return setErro('Informe o título.')
    if (!form.categoria_id) return setErro('Selecione a categoria.')

    setEnviando(true)
    try {
      // guarda o último ID de estação informado, para pré-preencher no próximo login
      if (usuario?.id && form.estacao.trim()) {
        pb.collection('ambientes_usuario')
          .getFirstListItem(`usuario_id='${usuario.id}'`)
          .then((a) => {
            if (a.estacao !== form.estacao.trim().toUpperCase()) {
              pb.collection('ambientes_usuario').update(a.id, {
                estacao: form.estacao.trim().toUpperCase(),
              })
            }
          })
          .catch(() => {
            pb.collection('ambientes_usuario').create({
              usuario_id: usuario.id,
              estacao: form.estacao.trim().toUpperCase(),
            })
          })
      }

      const ano = new Date().getFullYear()
      const total = await pb.collection('chamados').getList(1, 1)
      const seq = String(total.totalItems + 1).padStart(5, '0')

      await pb.collection('chamados').create({
        protocolo: `INC-${ano}-${seq}`,
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim(),
        solicitante_id: servidor.id,
        solicitante_nome: servidor.nome,
        setor: servidor.expand?.setor_id?.nome || '',
        cargo: servidor.cargo || '',
        ramal: servidor.ramal || '',
        categoria_id: form.categoria_id,
        // criticidade vem da categoria (o hook do backend confirma do lado do servidor)
        prioridade: criticidadeCalculada,
        status: 'aberto',
        canal: form.canal,
        estacao: form.estacao.trim().toUpperCase(),
        ip: form.ip.trim(),
        abertura: new Date().toISOString().replace('T', ' '),
      })
      navegar('/chamados')
    } catch (x: any) {
      setErro(x?.message || 'Não foi possível abrir o chamado.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Abrir chamado</h1>
        <p className="text-sm text-slate-500">
          Os dados do solicitante vêm do cadastro de servidores.
        </p>
      </div>

      {erro && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Solicitante</CardTitle>
        </CardHeader>
        <CardContent>
          {servidor ? (
            <div className="flex items-start justify-between gap-3 rounded-lg border bg-slate-50 p-3">
              <div className="text-sm">
                <div className="font-medium">{servidor.nome}</div>
                <div className="text-xs text-slate-500">
                  {servidor.matricula} · {servidor.cargo || '—'} · ramal {servidor.ramal || '—'}
                </div>
              </div>
              {podeAtender && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setServidor(null)
                    setUltimaEstacao(null)
                  }}
                >
                  Trocar
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="RF, login de rede ou nome"
                  className="pl-8"
                  autoFocus
                />
              </div>
              {resultados.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setServidor(s)
                    setResultados([])
                    setBusca('')
                    carregarContexto(s)
                  }}
                  className="flex w-full items-start gap-2 rounded-md border p-2 text-left text-sm hover:bg-slate-50"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <span>
                    <span className="font-medium">{s.nome}</span>
                    <span className="block text-xs text-slate-500">
                      {s.matricula} · {s.login_rede || 'sem login'} · {s.ramal || 'sem ramal'}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <form onSubmit={enviar} className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">O chamado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder="Resuma o problema em uma linha"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                rows={5}
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Descreva o problema, desde quando ocorre, mensagens de erro e o que já tentou."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select
                  value={form.categoria_id}
                  onValueChange={(v) => setForm({ ...form, categoria_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Criticidade</Label>
                <div className="flex h-9 items-center gap-2 rounded-md border bg-slate-50 px-3 text-sm">
                  {form.categoria_id ? (
                    <>
                      <Badge variant="secondary" className={corPrioridade(criticidadeCalculada)}>
                        {criticidadeCalculada}
                      </Badge>
                      <span className="truncate text-xs text-slate-500">
                        {categorias.find((c) => c.id === form.categoria_id)?.nome || ''}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400">escolha uma categoria</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Definida automaticamente pela categoria escolhida.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Canal</Label>
                <Select value={form.canal} onValueChange={(v) => setForm({ ...form, canal: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portal">Portal</SelectItem>
                    <SelectItem value="telefone">Telefone</SelectItem>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="estacao">ID da estação</Label>
                <Input
                  id="estacao"
                  value={form.estacao}
                  onChange={(e) => setForm({ ...form, estacao: e.target.value.toUpperCase() })}
                  placeholder="SMSPSEC405"
                />
                <p className="text-[11px] text-slate-500">
                  Preenchimento manual — informe o nome da máquina na rede.
                  {ultimaEstacao ? ` Último usado: ${ultimaEstacao.estacao}.` : ''}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ip">IP da estação</Label>
                <Input
                  id="ip"
                  value={form.ip}
                  onChange={(e) => setForm({ ...form, ip: e.target.value })}
                  placeholder="10.21.64.168"
                  inputMode="numeric"
                />
                <p className="text-[11px] text-slate-500">
                  Detectado automaticamente do seu acesso — ajuste se necessário.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navegar('/chamados')}>
            Cancelar
          </Button>
          <Button type="submit" disabled={enviando}>
            {enviando ? 'Abrindo...' : 'Abrir chamado'}
          </Button>
        </div>
      </form>
    </div>
  )
}
