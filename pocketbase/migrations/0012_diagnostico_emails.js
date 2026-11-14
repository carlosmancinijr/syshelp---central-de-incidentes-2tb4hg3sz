// 0012 — diagnóstico dos e-mails das contas (somente leitura).
//
// Rodou ANTES da troca de domínio (0013) só para conferir o que existia:
// 382 contas, 381 em @smsub.local, 1 em @syshelp.local, zero conflito de
// parte local. Não grava nada — fica no histórico como registro da conferência
// que autorizou a troca em massa.

migrate(
  (app) => {
    const NOVO = 'smsub.prefeitura.sp.gov.br'
    const contas = app.findRecordsByFilter('users', '', 'email', 0, 0)
    const vistos = {}

    for (const u of contas) {
      const atual = u.getString('email') || ''
      const partes = atual.split('@')
      const local = partes[0] || ''
      const dominio = partes[1] || ''
      const novo = local ? local + '@' + NOVO : ''

      let observacao = ''
      if (!local) observacao = 'SEM E-MAIL'
      else if (dominio === NOVO) observacao = 'já está no domínio novo'
      if (local) {
        if (vistos[local]) observacao = 'CONFLITO com ' + vistos[local]
        else vistos[local] = atual
      }

      console.log(
        '[email] ' +
          atual +
          ' -> ' +
          novo +
          ' | perfil=' +
          (u.getString('perfil') || '-') +
          ' | matricula=' +
          (u.getString('matricula') || '-') +
          (observacao ? ' | ' + observacao : ''),
      )
    }
  },
  (app) => {},
)
