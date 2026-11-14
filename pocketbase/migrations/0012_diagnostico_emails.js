// 0012 — diagnóstico: e-mails das contas (NÃO altera nada).
//
// Só lista, no log do backend, o e-mail atual de cada conta e qual seria o
// novo, para descobrir antes de mexer se existe conflito (duas contas com a
// mesma parte antes do @ — o índice único de e-mail recusaria a troca).
//
// Esta migração não grava nada. A troca de domínio vem em outra migração,
// depois de conferir a lista.

migrate(
  (app) => {
    const NOVO = 'smsub.prefeitura.sp.gov.br'
    const contas = app.findRecordsByFilter('users', '', 'email', 0, 0)

    console.log('[email] total de contas: ' + contas.length)

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
