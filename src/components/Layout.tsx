import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Ticket,
  PlusCircle,
  Users,
  LogOut,
  ShieldCheck,
  History,
  Tags,
  Timer,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const itens = [
  { to: '/', label: 'Painel', icone: LayoutDashboard, soAdmin: false },
  { to: '/chamados', label: 'Chamados', icone: Ticket, soAdmin: false },
  { to: '/historico', label: 'Histórico', icone: History, soAdmin: false },
  { to: '/novo', label: 'Abrir chamado', icone: PlusCircle, soAdmin: false },
  { to: '/cadastro', label: 'Servidores', icone: Users, soAdmin: false },
  { to: '/contas', label: 'Contas e perfis', icone: ShieldCheck, soAdmin: true },
  { to: '/categorias', label: 'Categorias', icone: Tags, soAdmin: true },
  { to: '/sla', label: 'SLA', icone: Timer, soAdmin: true },
]

export default function Layout({ children }: { children?: React.ReactNode }) {
  const { usuario, sair, ehAdmin } = useAuth()
  const local = useLocation()
  const navegar = useNavigate()

  if (!usuario) return <>{children}</>

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-sm font-bold text-white">
              SH
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">SysHelp</div>
              <div className="text-[11px] text-slate-500">Central de Incidentes</div>
            </div>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {itens
              .filter((i) => !i.soAdmin || ehAdmin)
              .map((i) => {
                const Icone = i.icone
                const ativo = local.pathname === i.to
                return (
                  <Link
                    key={i.to}
                    to={i.to}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100',
                      ativo && 'bg-blue-50 font-medium text-blue-700',
                    )}
                  >
                    <Icone className="h-4 w-4" />
                    {i.label}
                  </Link>
                )
              })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="text-right leading-tight">
              <div className="text-xs font-medium">{usuario.name || usuario.email}</div>
              <div className="text-[11px] capitalize text-slate-500">
                {usuario.perfil || 'usuario'}
                {usuario.matricula ? ` · ${usuario.matricula}` : ''}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                sair()
                navegar('/login')
              }}
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              Sair
            </Button>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto border-t px-2 py-1.5 md:hidden">
          {itens
            .filter((i) => !i.soAdmin || ehAdmin)
            .map((i) => (
              <Link
                key={i.to}
                to={i.to}
                className={cn(
                  'whitespace-nowrap rounded px-2.5 py-1 text-xs text-slate-600',
                  local.pathname === i.to && 'bg-blue-50 font-medium text-blue-700',
                )}
              >
                {i.label}
              </Link>
            ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  )
}
