migrate(
  (app) => {
    // O admin precisa poder gerenciar as outras contas (e-mail, perfil, senha).
    // A regra anterior (id = @request.auth.id) só permitia cada um editar a si mesmo,
    // e por isso a carga de contas ficou com e-mail vazio e sem login.
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.updateRule =
      "@request.auth.id != '' && (id = @request.auth.id || @request.auth.perfil = 'admin')"
    users.deleteRule = "@request.auth.id != '' && @request.auth.perfil = 'admin'"
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.updateRule =
      'id = @request.auth.id && @request.body.perfil:changed = false && @request.body.matricula:changed = false'
    users.deleteRule = 'id = @request.auth.id'
    app.save(users)
  },
)
