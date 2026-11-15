// Hook: o protocolo do chamado é gerado NO SERVIDOR, sempre.
//
// O frontend não precisa mais enviar "protocolo": aqui garante-se um valor
// único (o índice idx_chamados_protocolo é UNIQUE). A antiga geração no
// navegador usava o total de chamados visíveis ao usuário — e para um
// solicitante comum a regra de listagem só enxerga os chamados dele, o que
// produzia protocolos já usados e derrubava a criação com
// "Failed to create record.".
//
// Formato: INC-<ano>-<sequencial de 5 dígitos>. A sequência é o próximo
// número do ano ainda não usado (verificado contra o que já existe no banco),
// ignorando protocolos de outros formatos (ex.: importados "SD-2020-00926").
onRecordCreate((e) => {
  const chamado = e.record

  if (!chamado.getString('protocolo')) {
    const ano = new Date().getFullYear()
    let seq = 1
    try {
      const ultimos = $app.findRecordsByFilter(
        'chamados',
        `protocolo ~ 'INC-${ano}-'`,
        '-protocolo',
        1,
        0,
      )
      if (ultimos.length > 0) {
        const partes = ultimos[0].getString('protocolo').split('-')
        seq = (Number(partes[2]) || 0) + 1
      }
    } catch (_) {
      // sem registros para o ano — segue com 1
    }

    // tenta até achar um número livre (proteção contra corrida/concorrência)
    const prefixo = `INC-${ano}-`
    let protocolo = `${prefixo}${String(seq).padStart(5, '0')}`
    for (let tentativa = 0; tentativa < 20; tentativa++) {
      try {
        $app.findFirstRecordByFilter('chamados', `protocolo = {:p}`, { p: protocolo })
        seq++
        protocolo = `${prefixo}${String(seq).padStart(5, '0')}`
      } catch (_) {
        break // não existe — pode usar
      }
    }

    chamado.set('protocolo', protocolo)
  }

  e.next()
}, 'chamados')
