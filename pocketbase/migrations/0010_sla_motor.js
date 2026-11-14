// 0010 — motor de SLA por prioridade.
//
// Cria a configuração do SLA do SysHelp:
//
// 1. Coleção "sla_regras": uma linha por prioridade (P1..P5) com os três
//    prazos do acordo — 1ª resposta, atualização e resolução — medidos em
//    MINUTOS ÚTEIS, mais a meta de cumprimento. É editável pelo admin em
//    /sla, sem precisar de nova migração.
// 2. Coleção "sla_calendario": a janela de atendimento (dias da semana +
//    hora inicial/final) em que o relógio do SLA corre. Padrão: seg–sex,
//    08:00–18:00, que é a cobertura acordada.
// 3. Campos de prazo em "chamados": prazo_resposta, prazo_resolucao,
//    primeira_resposta_em, pausado_em, minutos_pausados e
//    minutos_uteis_gastos — preenchidos pelo hook sla_calculo.pb.js.
//
// Nada é aplicado a chamados já existentes: os campos novos ficam nulos e o
// painel de SLA só considera chamados com prazo calculado.

migrate(
  (app) => {
    // ── calendário comercial ────────────────────────────────────────────
    const calendario = new Collection({
      name: 'sla_calendario',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != '' && @request.auth.perfil = 'admin'",
      updateRule: "@request.auth.id != '' && @request.auth.perfil = 'admin'",
      deleteRule: "@request.auth.id != '' && @request.auth.perfil = 'admin'",
      fields: [
        { name: 'nome', type: 'text', required: true, max: 120 },
        {
          name: 'dias',
          type: 'json',
          required: false,
          help: 'Array de dias: [{ "dia": 1, "ini": "08:00", "fim": "18:00" }] — dia 0 = domingo',
        },
        { name: 'ativo', type: 'bool', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(calendario)

    // ── regras de SLA por prioridade ────────────────────────────────────
    const regras = new Collection({
      name: 'sla_regras',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != '' && @request.auth.perfil = 'admin'",
      updateRule: "@request.auth.id != '' && @request.auth.perfil = 'admin'",
      deleteRule: "@request.auth.id != '' && @request.auth.perfil = 'admin'",
      fields: [
        {
          name: 'prioridade',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['P1', 'P2', 'P3', 'P4', 'P5'],
        },
        { name: 'descricao', type: 'text', required: false, max: 300 },
        { name: 'resposta_min', type: 'number', required: false, min: 0 },
        { name: 'atualizacao_min', type: 'number', required: false, min: 0 },
        { name: 'resolucao_min', type: 'number', required: false, min: 0 },
        { name: 'meta_percentual', type: 'number', required: false, min: 0, max: 100 },
        { name: 'ativo', type: 'bool', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_sla_regras_prioridade ON sla_regras (prioridade)'],
    })
    app.save(regras)

    // ── campos de prazo nos chamados ────────────────────────────────────
    const chamados = app.findCollectionByNameOrId('chamados')
    const novos = [
      new DateField({
        name: 'prazo_resposta',
        help: 'Limite da 1ª resposta, calculado a partir da abertura',
      }),
      new DateField({
        name: 'prazo_resolucao',
        help: 'Limite de resolução, calculado a partir da abertura',
      }),
      new DateField({
        name: 'primeira_resposta_em',
        help: 'Quando o técnico respondeu pela 1ª vez',
      }),
      new DateField({ name: 'pausado_em', help: 'Início da pausa atual do relógio de SLA' }),
      new NumberField({ name: 'minutos_pausados', min: 0, help: 'Minutos úteis já pausados' }),
      new NumberField({
        name: 'minutos_uteis_gastos',
        min: 0,
        help: 'Minutos úteis até a resolução',
      }),
      new SelectField({
        name: 'sla_situacao',
        maxSelect: 1,
        values: ['no_prazo', 'em_risco', 'violado', 'cumprido', 'pausado'],
      }),
      new RelationField({
        name: 'responsavel_id',
        collectionId: '_pb_users_auth_',
        maxSelect: 1,
        cascadeDelete: false,
        help: 'Técnico responsável pelo atendimento',
      }),
    ]
    for (const f of novos) {
      if (!chamados.fields.getByName(f.name)) chamados.fields.add(f)
    }
    chamados.addIndex('idx_chamados_prazo_resolucao', false, 'prazo_resolucao', '')
    app.save(chamados)

    // ── seeds ───────────────────────────────────────────────────────────
    const cal = new Record(app.findCollectionByNameOrId('sla_calendario'))
    cal.set('nome', 'Comercial — seg a sex, 08:00 às 18:00')
    cal.set('dias', [
      { dia: 1, ini: '08:00', fim: '18:00' },
      { dia: 2, ini: '08:00', fim: '18:00' },
      { dia: 3, ini: '08:00', fim: '18:00' },
      { dia: 4, ini: '08:00', fim: '18:00' },
      { dia: 5, ini: '08:00', fim: '18:00' },
    ])
    cal.set('ativo', true)
    app.save(cal)

    // Matriz acordada com o Carlos em 14/11/2026.
    const matriz = [
      {
        prioridade: 'P1',
        descricao: 'Crítico — serviço essencial parado para todos, sem contorno',
        resposta_min: 30,
        atualizacao_min: 120,
        resolucao_min: 480,
        meta_percentual: 90,
      },
      {
        prioridade: 'P2',
        descricao: 'Alto — área crítica travada ou contorno ruim',
        resposta_min: 120,
        atualizacao_min: 480,
        resolucao_min: 960,
        meta_percentual: 90,
      },
      {
        prioridade: 'P3',
        descricao: 'Médio — um usuário afetado, com contorno',
        resposta_min: 480,
        atualizacao_min: 960,
        resolucao_min: 2400,
        meta_percentual: 85,
      },
      {
        prioridade: 'P4',
        descricao: 'Baixo — dúvida, solicitação, melhoria',
        resposta_min: 960,
        atualizacao_min: 2400,
        resolucao_min: 4800,
        meta_percentual: 85,
      },
      {
        prioridade: 'P5',
        descricao: 'Muito baixo — cosmético, sem impacto operacional',
        resposta_min: 960,
        atualizacao_min: 2400,
        resolucao_min: 4800,
        meta_percentual: 85,
      },
    ]
    for (const m of matriz) {
      const r = new Record(app.findCollectionByNameOrId('sla_regras'))
      for (const [k, v] of Object.entries(m)) r.set(k, v)
      r.set('ativo', true)
      app.save(r)
    }
  },
  (app) => {
    const chamados = app.findCollectionByNameOrId('chamados')
    for (const nome of [
      'prazo_resposta',
      'prazo_resolucao',
      'primeira_resposta_em',
      'pausado_em',
      'minutos_pausados',
      'minutos_uteis_gastos',
      'sla_situacao',
      'responsavel_id',
    ]) {
      if (chamados.fields.getByName(nome)) chamados.fields.removeByName(nome)
    }
    try {
      chamados.removeIndex('idx_chamados_prazo_resolucao')
    } catch (_) {}
    app.save(chamados)

    for (const nome of ['sla_regras', 'sla_calendario']) {
      try {
        app.delete(app.findCollectionByNameOrId(nome))
      } catch (_) {}
    }
  },
)
