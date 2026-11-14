// Cron: vigia do SLA.
//
// A cada 10 minutos percorre os chamados NÃO encerrados que têm prazo de
// resolução e recalcula sla_situacao:
//
//   no_prazo  → mais de 20% do prazo restante
//   em_risco  → 80% do prazo consumido (o alerta do responsável)
//   violado   → prazo estourado (o alerta do gestor)
//
// A pausa do relógio (aguardando_solicitante / aguardando_terceiro) não é
// tocada aqui: quem entra e sai da pausa é o hook sla_andamento.pb.js.
//
// Cada mudança para "em_risco" ou "violado" fica registrada no log do backend
// (source "crons"), que é a fonte do aviso no painel de SLA.

cronAdd('sla_vigia', '*/10 * * * *', () => {
  const agora = Date.now()
  let alterados = 0
  let escalados = 0

  try {
    const abertos = $app.findRecordsByFilter(
      'chamados',
      "prazo_resolucao != '' && status != 'resolvido' && status != 'fechado' && status != 'cancelado'",
      'prazo_resolucao',
      500,
      0,
    )

    for (const chamado of abertos) {
      try {
        const status = chamado.getString('status')
        if (status === 'aguardando_solicitante' || status === 'aguardando_terceiro') continue

        const prazo = new Date(chamado.getString('prazo_resolucao'))
        const abertura = new Date(chamado.getString('abertura') || chamado.getString('created'))
        if (isNaN(prazo.getTime())) continue

        const total = prazo.getTime() - abertura.getTime()
        const restante = prazo.getTime() - agora

        let situacao = 'no_prazo'
        if (restante <= 0) situacao = 'violado'
        else if (total > 0 && restante <= total * 0.2) situacao = 'em_risco'

        if (chamado.getString('sla_situacao') !== situacao) {
          chamado.set('sla_situacao', situacao)
          $app.save(chamado)
          alterados++
          if (situacao === 'em_risco' || situacao === 'violado') {
            escalados++
            $app
              .logger()
              .warn(
                'sla: chamado escalado',
                'protocolo',
                chamado.getString('protocolo'),
                'prioridade',
                chamado.getString('prioridade'),
                'situacao',
                situacao,
              )
          }
        }
      } catch (_) {
        // um chamado com problema não pode travar a varredura
      }
    }

    $app
      .logger()
      .info(
        'sla: varredura concluída',
        'avaliados',
        abertos.length,
        'alterados',
        alterados,
        'escalados',
        escalados,
      )
  } catch (err) {
    $app.logger().error('sla: falha na varredura', 'erro', String(err))
  }
})
