/* Rotas do SysHelp. Páginas públicas: /login. O resto exige sessão. */
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/lib/auth'
import Layout from '@/components/Layout'
import Protegida, { SomenteAdmin } from '@/components/Protegida'
import Login from '@/pages/Login'
import Painel from '@/pages/Painel'
import Chamados from '@/pages/Chamados'
import Historico from '@/pages/Historico'
import Backlog from '@/pages/Backlog'
import ChamadoDetalhe from '@/pages/ChamadoDetalhe'
import NovoChamado from '@/pages/NovoChamado'
import Cadastro from '@/pages/Cadastro'
import Contas from '@/pages/Contas'
import Categorias from '@/pages/Categorias'
import Sla from '@/pages/Sla'
import NotFound from '@/pages/NotFound'

function ComLayout() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            element={
              <Protegida>
                <ComLayout />
              </Protegida>
            }
          >
            <Route path="/" element={<Painel />} />
            <Route path="/chamados" element={<Chamados />} />
            <Route path="/historico" element={<Historico />} />
            <Route path="/backlog" element={<Backlog />} />
            <Route path="/chamados/:id" element={<ChamadoDetalhe />} />
            <Route path="/novo" element={<NovoChamado />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route
              path="/contas"
              element={
                <SomenteAdmin>
                  <Contas />
                </SomenteAdmin>
              }
            />
            <Route
              path="/categorias"
              element={
                <SomenteAdmin>
                  <Categorias />
                </SomenteAdmin>
              }
            />
            <Route
              path="/sla"
              element={
                <SomenteAdmin>
                  <Sla />
                </SomenteAdmin>
              }
            />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  </AuthProvider>
)

export default App
