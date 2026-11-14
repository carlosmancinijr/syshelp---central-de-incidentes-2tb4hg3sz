// ARQUIVO NEUTRALIZADO — sem hook.
//
// Era a rota temporária /backend/v1/email-diag, usada uma única vez para
// diagnosticar os e-mails das contas antes da troca de domínio (migração
// 0013). O diagnóstico terminou e a rota não deve mais existir.
//
// A versão anterior era excluída do repositório, mas o pod continuava
// servindo a rota — por isso o arquivo fica aqui, vazio de propósito: o
// deploy sobrescreve o hook antigo em produção.
