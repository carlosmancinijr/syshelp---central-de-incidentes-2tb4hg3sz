migrate(
  (app) => {
    // Permite que o admin redefina a senha de outra conta sem informar a senha antiga
    // (o PocketBase dispensa "oldPassword" para quem tem acesso "Manage").
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.manageRule = "@request.auth.id != '' && @request.auth.perfil = 'admin'"
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.manageRule = null
    app.save(users)
  },
)
