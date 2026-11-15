import { useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Ban } from 'lucide-react'
import { getErrorMessage } from '@/lib/pocketbase/errors'

/**
 * Botão de cancelamento de chamado — visível para admin e técnico.
 *
 * Cancela só com motivo registrado (mínimo 10 caracteres): quem cancelou,
 * quando e por quê ficam gravados no próprio chamado. O cancelamento não
 * apaga nada, então o histórico continua auditável.
 */
export default function BotaoCancelar({
  chamado,
  aoCancelar,
  tamanho = 'sm',
  variante = 'outline',
}: {
  chamado: any
  aoCancelar?: (atualizado: any) => void
  tamanho?: 'sm' | 'default'
  variante?: 'outline' | 'destructive' | 'ghost'
}) {
  const [aberto, setAberto] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const jaCancelado = chamado?.status === 'cancelado'

  async function confirmar() {
    setErro('')
    const texto = motivo.trim()
    if (texto.length < 10) {
      setErro('Descreva o motivo com pelo menos 10 caracteres.')
      return
    }

    setSalvando(true)
    try {
      const atualizado = await pb.collection('chamados').update(chamado.id, {
        status: 'cancelado',
        motivo_cancelamento: texto,
        cancelado_em: new Date().toISOString().replace('T', ' '),
        cancelado_por: pb.authStore.record?.id || '',
      })
      setAberto(false)
      setMotivo('')
      aoCancelar?.(atualizado)
    } catch (e) {
      setErro(`Não foi possível cancelar: ${getErrorMessage(e)}`)
    } finally {
      setSalvando(false)
    }
  }

  if (jaCancelado) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
        <Ban className="h-3 w-3" />
        cancelado
      </span>
    )
  }

  return (
    <>
      <Button
        type="button"
        size={tamanho}
        variant={variante}
        onClick={(ev) => {
          ev.preventDefault()
          ev.stopPropagation()
          setErro('')
          setAberto(true)
        }}
      >
        <Ban className="mr-1.5 h-3.5 w-3.5" />
        Cancelar
      </Button>

      <AlertDialog open={aberto} onOpenChange={setAberto}>
        <AlertDialogContent onClick={(ev) => ev.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar o chamado {chamado?.protocolo}?</AlertDialogTitle>
            <AlertDialogDescription>
              O chamado sai da fila de atendimento e não conta mais no SLA. Ele continua no
              histórico com o motivo registrado — dá para reabrir depois, se precisar.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-1.5 text-left">
            <Label htmlFor="motivo-cancelamento">Motivo do cancelamento</Label>
            <Textarea
              id="motivo-cancelamento"
              rows={3}
              value={motivo}
              onChange={(ev) => setMotivo(ev.target.value)}
              placeholder="Ex.: solicitante resolveu sozinho, chamado aberto em duplicidade, equipamento não pertence ao setor."
            />
            {erro && <p className="text-xs text-red-600">{erro}</p>}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={salvando}>Voltar</AlertDialogCancel>
            <Button type="button" variant="destructive" disabled={salvando} onClick={confirmar}>
              {salvando ? 'Cancelando...' : 'Confirmar cancelamento'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
