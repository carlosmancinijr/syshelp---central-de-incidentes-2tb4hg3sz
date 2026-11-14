// Hook TEMPORÁRIO — diagnóstico dos e-mails das contas.
//
// Rota protegida por token que devolve o e-mail atual de cada conta e o que
// ficaria com o domínio novo, para conferir conflito antes de trocar.
// Este arquivo é removido depois da conferência.

routerAdd('GET', '/backend/v1/email-diag', (e) => {
  if (e.request.header.get('X-Diag-Token') !== 'diag-2026-temp') {
    return e.json(403, { erro: 'token inválido' })
  }

  const NOVO = 'smsub.prefeitura.sp.gov.br'
  const contas = $app.findRecordsByFilter('users', '', 'email', 0, 0)
  const vistos = {}
  const lista = []

  for (const u of contas) {
    const atual = u.getString('email') || ''
    const partes = atual.split('@')
    const local = partes[0] || ''
    const dominio = partes[1] || ''
    const novo = local ? local + '@' + NOVO : ''

    let obs = ''
    if (!local) obs = 'SEM EMAIL'
    else if (dominio === NOVO) obs = 'ja no dominio novo'
    if (local) {
      if (vistos[local]) obs = 'CONFLITO com ' + vistos[local]
      else vistos[local] = atual
    }

    lista.push({
      id: u.id,
      atual: atual,
      novo: novo,
      perfil: u.getString('perfil') || '',
      matricula: u.getString('matricula') || '',
      obs: obs,
    })
  }

  return e.json(200, {
    total: contas.length,
    dominiosAtuais: Object.keys(
      lista.reduce((acc, x) => {
        const d = (x.atual.split('@')[1] || '').trim()
        if (d) acc[d] = true
        return acc
      }, {}),
    ),
    conflitos: lista.filter((x) => x.obs.indexOf('CONFLITO') === 0).length,
    contas: lista,
  })
})
