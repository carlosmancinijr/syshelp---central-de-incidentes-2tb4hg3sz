// Hook TEMPORÁRIO — diagnóstico dos e-mails das contas.
//
// Na inicialização do backend grava no log (source "hooks") o e-mail atual de
// cada conta e o que ficaria com o domínio novo, para conferir conflito antes
// de trocar. Este arquivo é removido logo depois da conferência.

onBootstrap((e) => {
  e.next()

  try {
    const NOVO = 'smsub.prefeitura.sp.gov.br'
    const contas = $app.findRecordsByFilter('users', '', 'email', 0, 0)
    const vistos = {}

    $app.logger().info('[email-diag] total de contas', 'total', contas.length)

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

      $app
        .logger()
        .info(
          '[email-diag] conta',
          'atual',
          atual,
          'novo',
          novo,
          'perfil',
          u.getString('perfil') || '-',
          'matricula',
          u.getString('matricula') || '-',
          'obs',
          obs,
        )
    }
  } catch (err) {
    $app.logger().error('[email-diag] falhou', 'erro', String(err))
  }
})
