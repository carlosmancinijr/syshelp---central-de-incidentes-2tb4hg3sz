// ARQUIVO NEUTRALIZADO — sem hook.
//
// Este arquivo existia como rota temporária de diagnóstico de e-mail, usada
// uma única vez para conferir as 382 contas antes da troca de domínio
// (migração 0013). O diagnóstico terminou e a rota não deve mais existir.
//
// A versão anterior era excluída do repositório, mas o pod continuava
// servindo /backend/v1/email-check — por isso o arquivo fica aqui, vazio de
// propósito: apagar de novo não resolve, e um arquivo vazio garante que o
// deploy sobrescreva o hook antigo em produção.
