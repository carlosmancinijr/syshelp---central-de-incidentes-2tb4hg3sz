import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { corPrioridade } from '@/lib/status'
import { getErrorMessage } from '@/lib/pocketbase/errors'

// Classificação do chamado por admin/técnico: define a categoria e, com ela,
// a criticidade (sempre a criticidade_padrao da categoria, como o hook de criação).
export default function ClassificarChamado({
  chamado,
  aoClassificar,
}: {
  chamado: any
  aoClassificar: (atualizado: any) => void
}) {
  const [categorias, setCategorias] = useState<any[]>([])
  const [categoriaId, setCategoriaId] = useState<string>(chamado.categoria_id || '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    pb.collection('categorias')
      .getFullList({ sort: 'nome' })
      .then(setCategorias)
      .catch(() => {})
  }, [])

  const categoriaSelecionada = categorias.find((c) => c.id === categoriaId)
  const criticidade = categoriaSelecionada?.criticidade_padrao || 'P3'
  const alterado = categoriaId !== (chamado.categoria_id || '')

  async function salvar() {
    if (!categoriaId) return
    setSalvando(true)
    setErro('')
    try {
      await pb.collection('chamados').update(chamado.id, {
        categoria_id: categoriaId,
        prioridade: criticidade,
      })
      const atualizado = await pb
        .collection('chamados')
        .getOne(chamado.id, { expand: 'solicitante_id,categoria_id,cancelado_por' })
      aoClassificar(atualizado)
    } catch (x) {
      setErro(getErrorMessage(x))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 p-3">
        <span className="text-xs font-medium text-slate-600">Classificar:</span>
        <Select value={categoriaId} onValueChange={setCategoriaId} disabled={salvando}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Selecione a categoria" />
          </SelectTrigger>
          <SelectContent>
            {categorias.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {categoriaId && (
          <Badge variant="secondary" className={corPrioridade(criticidade)}>
            {criticidade}
          </Badge>
        )}
        <Button size="sm" onClick={salvar} disabled={!categoriaId || !alterado || salvando}>
          {salvando ? 'Salvando...' : 'Salvar classificação'}
        </Button>
        {erro && <span className="text-xs text-red-600">{erro}</span>}
      </CardContent>
    </Card>
  )
}
