import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export default function Login() {
  const { entrar, usuario } = useAuth()
  const navegar = useNavigate()
  const [identidade, setIdentidade] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  if (usuario) {
    navegar('/', { replace: true })
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setOcupado(true)
    try {
      await entrar(identidade, senha)
      navegar('/', { replace: true })
    } catch {
      setErro('Usuário ou senha incorretos.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 font-bold text-white shadow">
            SH
          </div>
          <div className="leading-tight">
            <div className="text-base font-semibold">SysHelp</div>
            <div className="text-[11px] text-slate-500">Central de Incidentes</div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold">Entrar</h1>
          <p className="mb-5 mt-0.5 text-xs text-slate-500">Use seu usuário e sua senha.</p>

          {erro && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{erro}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={enviar} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="usuario">Usuário</Label>
              <Input
                id="usuario"
                value={identidade}
                onChange={(e) => setIdentidade(e.target.value)}
                placeholder="d736726"
                autoComplete="username"
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={ocupado}>
              {ocupado ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="mt-5 text-center text-[11px] leading-relaxed text-slate-500">
            Esqueceu a senha? Peça ao administrador para gerar uma nova em
            <b> Contas e perfis</b>.
          </p>
        </div>
      </div>
    </div>
  )
}
