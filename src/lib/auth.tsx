import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import pb from '@/lib/pocketbase/client'

export type Perfil = 'admin' | 'tecnico' | 'usuario'

export type Usuario = {
  id: string
  email: string
  name: string
  perfil: Perfil
  matricula: string
}

type AuthCtx = {
  usuario: Usuario | null
  carregando: boolean
  entrar: (identidade: string, senha: string) => Promise<void>
  sair: () => void
  ehAdmin: boolean
  podeAtender: boolean
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(
    (pb.authStore.record as unknown as Usuario) ?? null,
  )
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    const remover = pb.authStore.onChange(() => {
      setUsuario((pb.authStore.record as unknown as Usuario) ?? null)
    })
    return () => {
      remover()
    }
  }, [])

  async function entrar(identidade: string, senha: string) {
    setCarregando(true)
    try {
      // aceita matrícula ou e-mail: a matrícula é convertida em e-mail interno
      const email = identidade.includes('@')
        ? identidade.trim()
        : `${identidade.trim().toLowerCase()}@smsub.local`
      await pb.collection('users').authWithPassword(email, senha)
      setUsuario((pb.authStore.record as unknown as Usuario) ?? null)
    } finally {
      setCarregando(false)
    }
  }

  function sair() {
    pb.authStore.clear()
    setUsuario(null)
  }

  const perfil = (usuario?.perfil as Perfil) || 'usuario'

  return (
    <Ctx.Provider
      value={{
        usuario,
        carregando,
        entrar,
        sair,
        ehAdmin: perfil === 'admin',
        podeAtender: perfil === 'admin' || perfil === 'tecnico',
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth fora do AuthProvider')
  return c
}
