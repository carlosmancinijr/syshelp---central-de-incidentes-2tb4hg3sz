migrate(
  (app) => {
    // ── setores ────────────────────────────────────────────────────────
    const setores = new Collection({
      name: 'setores',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != '' && @request.auth.perfil = 'admin'",
      updateRule: "@request.auth.id != '' && @request.auth.perfil = 'admin'",
      deleteRule: "@request.auth.id != '' && @request.auth.perfil = 'admin'",
      fields: [
        { name: 'nome', type: 'text', required: true, max: 200 },
        { name: 'sigla', type: 'text', required: false, max: 40 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_setores_nome ON setores (nome)'],
    })
    app.save(setores)

    // ── categorias ─────────────────────────────────────────────────────
    const categorias = new Collection({
      name: 'categorias',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != '' && @request.auth.perfil = 'admin'",
      updateRule: "@request.auth.id != '' && @request.auth.perfil = 'admin'",
      deleteRule: "@request.auth.id != '' && @request.auth.perfil = 'admin'",
      fields: [
        { name: 'nome', type: 'text', required: true, max: 120 },
        { name: 'sla_horas', type: 'number', required: false, min: 0 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_categorias_nome ON categorias (nome)'],
    })
    app.save(categorias)

    // ── servidores ─────────────────────────────────────────────────────
    const setoresId = app.findCollectionByNameOrId('setores').id
    const servidores = new Collection({
      name: 'servidores',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != '' && @request.auth.perfil = 'admin'",
      updateRule: "@request.auth.id != '' && @request.auth.perfil = 'admin'",
      deleteRule: "@request.auth.id != '' && @request.auth.perfil = 'admin'",
      fields: [
        { name: 'matricula', type: 'text', required: true, max: 40 },
        { name: 'nome', type: 'text', required: true, max: 200 },
        { name: 'login_rede', type: 'text', required: false, max: 80 },
        { name: 'cargo', type: 'text', required: false, max: 120 },
        { name: 'funcao', type: 'text', required: false, max: 120 },
        { name: 'unidade', type: 'text', required: false, max: 200 },
        { name: 'andar', type: 'text', required: false, max: 40 },
        { name: 'sala', type: 'text', required: false, max: 40 },
        { name: 'ramal', type: 'text', required: false, max: 40 },
        { name: 'ativo', type: 'bool', required: false },
        {
          name: 'setor_id',
          type: 'relation',
          required: false,
          collectionId: setoresId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          // vínculo com a conta de acesso: as regras de "chamados" chegam ao
          // dono pelo caminho solicitante_id.usuario_id
          name: 'usuario_id',
          type: 'relation',
          required: false,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_servidores_matricula ON servidores (matricula)',
        'CREATE INDEX idx_servidores_nome ON servidores (nome)',
        'CREATE INDEX idx_servidores_login ON servidores (login_rede)',
      ],
    })
    app.save(servidores)

    // ── chamados ───────────────────────────────────────────────────────
    const catId = app.findCollectionByNameOrId('categorias').id
    const servId = app.findCollectionByNameOrId('servidores').id
    const chamados = new Collection({
      name: 'chamados',
      type: 'base',
      // usuário comum vê apenas os próprios; técnico e admin veem todos
      listRule:
        "@request.auth.id != '' && (@request.auth.perfil = 'admin' || @request.auth.perfil = 'tecnico' || solicitante_id.usuario_id = @request.auth.id)",
      viewRule:
        "@request.auth.id != '' && (@request.auth.perfil = 'admin' || @request.auth.perfil = 'tecnico' || solicitante_id.usuario_id = @request.auth.id)",
      createRule: "@request.auth.id != ''",
      updateRule:
        "@request.auth.id != '' && (@request.auth.perfil = 'admin' || @request.auth.perfil = 'tecnico')",
      deleteRule: "@request.auth.id != '' && @request.auth.perfil = 'admin'",
      fields: [
        { name: 'protocolo', type: 'text', required: true, max: 40 },
        { name: 'titulo', type: 'text', required: true, max: 300 },
        { name: 'descricao', type: 'text', required: false, max: 5000 },
        { name: 'solicitante_nome', type: 'text', required: false, max: 200 },
        { name: 'setor', type: 'text', required: false, max: 200 },
        { name: 'cargo', type: 'text', required: false, max: 120 },
        { name: 'ramal', type: 'text', required: false, max: 40 },
        { name: 'subcategoria', type: 'text', required: false, max: 120 },
        {
          name: 'prioridade',
          type: 'select',
          required: false,
          maxSelect: 1,
          values: ['P1', 'P2', 'P3', 'P4', 'P5'],
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: [
            'aberto',
            'em_atendimento',
            'aguardando_solicitante',
            'aguardando_terceiro',
            'resolvido',
            'fechado',
            'cancelado',
          ],
        },
        {
          name: 'canal',
          type: 'select',
          required: false,
          maxSelect: 1,
          values: ['portal', 'telefone', 'presencial', 'email', 'whatsapp'],
        },
        { name: 'estacao', type: 'text', required: false, max: 40 },
        { name: 'ip', type: 'text', required: false, max: 15 },
        { name: 'sla_horas', type: 'number', required: false, min: 0 },
        { name: 'solucao', type: 'text', required: false, max: 5000 },
        { name: 'abertura', type: 'date', required: false },
        { name: 'fechamento', type: 'date', required: false },
        {
          name: 'solicitante_id',
          type: 'relation',
          required: false,
          collectionId: servId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: 'categoria_id',
          type: 'relation',
          required: false,
          collectionId: catId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_chamados_protocolo ON chamados (protocolo)',
        'CREATE INDEX idx_chamados_status ON chamados (status)',
        'CREATE INDEX idx_chamados_abertura ON chamados (abertura DESC)',
        'CREATE INDEX idx_chamados_estacao ON chamados (estacao)',
      ],
    })
    app.save(chamados)
  },
  (app) => {
    for (const nome of ['chamados', 'servidores', 'categorias', 'setores']) {
      try {
        app.delete(app.findCollectionByNameOrId(nome))
      } catch (_) {}
    }
  },
)
