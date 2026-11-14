// Hook: a criticidade (prioridade) de um chamado é SEMPRE a criticidade
// padrão da sua categoria — nunca a escolha do usuário.
//
// Roda na criação de chamados (e só nela): lê a categoria informada e
// sobrescreve o campo "prioridade" com "criticidade_padrao" da categoria.
// Se o chamado vier sem categoria (ou a categoria não tiver criticidade
// definida), grava "P3" (média) — nunca fica vazio.
//
// Chamados antigos não são tocados: o hook só roda em onRecordCreate.
onRecordCreate((e) => {
  const chamado = e.record
  const catId = chamado.getString('categoria_id')

  let criticidade = 'P3'
  if (catId) {
    try {
      const cat = app.findRecordById('categorias', catId)
      const padrao = cat.getString('criticidade_padrao')
      if (padrao) criticidade = padrao
    } catch (_) {
      // categoria inexistente — mantém P3
    }
  }
  chamado.set('prioridade', criticidade)
  e.next()
}, 'chamados')
