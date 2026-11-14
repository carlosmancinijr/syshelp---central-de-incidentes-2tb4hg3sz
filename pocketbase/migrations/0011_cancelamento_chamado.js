// 0011 — cancelamento de chamado com registro.
//
// O botão de cancelar já existia como status na lista de opções, mas não
// guardava quem cancelou, quando e por quê. Um chamado cancelado sem motivo
// registrado é um chamado que volta como reclamação depois.
//
// Adiciona em "chamados":
//   motivo_cancelamento — justificativa obrigatória no ato do cancelamento
//   cancelado_em        — quando foi cancelado
//   cancelado_por       — qual usuário (admin ou técnico) cancelou
//
// As permissões de update da coleção já liberam admin e técnico; nada muda
// no RLS. Chamados já cancelados ficam com os campos vazios.

migrate(
  (app) => {
    const chamados = app.findCollectionByNameOrId('chamados')

    const novos = [
      new TextField({
        name: 'motivo_cancelamento',
        max: 1000,
        help: 'Por que o chamado foi cancelado (obrigatório no cancelamento)',
      }),
      new DateField({ name: 'cancelado_em', help: 'Data e hora do cancelamento' }),
      new RelationField({
        name: 'cancelado_por',
        collectionId: '_pb_users_auth_',
        maxSelect: 1,
        cascadeDelete: false,
        help: 'Usuário que cancelou o chamado',
      }),
    ]

    for (const f of novos) {
      if (!chamados.fields.getByName(f.name)) chamados.fields.add(f)
    }
    app.save(chamados)
  },
  (app) => {
    const chamados = app.findCollectionByNameOrId('chamados')
    for (const nome of ['motivo_cancelamento', 'cancelado_em', 'cancelado_por']) {
      if (chamados.fields.getByName(nome)) chamados.fields.removeByName(nome)
    }
    app.save(chamados)
  },
)
