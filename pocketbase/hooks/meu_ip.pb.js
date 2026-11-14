// GET /backend/v1/meu-ip — devolve o IP de origem da requisição do cliente.
// Usado pelo frontend para preencher automaticamente o campo "IP da estação"
// logo após o login. Requer sessão (o IP só interessa a quem está autenticado).
//
// PocketBase resolve o IP real do cliente via seus trusted proxies; usamos
// e.realIP() (que já considera os headers de proxy configurados) com fallback
// para e.remoteIP() — o IP direto da conexão.
routerAdd(
  'GET',
  '/backend/v1/meu-ip',
  (e) => {
    const ip = e.realIP() || e.remoteIP()
    return e.json(200, { ip })
  },
  $apis.requireAuth(),
)
