// Gera senhas provisórias legíveis e não determinísticas: palavra + números + palavra.
// Ex.: "Girassol-4827" (13 caracteres), atende o mínimo de 8 caracteres da coleção users.
const PALAVRAS = [
  'Girassol',
  'Cajueiro',
  'Montanha',
  'Janela',
  'Oceano',
  'Caravela',
  'Esperança',
  'Horizonte',
  'Pinheiro',
  'Relâmpago',
  'Serrado',
  'Tucano',
]

function aleatorio(n: number): number {
  const v = new Uint32Array(1)
  crypto.getRandomValues(v)
  return v[0] % n
}

export function gerarSenhaProvisoria(): string {
  const palavra = PALAVRAS[aleatorio(PALAVRAS.length)]
  const numero = String(1000 + aleatorio(9000))
  return `${palavra}-${numero}`
}
