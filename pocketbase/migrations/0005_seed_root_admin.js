migrate(
  (app) => {
    // Usuário root do gerenciamento do sistema.
    // Login: matrícula "admin" (o app converte para admin@smsub.local) e senha "syshelp2026".
    // Idempotente: em banco vazio cria; se já existir (qualquer cópia do projeto), apenas
    // garante perfil admin/verificado — nunca zera a senha de um admin que a trocou.
    let registro = null
    try {
      registro = app.findAuthRecordByEmail('_pb_users_auth_', 'admin@smsub.local')
    } catch (_) {
      registro = null
    }

    if (!registro) {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      registro = new Record(users)
      registro.setEmail('admin@smsub.local')
      registro.setPassword('syshelp2026')
      registro.setVerified(true)
      registro.set('name', 'Administrador')
      registro.set('perfil', 'admin')
      registro.set('matricula', 'admin')
      app.save(registro)
      console.log('Seed: usuário root "admin" criado.')
    } else {
      // Já existe: garante que seja root, sem tocar na senha.
      if (registro.getString('perfil') !== 'admin') {
        registro.set('perfil', 'admin')
      }
      if (!registro.getBool('verified')) {
        registro.setVerified(true)
      }
      app.save(registro)
      console.log('Seed: usuário root "admin" já existia — perfil confirmado.')
    }
  },
  (app) => {
    try {
      const registro = app.findAuthRecordByEmail('_pb_users_auth_', 'admin@smsub.local')
      app.delete(registro)
    } catch (_) {}
  },
)
