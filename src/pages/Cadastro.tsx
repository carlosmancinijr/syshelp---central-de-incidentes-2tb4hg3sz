import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'

const POR_PAGINA = 25

export default function Cadastro() {
  const [itens, setItens] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let vivo = true
    const t = setTimeout(async () => {
      setCarregando(true)
      try {
        const b = busca.trim().replace(/'/g, "\\'")
        const filtro = b ? `matricula~'${b}' || nome~'${b}' || login_rede~'${b}'` : undefined
        const r = await pb.collection('servidores').getList(pagina, POR_PAGINA, {
          filter: filtro,
          sort: 'nome',
          expand: 'setor_id',
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
  }, [busca, pagina])

  useEffect(() => setPagina(1), [busca])

  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Servidores</h1>
        <p className="text-sm text-slate-500">{total.toLocaleString('pt-BR')} registro(s)</p>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Matrícula, login ou nome"
          className="pl-8"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {carregando && <div className="p-6 text-sm text-slate-500">Carregando...</div>}
            {!carregando && itens.length === 0 && (
              <div className="p-6 text-sm text-slate-500">Nenhum servidor encontrado.</div>
            )}
            {itens.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <span className="w-24 shrink-0 font-mono text-[11px] text-slate-500">
                  {s.matricula}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{s.nome}</span>
                  <span className="block truncate text-[11px] text-slate-500">
                    {s.expand?.setor_id?.nome || 'sem setor'} · {s.cargo || '—'}
                  </span>
                </span>
                <span className="w-32 shrink-0 text-[11px] text-slate-500">
                  {s.login_rede || '—'}
                </span>
                <span className="w-20 shrink-0 text-[11px] text-slate-500">
                  ramal {s.ramal || '—'}
                </span>
                <Badge
                  variant="secondary"
                  className={
                    s.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }
                >
                  {s.ativo ? 'ativo' : 'inativo'}
                </Badge>
              </div>
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
