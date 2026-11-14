// Ambiente do usuário: guardado por conta para o campo "ID da Estação"
// ser pré-preenchido com o último valor salvo. O IP NÃO fica aqui: ele é
// lido ao vivo de cada requisição (rota /backend/v1/meu-ip), pois muda a
// cada login/máquina.
//
// Idempotente: só cria a coleção se ela ainda não existir (uma cópia do
// projeto que já a tem aplica esta migração sem efeito).
migrate(
  (app) => {
    try {
      app.findCollectionByNameOrId('ambientes_usuario')
      return // já existe — nada a fazer
    } catch (_) {}

    const usuariosId = '_pb_users_auth_'
    const ambientes = new Collection({
      name: 'ambientes_usuario',
      type: 'base',
      // o próprio dono lê/escreve; admin lê tudo; ninguém cria por outra conta
      listRule:
        "@request.auth.id != '' && (usuario_id = @request.auth.id || @request.auth.perfil = 'admin')",
      viewRule:
        "@request.auth.id != '' && (usuario_id = @request.auth.id || @request.auth.perfil = 'admin')",
      createRule: "@request.auth.id != '' && usuario_id = @request.auth.id",
      updateRule: "@request.auth.id != '' && usuario_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && @request.auth.perfil = 'admin'",
      fields: [
        {
          name: 'usuario_id',
          type: 'relation',
          required: true,
          collectionId: usuariosId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        // último ID de estação informado pelo usuário (preenchimento manual)
        { name: 'estacao', type: 'text', required: false, max: 40 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_ambientes_usuario ON ambientes_usuario (usuario_id)'],
    })
    app.save(ambientes)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('ambientes_usuario'))
    } catch (_) {}
  },
)
