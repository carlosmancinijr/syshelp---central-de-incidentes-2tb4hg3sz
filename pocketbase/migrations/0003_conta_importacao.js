migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // Conta de importação/carga: usada apenas pelo script de migração dos dados
    // históricos. Perfil admin, para poder criar servidores e chamados.
    // A senha vem de um secret, nunca do código.
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'import@syshelp.local')
      return // já existe
    } catch (_) {}

    const senha = $secrets.get('IMPORT_PASSWORD')
    if (!senha) {
      console.log('IMPORT_PASSWORD não configurado: conta de importação não criada')
      return
    }

    const record = new Record(users)
    record.setEmail('import@syshelp.local')
    record.setPassword(senha)
    record.set('name', 'Importação de dados')
    record.set('perfil', 'admin')
    record.set('verified', true)
    app.save(record)
    console.log('conta de importação criada')
  },
  (app) => {
    try {
      app.delete(app.findAuthRecordByEmail('_pb_users_auth_', 'import@syshelp.local'))
    } catch (_) {}
  },
)
