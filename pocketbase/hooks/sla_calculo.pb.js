// Hook: calcula os prazos de SLA na abertura do chamado.
//
// Roda ANTES da gravação (e.next() no fim), então os prazos entram no mesmo
// INSERT do chamado — nada de gravar de novo depois.
//
// O relógio é de MINUTOS ÚTEIS: o prazo é a abertura somada aos minutos da
// regra da prioridade, caminhando apenas dentro da janela do calendário
// comercial ativo (por padrão seg–sex, 08:00–18:00). Chamado aberto na sexta
// às 17h com prazo de 480 min vence na segunda às 17h, não no sábado.
//
// Sem regra de SLA para a prioridade ou sem calendário ativo, o hook não
// grava prazo nenhum e o chamado segue funcionando como antes.

onRecordCreate((e) => {
  const chamado = e.record

  try {
    const prioridade = chamado.getString('prioridade') || 'P3'

    const regras = $app.findRecordsByFilter(
      'sla_regras',
      'prioridade = {:p} && ativo = true',
      '',
      1,
      0,
      { p: prioridade },
    )
    const regra = regras.length > 0 ? regras[0] : null

    const cals = $app.findRecordsByFilter('sla_calendario', 'ativo = true', '-created', 1, 0)
    const calendario = cals.length > 0 ? cals[0] : null

    if (regra && calendario) {
      // janela por dia da semana: { "1": {ini: 480, fim: 1080}, ... }
      const janelas = {}
      // campo json: get() devolve os bytes crus — precisa de JSON.parse
      let dias = []
      try {
        dias = JSON.parse(calendario.getString('dias')) || []
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

      // Avança N minutos úteis a partir de um instante.
      const avancar = (inicioMs, minutos) => {
        if (minutos <= 0) return inicioMs
        let restante = minutos
        let cursor = new Date(inicioMs)
        let voltas = 0
        while (restante > 0 && voltas < 2000) {
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

          if (cursor.getTime() < ini.getTime()) {
            cursor = ini
            continue
          }
          if (cursor.getTime() >= fim.getTime()) {
            cursor.setDate(cursor.getDate() + 1)
            cursor.setHours(0, 0, 0, 0)
            continue
          }
          const usa = Math.min((fim.getTime() - cursor.getTime()) / 60000, restante)
          restante -= usa
          cursor = new Date(cursor.getTime() + usa * 60000)
          if (restante > 0) {
            cursor.setDate(cursor.getDate() + 1)
            cursor.setHours(0, 0, 0, 0)
          }
        }
        return cursor.getTime()
      }

      const minutosDe = (rec, campo) => {
        const v = rec.getFloat(campo)
        return isFinite(v) && v > 0 ? Math.round(v) : 0
      }

      const aberturaTxt = chamado.getString('abertura')
      const abertura = aberturaTxt ? new Date(aberturaTxt) : new Date()
      const baseMs = isNaN(abertura.getTime()) ? Date.now() : abertura.getTime()

      const respostaMin = minutosDe(regra, 'resposta_min')
      const resolucaoMin = minutosDe(regra, 'resolucao_min')

      if (respostaMin > 0) {
        chamado.set('prazo_resposta', new Date(avancar(baseMs, respostaMin)).toISOString())
      }
      if (resolucaoMin > 0) {
        chamado.set('prazo_resolucao', new Date(avancar(baseMs, resolucaoMin)).toISOString())
      }
      chamado.set('sla_situacao', 'no_prazo')
    }
  } catch (err) {
    $app.logger().error('sla: falha ao calcular prazo na abertura', 'erro', String(err))
  }

  e.next()
}, 'chamados')
