// 0013 — troca do domínio de e-mail de TODAS as contas.
//
// Antes desta migração o diagnóstico (0012) conferiu o banco:
//   382 contas · 381 em @smsub.local · 1 em @syshelp.local (importação)
//   0 conflitos de parte local (nenhum índice único de e-mail seria violado)
//
// A troca preserva a parte antes do @ e substitui apenas o domínio, então
// quem era 797910@smsub.local passa a ser 797910@smsub.prefeitura.sp.gov.br.
// A matrícula NÃO muda — e ela continua valendo como usuário de login
// (passwordAuth.identityFields = ['email','matricula'], migração 0008), que é
// o caminho que a maioria usa na tela de entrada.
//
// Feito em SQL de propósito: são 382 registros, e um laço de app.save()
// estouraria o tempo da migração e dispararia validação registro a registro.
// A senha, o perfil, a matrícula e o vínculo de cada conta ficam intactos.
migrate(
  (app) => {
    const NOVO = 'smsub.prefeitura.sp.gov.br'

    for (const antigo of ['smsub.local', 'syshelp.local']) {
      app
        .db()
        .newQuery(
          'UPDATE users SET email = replace(email, {:de}, {:para}), ' +
            "updated = strftime('%Y-%m-%d %H:%M:%fZ', 'now') " +
            'WHERE email LIKE {:filtro}',
        )
        .bind({ de: '@' + antigo, para: '@' + NOVO, filtro: '%@' + antigo })
        .execute()
    }

    // Qualquer conta que ainda esteja em outro domínio fica registrada no log
    // da migração, para não passar despercebida.
    const restantes = app.findRecordsByFilter('users', 'email !~ {:novo}', '', 0, 0, {
      novo: NOVO.replace(/\./g, '\\.') + '$',
    })
    if (restantes.length > 0) {
      console.log('[email] contas fora do domínio novo: ' + restantes.length)
      for (const r of restantes) console.log('[email] resta: ' + r.getString('email'))
    }
  },
  (app) => {
    // Volta ao domínio anterior (os dois que existiam antes da troca).
    app
      .db()
      .newQuery(
        'UPDATE users SET email = replace(email, {:de}, {:para}), ' +
          "updated = strftime('%Y-%m-%d %H:%M:%fZ', 'now') " +
          'WHERE email LIKE {:filtro}',
      )
      .bind({
        de: '@smsub.prefeitura.sp.gov.br',
        para: '@smsub.local',
        filtro: '%@smsub.prefeitura.sp.gov.br',
      })
      .execute()
  },
)
