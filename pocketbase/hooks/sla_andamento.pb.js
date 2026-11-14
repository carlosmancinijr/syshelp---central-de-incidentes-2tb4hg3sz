// Hook: andamento do SLA quando o chamado muda de status.
//
// Abertura = sla_calculo.pb.js. Este aqui cuida do resto do ciclo:
//
// - 1ª resposta: na primeira vez que o chamado sai de "aberto", grava
//   primeira_resposta_em (é o que mede o prazo de 1ª resposta).
// - Pausa: ao entrar em "aguardando_solicitante" ou "aguardando_terceiro",
//   grava pausado_em. Ao sair, soma ao minutos_pausados os minutos ÚTEIS
//   parados — o tempo parado não conta contra o time.
// - Resolução: ao entrar em "resolvido" ou "fechado", grava
//   minutos_uteis_gastos (abertura → agora, menos as pausas) e marca a
//   situação como "cumprido" ou "violado" pelo prazo de resolução.
//
// Campos são escritos antes do e.next(), então entram no mesmo UPDATE.

onRecordUpdate((e) => {
  const chamado = e.record

  try {
    const anterior = chamado.original().getString('status')
    const atual = chamado.getString('status')
    const agora = new Date()

    const ehPausa = (s) => s === 'aguardando_solicitante' || s === 'aguardando_terceiro'
    const ehFim = (s) => s === 'resolvido' || s === 'fechado'

    // ── calendário (para contar minutos úteis) ──────────────────────────
    const janelas = {}
    try {
      const cals = $app.findRecordsByFilter('sla_calendario', 'ativo = true', '-created', 1, 0)
      if (cals.length > 0) {
        // campo json: get() devolve os bytes crus — precisa de JSON.parse
        let dias = []
        try {
          dias = JSON.parse(cals[0].getString('dias')) || []
        } catch (_) {
          dias = []
        }
        if (Array.isArray(dias)) {
          for (const d of dias) {
            const paraMin = (txt) => {
              const partes = String(txt || '0:0').split(':')
              return Number(partes[0]) * 60 + Number(partes[1] || 0)
            }
            const ini = paraMin(d.ini)
            const fim = paraMin(d.fim)
            if (fim > ini) janelas[String(d.dia)] = { ini: ini, fim: fim }
          }
        }
      }
    } catch (_) {}

    // Minutos úteis entre dois instantes.
    const uteis = (deMs, ateMs) => {
      if (!(ateMs > deMs)) return 0
      let total = 0
      let cursor = new Date(deMs)
      let voltas = 0
      while (cursor.getTime() < ateMs && voltas < 2000) {
        voltas++
        const janela = janelas[String(cursor.getDay())]
        if (!janela) {
          cursor.setDate(cursor.getDate() + 1)
          cursor.setHours(0, 0, 0, 0)
          continue
        }
        const ini = new Date(cursor)
        ini.setHours(Math.floor(janela.ini / 60), janela.ini % 60, 0, 0)
        const fim = new Date(cursor)
        fim.setHours(Math.floor(janela.fim / 60), janela.fim % 60, 0, 0)
        const comeco = Math.max(cursor.getTime(), ini.getTime())
        const termino = Math.min(ateMs, fim.getTime())
        if (termino > comeco) total += (termino - comeco) / 60000
        cursor.setDate(cursor.getDate() + 1)
        cursor.setHours(0, 0, 0, 0)
      }
      return Math.round(total)
    }

    const paraData = (txt) => {
      if (!txt) return null
      const d = new Date(txt)
      return isNaN(d.getTime()) ? null : d
    }

    // ── 1ª resposta ─────────────────────────────────────────────────────
    if (anterior === 'aberto' && atual !== 'aberto' && !chamado.getString('primeira_resposta_em')) {
      chamado.set('primeira_resposta_em', agora.toISOString())
    }

    // ── pausa do relógio ────────────────────────────────────────────────
    if (!ehPausa(anterior) && ehPausa(atual)) {
      chamado.set('pausado_em', agora.toISOString())
    }
    if (ehPausa(anterior) && !ehPausa(atual)) {
      const inicioPausa = paraData(chamado.getString('pausado_em'))
      if (inicioPausa) {
        const jaPausado = chamado.getFloat('minutos_pausados') || 0
        chamado.set('minutos_pausados', jaPausado + uteis(inicioPausa.getTime(), agora.getTime()))
        chamado.set('pausado_em', '')
      }
    }

    // ── situação do SLA ─────────────────────────────────────────────────
    const prazoResolucao = paraData(chamado.getString('prazo_resolucao'))

    if (ehFim(atual)) {
      const abertura = paraData(chamado.getString('abertura'))
      const pausados = chamado.getFloat('minutos_pausados') || 0
      if (abertura) {
        const gastos = Math.max(
          0,
          uteis(abertura.getTime(), agora.getTime()) - Math.round(pausados),
        )
        chamado.set('minutos_uteis_gastos', gastos)
      }
      if (prazoResolucao) {
        chamado.set(
          'sla_situacao',
          agora.getTime() <= prazoResolucao.getTime() ? 'cumprido' : 'violado',
        )
      }
    } else if (ehPausa(atual)) {
      chamado.set('sla_situacao', 'pausado')
    } else if (prazoResolucao) {
      const total =
        prazoResolucao.getTime() - (paraData(chamado.getString('abertura')) || agora).getTime()
      const restante = prazoResolucao.getTime() - agora.getTime()
      if (restante <= 0) chamado.set('sla_situacao', 'violado')
      else if (total > 0 && restante <= total * 0.2) chamado.set('sla_situacao', 'em_risco')
      else chamado.set('sla_situacao', 'no_prazo')

      // o chamado nasce "aberto"; a primeira mudança de status é a
      // 1ª resposta do time
      if (atual === 'aberto' && !chamado.getString('primeira_resposta_em')) {
        chamado.set('primeira_resposta_em', agora.toISOString())
      }
    }
  } catch (err) {
    $app.logger().error('sla: falha ao atualizar andamento', 'erro', String(err))
  }

  e.next()
}, 'chamados')
