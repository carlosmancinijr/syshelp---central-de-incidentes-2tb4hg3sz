migrate(
  (app) => {
    // Perfil de acesso nas contas: admin | tecnico | usuario.
    // Precisa existir ANTES das coleções, porque as regras de acesso
    // (RLS) das tabelas leem @request.auth.perfil.
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.fields.add(
      new SelectField({
        name: 'perfil',
        required: false,
        maxSelect: 1,
        values: ['admin', 'tecnico', 'usuario'],
      }),
    )
    users.fields.add(
      new TextField({
        name: 'matricula',
        required: false,
        max: 40,
      }),
    )
    // O próprio usuário NÃO pode alterar o próprio perfil nem a matrícula:
    // sem isso, qualquer um se promoveria a admin pela API.
    users.updateRule =
      'id = @request.auth.id && @request.body.perfil:changed = false && @request.body.matricula:changed = false'
    users.listRule = "@request.auth.id != ''"
    users.viewRule = "@request.auth.id != ''"
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.fields.removeByName('perfil')
    users.fields.removeByName('matricula')
    users.updateRule = 'id = @request.auth.id'
    app.save(users)
  },
)
