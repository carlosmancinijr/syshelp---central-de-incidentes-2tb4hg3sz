// 0009 — criticidade (prioridade) definida automaticamente pela categoria.
//
// 1. Adiciona o campo select "criticidade_padrao" na coleção "categorias",
//    com os mesmos valores do campo "prioridade" dos chamados (P1..P5).
// 2. Popula o campo com um valor sensato deduzido do nome de cada categoria
//    já existente: indisponibilidade total / rede / servidor / sistemas = alta
//    (P1..P2), categorias operacionais comuns = média (P3), solicitação /
//    dúvida / periférico = baixa (P4). O admin pode editar depois.
//
// Não altera chamados existentes: o campo só é lido na criação de novos.
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('categorias')
    if (!col.fields.getByName('criticidade_padrao')) {
      col.fields.add(
        new SelectField({
          name: 'criticidade_padrao',
          required: false,
          maxSelect: 1,
          values: ['P1', 'P2', 'P3', 'P4', 'P5'],
        }),
      )
      app.save(col)
    }

    // Mapeamento por categoria (nome exato como está no banco).
    const mapa = {
      // Alta — indisponibilidade total / infraestrutura crítica
      INTERNET: 'P1',
      'LINK MPLS': 'P1',
      REDE: 'P1',
      WIFI: 'P1',
      SERVIDOR: 'P1',
      SISTEMAS: 'P1',
      'E-MAIL': 'P1',
      TELEFONIA: 'P1',
      INTRANET: 'P2',
      SEI: 'P2',
      BACKUP: 'P2',
      ANTIVIRUS: 'P2',
      'CONTA DE USUÁRIO': 'P2',
      ACESSO: 'P2',
      'ACESSO REMOTO': 'P2',
      'CERTIFICADO DIGITAL': 'P2',
      'COMUNICAÇÃO INTERNA': 'P2',
      'G SUITE': 'P2',
      TEAMS: 'P2',
      WINDOWS: 'P2',
      OFFICE: 'P2',
      'SISTEMAS CORPORATIVOS': 'P2',
      'PASTA CORPORATIVA': 'P2',
      SGZ: 'P2',
      SIGPEC: 'P2',
      SIMPROC: 'P2',
      SISACOE: 'P2',
      SOF: 'P2',
      PRAD: 'P2',
      PUBNET: 'P2',
      TID: 'P2',
      'BANCO DO BRASIL': 'P2',
      'RECEITA FEDERAL': 'P2',
      'AUTO ATENDIMENTO': 'P2',
      CABOS: 'P2',
      'SWITCH / HUB': 'P2',
      APLICATIVOS: 'P3',
      IMPRESSORA: 'P3',
      IMPRESSÃO: 'P3',
      SCANNER: 'P3',
      MONITOR: 'P3',
      CPU: 'P3',
      NOTEBOOK: 'P3',
      CELULAR: 'P3',
      'SMARTPHONE / TABLET': 'P3',
      DATASHOW: 'P3',
      ARQUIVOS: 'P3',
      MANUTENÇÃO: 'P3',
      MENSAGEM: 'P3',
      ESTABILIZADOR: 'P3',
      'MUDANÇA / TRANSFERÊNCIA': 'P3',
      INVENTÁRIO: 'P3',
      SERVIÇOS: 'P3',
      DIAGNOSTICO: 'P3',
      REFLECTION: 'P3',
      // Baixa — solicitação, dúvida, cosmético
      'ORIENTAÇÃO TÉCNICA': 'P4',
      'IDENTIDADE VISUAL': 'P4',
      VISTORIA: 'P4',
      'CAIXA DE SOM': 'P4',
      TECLADO: 'P4',
      MOUSE: 'P4',
      'PEN-DRIVE': 'P4',
      'HD EXTERNO': 'P4',
      WEBCAM: 'P4',
    }
    const padrao = 'P3'

    const cats = app.findRecordsByFilter('categorias', '', 'nome', 0, 0)
    for (const c of cats) {
      const nome = c.getString('nome')
      if (c.getString('criticidade_padrao')) continue // não sobrescreve valor já definido
      c.set('criticidade_padrao', mapa[nome] || padrao)
      app.save(c)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('categorias')
    if (col.fields.getByName('criticidade_padrao')) {
      col.fields.removeByName('criticidade_padrao')
      app.save(col)
    }
  },
)
