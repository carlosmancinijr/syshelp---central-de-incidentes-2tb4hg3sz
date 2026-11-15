import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2, Clock, RotateCcw, AlarmClockOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import { corPrioridade, corStatus, rotuloStatus } from '@/lib/status'
import { corSla, filtroAtivos, minutosEmTexto, restanteEmTexto } from '@/lib/sla'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { formatarData } from '@/lib/formato'

const DIAS = [
  { n: 1, nome: 'Segunda' },
  { n: 2, nome: 'Terça' },
  { n: 3, nome: 'Quarta' },
  { n: 4, nome: 'Quinta' },
  { n: 5, nome: 'Sexta' },
  { n: 6, nome: 'Sábado' },
  { n: 0, nome: 'Domingo' },
]

const CAMPOS: { chave: string; rotulo: string }[] = [
  { chave: 'resposta_min', rotulo: '1ª resposta (min)' },
  { chave: 'atualizacao_min', rotulo: 'Atualização (min)' },
  { chave: 'resolucao_min', rotulo: 'Resolução (min)' },
  { chave: 'meta_percentual', rotulo: 'Meta (%)' },
]

export default function Sla() {
  const [regras, setRegras] = useState<any[]>([])
  const [calendario, setCalendario] = useState<any>(null)
  const [emRisco, setEmRisco] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    let vivo = true
    async function carregar() {
      setCarregando(true)
      try {
        const [rs, cals, ativos] = await Promise.all([
          pb.collection('sla_regras').getFullList({ sort: 'prioridade' }),
          pb.collection('sla_calendario').getFullList({ sort: '-created' }),
          pb.collection('chamados').getFullList({
            filter: `${filtroAtivos()} && (sla_situacao='em_risco' || sla_situacao='violado')`,
            sort: 'prazo_resolucao',
          }),
        ])
        if (!vivo) return
        setRegras(rs)
        setCalendario(cals[0] || null)
        setEmRisco(ativos)
      } catch (e) {
        if (vivo) setErro(`Não foi possível carregar o SLA: ${getErrorMessage(e)}`)
      } finally {
        if (vivo) setCarregando(false)
      }
    }
    carregar()
    return () => {
      vivo = false
    }
  }, [])

  function alterarRegra(id: string, chave: string, valor: string) {
    setAviso('')
    setErro('')
    const numero = valor === '' ? null : Number(valor.replace(',', '.'))
    setRegras((prev) => prev.map((r) => (r.id === id ? { ...r, [chave]: numero } : r)))
  }

  async function salvarRegra(r: any) {
    setSalvando(true)
    setAviso('')
    setErro('')
    try {
      await pb.collection('sla_regras').update(r.id, {
        resposta_min: r.resposta_min ?? 0,
        atualizacao_min: r.atualizacao_min ?? 0,
        resolucao_min: r.resolucao_min ?? 0,
        meta_percentual: r.meta_percentual ?? 0,
      })
      setAviso(`Regra do ${r.prioridade} salva. Vale para os próximos chamados.`)
    } catch (e) {
      setErro(`Não foi possível salvar ${r.prioridade}: ${getErrorMessage(e)}`)
    } finally {
      setSalvando(false)
    }
  }

  function alterarJanela(dia: number, campo: 'ini' | 'fim', valor: string) {
    setAviso('')
    if (!calendario) return
    const diasAtuais = Array.isArray(calendario.dias) ? [...calendario.dias] : []
    const i = diasAtuais.findIndex((d: any) => Number(d.dia) === dia)
    if (i >= 0) diasAtuais[i] = { ...diasAtuais[i], [campo]: valor }
    else
      diasAtuais.push({
        dia,
        ini: campo === 'ini' ? valor : '08:00',
        fim: campo === 'fim' ? valor : '18:00',
      })
    setCalendario({ ...calendario, dias: diasAtuais })
  }

  function alternarDia(dia: number) {
    setAviso('')
    if (!calendario) return
    const diasAtuais = Array.isArray(calendario.dias) ? [...calendario.dias] : []
    const i = diasAtuais.findIndex((d: any) => Number(d.dia) === dia)
    if (i >= 0) diasAtuais.splice(i, 1)
    else diasAtuais.push({ dia, ini: '08:00', fim: '18:00' })
    setCalendario({ ...calendario, dias: diasAtuais })
  }

  async function salvarCalendario() {
    if (!calendario) return
    setSalvando(true)
    setAviso('')
    setErro('')
    try {
      await pb.collection('sla_calendario').update(calendario.id, {
        dias: calendario.dias || [],
        ativo: calendario.ativo !== false,
      })
      setAviso('Calendário de atendimento salvo. Os próximos chamados já usam a nova janela.')
    } catch (e) {
      setErro(`Não foi possível salvar o calendário: ${getErrorMessage(e)}`)
    } finally {
      setSalvando(false)
    }
  }

  function janelaDe(dia: number) {
    const dias = Array.isArray(calendario?.dias) ? calendario.dias : []
    return dias.find((d: any) => Number(d.dia) === dia) || null
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">SLA e calendário</h1>
        <p className="text-sm text-slate-500">
          O prazo corre em horas úteis, só dentro da janela de atendimento abaixo.
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
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Prazos por prioridade</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            <div className="hidden gap-3 bg-slate-50 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-500 lg:flex">
              <span className="w-16">Prior.</span>
              <span className="flex-1">Descrição</span>
              {CAMPOS.map((c) => (
                <span key={c.chave} className="w-24 text-right">
                  {c.rotulo}
                </span>
              ))}
              <span className="w-20" />
            </div>

            {carregando && <div className="p-6 text-sm text-slate-500">Carregando...</div>}

            {regras.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <span className="w-16 shrink-0">
                  <Badge variant="secondary" className={corPrioridade(r.prioridade)}>
                    {r.prioridade}
                  </Badge>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs text-slate-600">
                    {r.descricao || '—'}
                  </span>
                  <span className="block text-[11px] text-slate-400">
                    {minutosEmTexto(r.resposta_min)} · {minutosEmTexto(r.atualizacao_min)} ·{' '}
                    {minutosEmTexto(r.resolucao_min)}
                  </span>
                </span>
                {CAMPOS.map((c) => (
                  <span key={c.chave} className="w-24 shrink-0">
                    <Input
                      className="h-8 text-right"
                      inputMode="numeric"
                      value={r[c.chave] ?? ''}
                      onChange={(ev) => alterarRegra(r.id, c.chave, ev.target.value)}
                    />
                  </span>
                ))}
                <span className="w-20 shrink-0 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={salvando}
                    onClick={() => salvarRegra(r)}
                  >
                    Salvar
                  </Button>
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Janela de atendimento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!calendario && !carregando && (
            <p className="text-sm text-slate-500">Nenhum calendário cadastrado.</p>
          )}
          {calendario && (
            <>
              <div className="space-y-1.5">
                {DIAS.map((d) => {
                  const janela = janelaDe(d.n)
                  return (
                    <div key={d.n} className="flex items-center gap-2">
                      <span className="w-20 text-xs text-slate-600">{d.nome}</span>
                      <Button
                        size="sm"
                        variant={janela ? 'default' : 'outline'}
                        className="h-7 w-16 text-[11px]"
                        onClick={() => alternarDia(d.n)}
                      >
                        {janela ? 'Aberto' : 'Fechado'}
                      </Button>
                      {janela && (
                        <div className="flex items-center gap-1.5">
                          <Input
                            className="h-8 w-24"
                            value={janela.ini}
                            onChange={(ev) => alterarJanela(d.n, 'ini', ev.target.value)}
                            placeholder="08:00"
                          />
                          <span className="text-xs text-slate-400">às</span>
                          <Input
                            className="h-8 w-24"
                            value={janela.fim}
                            onChange={(ev) => alterarJanela(d.n, 'fim', ev.target.value)}
                            placeholder="18:00"
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" disabled={salvando} onClick={salvarCalendario}>
                  Salvar calendário
                </Button>
                <p className="text-[11px] text-slate-500">
                  Use o formato 24h. Fora dessas janelas o relógio do SLA fica parado.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Escalonamento agora</CardTitle>
          <div className="pt-1">
            <Button asChild size="sm" variant="outline">
              <Link to="/backlog">
                <AlarmClockOff className="mr-1.5 h-3.5 w-3.5" />
                Ver fila de backlog
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {carregando && <div className="p-6 text-sm text-slate-500">Carregando...</div>}
            {!carregando && emRisco.length === 0 && (
              <div className="p-6 text-sm text-slate-500">
                Nenhum chamado em risco ou violado neste momento.
              </div>
            )}
            {emRisco.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <span className="w-32 shrink-0 font-mono text-[11px] text-slate-500">
                  {c.protocolo}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{c.titulo}</span>
                <Badge variant="secondary" className={corPrioridade(c.prioridade)}>
                  {c.prioridade || '—'}
                </Badge>
                <Badge variant="secondary" className={corStatus(c.status)}>
                  {rotuloStatus(c.status)}
                </Badge>
                <Badge variant="secondary" className={corSla(c.sla_situacao)}>
                  {c.sla_situacao === 'violado' ? 'Prazo estourado' : 'Em risco'}
                </Badge>
                <span className="w-40 shrink-0 text-right text-[11px] text-slate-500">
                  <Clock className="mr-1 inline h-3 w-3" />
                  {restanteEmTexto(c.prazo_resolucao)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-4 text-sm">
          <p className="flex items-center gap-1.5 font-medium">
            <RotateCcw className="h-3.5 w-3.5" />
            Como o relógio funciona
          </p>
          <div className="grid gap-1 text-xs text-slate-600">
            <span>
              O prazo é contado a partir da <b>abertura</b> do chamado, somando apenas as horas
              úteis do calendário acima.
            </span>
            <span>
              O relógio <b>congela</b> em "Aguardando solicitante" e "Aguardando terceiro", e volta
              a correr quando o chamado retorna para atendimento.
            </span>
            <span>
              <b>Em risco</b> é o alerta em 80% do prazo, para o responsável; <b>Violado</b> é o
              estouro, que aparece para o gestor.
            </span>
            <span>
              Mudar um prazo aqui vale para os <b>próximos</b> chamados; chamados já abertos mantêm
              o prazo com que nasceram.
            </span>
            {calendario && (
              <span className="text-slate-400">
                Calendário ativo: {calendario.nome} · criado em {formatarData(calendario.created)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
