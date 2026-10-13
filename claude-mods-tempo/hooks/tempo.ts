export type Local = { cidade: string; uf?: string; latitude: number; longitude: number }

export type Clima = { temperatura: number; codigo: number; isDia: boolean }

export type Mare = {
  tempos: number[]
  alturas: (number | null)[]
  offsetSegundos: number
}

export type EstadoMare = {
  altura: number
  isSubindo: boolean
  proxima?: { isCheia: boolean; altura: number; hora: string }
}

// Códigos WMO usados pela Open-Meteo.
export const descreverClima = (codigo: number, isDia: boolean): { icone: string; texto: string } => {
  if (codigo >= 95) return { icone: '⛈️', texto: 'Tempestade' }
  if ((codigo >= 71 && codigo <= 77) || codigo === 85 || codigo === 86) return { icone: '❄️', texto: 'Neve' }
  if (codigo >= 80) return { icone: '🌦️', texto: 'Pancadas de chuva' }
  if (codigo >= 61) return { icone: '🌧️', texto: 'Chuva' }
  if (codigo >= 51) return { icone: '🌦️', texto: 'Garoa' }
  if (codigo === 45 || codigo === 48) return { icone: '🌫️', texto: 'Neblina' }
  if (codigo === 3) return { icone: '☁️', texto: 'Nublado' }
  if (codigo === 2) return { icone: isDia ? '⛅' : '☁️', texto: 'Parcialmente nublado' }
  if (codigo === 1) return { icone: isDia ? '🌤️' : '🌙', texto: isDia ? 'Predomínio de sol' : 'Céu quase limpo' }
  return { icone: isDia ? '☀️' : '🌙', texto: isDia ? 'Ensolarado' : 'Céu limpo' }
}

const numero = (valor: number, casas: number) =>
  valor.toFixed(casas).replace('.', ',').replace(/^-/, '−')

const hora = (epochSegundos: number, offsetSegundos: number) => {
  const d = new Date((epochSegundos + offsetSegundos) * 1000)
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

// Altura atual (interpolada entre as horas), tendência e próximo extremo.
export const estadoMare = (mare: Mare, agoraMs: number): EstadoMare | undefined => {
  const agora = agoraMs / 1000
  const { tempos, alturas } = mare
  const i = tempos.findIndex((t, k) => t <= agora && agora < (tempos[k + 1] ?? -Infinity))
  if (i < 0) return undefined

  const a = alturas[i]
  const b = alturas[i + 1]
  if (a == null || b == null) return undefined

  const fracao = (agora - tempos[i]) / (tempos[i + 1] - tempos[i])
  const altura = a + (b - a) * fracao
  const isSubindo = b > a

  for (let k = i + 1; k < tempos.length - 1; k++) {
    const atual = alturas[k]
    const seguinte = alturas[k + 1]
    if (atual == null || seguinte == null) break
    const isVirada = isSubindo ? seguinte < atual : seguinte > atual
    if (isVirada) {
      return {
        altura,
        isSubindo,
        proxima: { isCheia: isSubindo, altura: atual, hora: hora(tempos[k], mare.offsetSegundos) },
      }
    }
  }

  return { altura, isSubindo }
}

export const montarLinha = (local: Local, clima?: Clima, mare?: EstadoMare): string => {
  const partes = [`📍 ${local.uf ? `${local.cidade}-${local.uf}` : local.cidade}`]

  if (clima) {
    const { icone } = descreverClima(clima.codigo, clima.isDia)
    partes.push(`${icone} ${numero(clima.temperatura, 1)}°C`)
  }

  if (mare) {
    partes.push(`🌊 ${mare.isSubindo ? '↗' : '↘'} ${numero(mare.altura, 2)}m`)
  }

  return partes.join('  ')
}

// Cada glifo com sua largura em colunas; seletores de variação ficam no glifo anterior.
const glifos = (texto: string): { glifo: string; largura: number }[] => {
  const lista: { glifo: string; largura: number }[] = []
  for (const ch of Array.from(texto)) {
    const cp = ch.codePointAt(0)!
    const ultimo = lista[lista.length - 1]
    if ((cp === 0xfe0f || cp === 0x200d) && ultimo) {
      ultimo.glifo += ch
      if (cp === 0xfe0f) ultimo.largura = 2
      continue
    }
    lista.push({ glifo: ch, largura: cp >= 0x1f000 || cp === 0x26c5 ? 2 : 1 })
  }
  return lista
}

const SEPARADOR = '   •   '

// Janela de `largura` colunas sobre o texto em laço, deslocada `passo` glifos.
export const letreiro = (texto: string, passo: number, largura: number): string => {
  const base = glifos(texto)
  const total = base.reduce((soma, g) => soma + g.largura, 0)
  if (total <= largura) return texto

  const laco = glifos(texto + SEPARADOR)
  let janela = ''
  let usado = 0
  for (let k = 0; usado < largura; k++) {
    const g = laco[(passo + k) % laco.length]
    if (usado + g.largura > largura) break
    janela += g.glifo
    usado += g.largura
  }
  return janela + ' '.repeat(largura - usado)
}
