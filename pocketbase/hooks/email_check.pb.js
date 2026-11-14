// Hook TEMPORÁRIO — conferência do domínio de e-mail das contas.
// Removido logo depois de conferir a migração 0013.

routerAdd('GET', '/backend/v1/email-check', (e) => {
  if (e.request.header.get('X-Diag-Token') !== 'diag-2026-temp') {
    return e.json(403, { erro: 'token inválido' })
  }

  const NOVO = 'smsub.prefeitura.sp.gov.br'
  const contas = $app.findRecordsByFilter('users', '', 'email', 0, 0)
  const dominios = {}
  const fora = []
  let semEmail = 0

  for (const u of contas) {
    const email = u.getString('email') || ''
    const partes = email.split('@')
    const dominio = partes[1] || ''
    if (!dominio) semEmail++
    else dominios[dominio] = (dominios[dominio] || 0) + 1
    if (dominio && dominio !== NOVO) fora.push(email)
  }

  const amostra = contas.slice(0, 3).map((u) => ({
    email: u.getString('email'),
    matricula: u.getString('matricula'),
    perfil: u.getString('perfil'),
  }))

  return e.json(200, {
    total: contas.length,
    dominios: dominios,
    foraDoDominio: fora.slice(0, 20),
    totalForaDoDominio: fora.length,
    semEmail: semEmail,
    amostra: amostra,
  })
})
