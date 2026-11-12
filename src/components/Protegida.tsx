import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'

export default function Protegida({ children }: { children: React.ReactNode }) {
  const { usuario } = useAuth()
  const local = useLocation()
  if (!usuario) return <Navigate to="/login" replace state={{ de: local.pathname }} />
  return <>{children}</>
}

export function SomenteAdmin({ children }: { children: React.ReactNode }) {
  const { usuario, ehAdmin } = useAuth()
  if (!usuario) return <Navigate to="/login" replace />
  if (!ehAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}
