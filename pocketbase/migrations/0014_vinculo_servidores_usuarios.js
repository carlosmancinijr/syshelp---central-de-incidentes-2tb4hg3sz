// Migração 0014 — vínculo servidores -> contas de usuário (usuario_id)
//
// Vincula cada registro de `servidores` à conta de `users` cuja matrícula
// corresponde à matrícula do servidor (usada como identity no password auth
// desde a migração 0008). Normaliza caixa/espaços antes de comparar.
// Regras:
//   - Não vincula por nome (nomes podem se repetir).
//   - Servidor sem conta correspondente fica sem vínculo (não cria contas).
//   - Em caso de duplicidade de matrícula entre registros de servidor,
//     vincula apenas o mais recente (maior `created`) e deixa os demais
//     sem vínculo — cada conta aparece em um único registro vinculado.
// Idempotente: só grava quando o vínculo muda; no-op em base vazia.

migrate(
  (app) => {
    if (!app.hasTable('servidores') || !app.hasTable('users')) return

    const servidores = app.findRecordsByFilter('servidores', '', 'created', 0, 0)
    const users = app.findRecordsByFilter('users', "matricula != ''", '', 0, 0)

    // Mapa matrícula normalizada -> conta
    const userByMatricula = {}
    for (const u of users) {
      const m = u.getString('matricula').trim().toLowerCase()
      if (m !== '') userByMatricula[m] = u
    }

    // Em duplicidade de matrícula, o registro mais recente vence
    // (a lista vem em ordem crescente de created, então o último sobrescreve).
    const escolhido = {}
    for (const s of servidores) {
      const m = s.getString('matricula').trim().toLowerCase()
      if (m !== '') escolhido[m] = s.id
    }

    let vinculados = 0
    let semConta = 0
    for (const s of servidores) {
      const m = s.getString('matricula').trim().toLowerCase()
      if (m === '' || escolhido[m] !== s.id) continue // duplicado -> fica sem vínculo

      const u = userByMatricula[m]
      if (!u) {
        semConta++
        continue
      }

      if (s.getString('usuario_id') === u.id) continue // já vinculado

      s.set('usuario_id', u.id)
      app.save(s)
      vinculados++
    }

    // Registros duplicados (não escolhidos) não podem apontar para a conta:
    // garante que só o mais recente fica vinculado.
    let desvinculados = 0
    for (const s of servidores) {
      const m = s.getString('matricula').trim().toLowerCase()
      if (m === '' || escolhido[m] === s.id) continue
      if (s.getString('usuario_id') !== '') {
        s.set('usuario_id', '')
        app.save(s)
        desvinculados++
      }
    }

    console.log(
      `[0014] servidores vinculados: ${vinculados}; sem conta correspondente: ${semConta}; duplicados desvinculados: ${desvinculados}`,
    )
  },
  (app) => {
    // down: no-op — o vínculo é um backfill de dados; reverter apagaria
    // vínculos criados legitimamente depois da migração.
  },
)
