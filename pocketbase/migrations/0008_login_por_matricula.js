// Alinha a autenticação por matrícula:
//
// 1. Normaliza os valores de "matricula" (trim + minúsculas) e resolve duplicatas,
//    deixando a matrícula apenas na conta mais antiga (a que a pessoa realmente usa).
// 2. Coloca as demais contas com matrícula em branco — com matrícula limpa e única,
//    o login por matrícula fica determinístico (uma matrícula = uma conta).
// 3. Garante um índice UNIQUE em users.matricula: o PocketBase exige um campo com
//    índice único para usá-lo como identity no login por senha. O e-mail de cada conta
//    NÃO é alterado — quem já entra pelo e-mail interno continua entrando igual.
// 4. Libera a matrícula como identity do login por senha (passwordAuth.identityFields),
//    além do e-mail. Assim o login por matrícula encontra a conta mesmo quando o
//    e-mail dela não é <matrícula>@smsub.local (ex.: d736726 → cmancini@smsub.local).
//
// Idempotente: as correções de dados rodam sempre, mas só alteram registros que
// precisam; a opção de auth e o índice são reaplicados com o mesmo resultado.
migrate(
  (app) => {
    const registros = app.findRecordsByFilter('users', 'matricula != ""', '', 0, 0)

    // Normaliza trim/caixa.
    for (const r of registros) {
      const normalizada = r.getString('matricula').trim().toLowerCase()
      if (normalizada !== r.getString('matricula')) {
        r.set('matricula', normalizada)
        app.save(r)
      }
    }

    // Deduplica: mantém a matrícula na conta mais antiga, limpa as demais.
    const vistas = {}
    for (const r of registros) {
      const mat = r.getString('matricula')
      if (!mat) continue
      if (vistas[mat] === undefined) {
        vistas[mat] = r
      } else {
        const mantida = vistas[mat]
        const maisAntiga = r.getString('created') < mantida.getString('created') ? r : mantida
        const aLimpar = maisAntiga === mantida ? r : mantida
        console.log(
          `matricula duplicada "${mat}": limpando de ${aLimpar.getString('name')} (${aLimpar.id})`,
        )
        aLimpar.set('matricula', '')
        app.save(aLimpar)
        vistas[mat] = maisAntiga
      }
    }

    // Índice único (pré-requisito do identity por matrícula).
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.addIndex('idx_users_matricula', true, 'matricula', "matricula != ''")

    // Libera a matrícula como identity do login por senha (além do e-mail).
    const opcoes = users.passwordAuth
    if (!opcoes || typeof opcoes !== 'object') throw new Error('users: opções ausentes')
    opcoes.enabled = true
    opcoes.identityFields = ['email', 'matricula']

    app.save(users)
    console.log('Login por matrícula habilitado como identity da coleção users.')
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.removeIndex('idx_users_matricula')
    const opcoes = users.passwordAuth
    if (opcoes && typeof opcoes === 'object') {
      opcoes.identityFields = ['email']
    }
    app.save(users)
  },
)
