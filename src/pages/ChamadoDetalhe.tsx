import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'
import { formatarData } from '@/lib/formato'
import { rotuloStatus, corStatus, corPrioridade, STATUS_ORDEM } from '@/lib/status'
import { corSla, restanteEmTexto, percentualConsumido, minutosEmTexto } from '@/lib/sla'
import BotaoCancelar from '@/components/BotaoCancelar'
import ClassificarChamado from '@/components/ClassificarChamado'

function Linha({ rotulo, valor }: { rotulo: string; valor?: string | null }) {
  return (
    <div className="flex gap-2 py-1 text-sm">
      <span className="w-40 shrink-0 text-slate-500">{rotulo}</span>
      <span className="min-w-0 flex-1 break-words">{valor || '—'}</span>
    </div>
  )
}

export default function ChamadoDetalhe() {
  const { id } = useParams()
  const navegar = useNavigate()
  const { podeAtender } = useAuth()
  const [c, setC] = useState<any>(null)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let vivo = true
    async function carregar() {
      try {
        const r = await pb
          .collection('chamados')
          .getOne(String(id), { expand: 'solicitante_id,categoria_id,cancelado_por' })
        if (vivo) setC(r)
      } catch {
        if (vivo) setErro('Chamado não encontrado ou você não tem acesso a ele.')
      }
    }
    carregar()
    return () => {
      vivo = false
    }
  }, [id])

  async function mudarStatus(novo: string) {
    setSalvando(true)
    try {
      // encerrar grava o fechamento (é ele que fecha a conta do SLA);
      // reabrir limpa a data para o chamado voltar a contar.
      const encerra = novo === 'resolvido' || novo === 'fechado'
      const dados: Record<string, any> = { status: novo }
      if (encerra && !c.fechamento) {
        dados.fechamento = new Date().toISOString().replace('T', ' ')
      }
      if (!encerra && c.fechamento) dados.fechamento = ''

      const atualizado = await pb.collection('chamados').update(String(id), dados)
      setC(atualizado)
    } catch {
      setErro('Não foi possível alterar o status.')
    } finally {
      setSalvando(false)
    }
  }

  if (erro) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => navegar('/chamados')}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Voltar
        </Button>
        <Card>
          <CardContent className="p-6 text-sm text-slate-600">{erro}</CardContent>
        </Card>
      </div>
    )
  }

  if (!c) {
    return <div className="p-6 text-sm text-slate-500">Carregando...</div>
  }

  const cumprimentoSla =
    c.sla_situacao === 'violado'
      ? 'estourado'
      : c.sla_situacao === 'em_risco'
        ? 'em risco'
        : c.sla_situacao === 'cumprido'
          ? 'cumprido'
          : c.sla_situacao === 'pausado'
            ? 'pausado'
            : 'no prazo'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link to="/chamados">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <div>
            <div className="font-mono text-[11px] text-slate-500">{c.protocolo}</div>
            <h1 className="max-w-2xl text-lg font-semibold leading-tight">{c.titulo}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={corPrioridade(c.prioridade)}>
            {c.prioridade || '—'}
          </Badge>
          <Badge variant="secondary" className={corStatus(c.status)}>
            {rotuloStatus(c.status)}
          </Badge>
          {c.sla_situacao && (
            <Badge variant="secondary" className={corSla(c.sla_situacao)}>
              SLA: {cumprimentoSla}
            </Badge>
          )}
        </div>
      </div>

      {c.prazo_resolucao && (
        <Card>
          <CardContent className="space-y-1 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-medium text-slate-700">
                1ª resposta até {formatarData(c.prazo_resposta)}
                <span className="mx-2 text-slate-300">|</span>
                Resolução até {formatarData(c.prazo_resolucao)}
              </span>
              <span className="text-slate-500">
                {c.minutos_uteis_gastos
                  ? `${minutosEmTexto(c.minutos_uteis_gastos)} úteis até a conclusão`
                  : restanteEmTexto(c.prazo_resolucao)}
              </span>
            </div>
            {!['cumprido', 'violado'].includes(c.sla_situacao) && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={
                    (percentualConsumido(c.abertura, c.prazo_resolucao) || 0) >= 100
                      ? 'h-full bg-red-500'
                      : (percentualConsumido(c.abertura, c.prazo_resolucao) || 0) >= 80
                        ? 'h-full bg-amber-500'
                        : 'h-full bg-emerald-500'
                  }
                  style={{
                    width: `${Math.min(100, percentualConsumido(c.abertura, c.prazo_resolucao) || 0)}%`,
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {podeAtender && !c.categoria_id && (
        <ClassificarChamado
          chamado={c}
          aoClassificar={(atualizado) => setC({ ...c, ...atualizado })}
        />
      )}

      {podeAtender && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 p-3">
            <span className="text-xs font-medium text-slate-600">Alterar status:</span>
            <Select value={c.status} onValueChange={mudarStatus} disabled={salvando}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {/* cancelamento fica de fora daqui: ele exige motivo e tem
                    botão próprio, para não sair sem justificativa */}
                {STATUS_ORDEM.filter((s) => s !== 'cancelado').map((s) => (
                  <SelectItem key={s} value={s}>
                    {rotuloStatus(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {salvando && <span className="text-xs text-slate-500">salvando...</span>}
            <span className="ml-auto">
              <BotaoCancelar
                chamado={c}
                aoCancelar={(atualizado) => setC({ ...c, ...atualizado })}
              />
            </span>
          </CardContent>
        </Card>
      )}

      {c.status === 'cancelado' && (
        <Card>
          <CardContent className="space-y-1 p-3 text-sm">
            <p className="font-medium text-slate-700">Chamado cancelado</p>
            <p className="text-slate-600">{c.motivo_cancelamento || 'Motivo não registrado.'}</p>
            <p className="text-[11px] text-slate-500">
              {c.cancelado_em ? formatarData(c.cancelado_em) : '—'}
              {c.expand?.cancelado_por?.name ? ` · por ${c.expand.cancelado_por.name}` : ''}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Descrição</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {c.descricao || '—'}
          </CardContent>

          {c.solucao && (
            <>
              <CardHeader className="pb-2 pt-2">
                <CardTitle className="text-sm">Solução aplicada</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {c.solucao}
              </CardContent>
            </>
          )}
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Dados do chamado</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <Linha rotulo="Solicitante" valor={c.solicitante_nome} />
            <Linha rotulo="Setor" valor={c.setor} />
            <Linha rotulo="Cargo" valor={c.cargo} />
            <Linha rotulo="Ramal" valor={c.ramal} />
            <Linha rotulo="Categoria" valor={c.expand?.categoria_id?.nome} />
            <Linha rotulo="Subcategoria" valor={c.subcategoria} />
            <Linha rotulo="Estação" valor={c.estacao} />
            <Linha rotulo="IP" valor={c.ip} />
            <Linha rotulo="Canal" valor={c.canal} />
            <Linha rotulo="SLA da categoria" valor={c.sla_horas ? `${c.sla_horas} h` : null} />
            <Linha
              rotulo="1ª resposta até"
              valor={c.prazo_resposta ? formatarData(c.prazo_resposta) : null}
            />
            <Linha
              rotulo="Resolução até"
              valor={c.prazo_resolucao ? formatarData(c.prazo_resolucao) : null}
            />
            <Linha
              rotulo="1ª resposta em"
              valor={c.primeira_resposta_em ? formatarData(c.primeira_resposta_em) : null}
            />
            <Linha
              rotulo="Tempo útil gasto"
              valor={c.minutos_uteis_gastos ? minutosEmTexto(c.minutos_uteis_gastos) : null}
            />
            <Linha rotulo="Aberto em" valor={formatarData(c.abertura)} />
            <Linha rotulo="Fechado em" valor={formatarData(c.fechamento)} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
