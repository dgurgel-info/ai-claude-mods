import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Leitura, Limite } from '../types'

const TURNOS = 12
const BARRAS = '▁▂▃▄▅▆▇█'

const historico = atom({ plugin: 'contexto', key: 'historico' } as const, [] as Leitura[])
const gasto = atom({ plugin: 'contexto', key: 'gasto' } as const, 0)
const limites = atom({ plugin: 'contexto', key: 'limites' } as const, [] as Limite[])

// Emojis de apresentação emoji (Emoji_Presentation=Yes): ocupam sempre duas
// colunas, sem depender do seletor de variação que muda de fonte para fonte.
export function carga(percent: number) {
  if (percent < 25) return { icone: '🟢', palavra: 'Leve', cor: 'green' }
  if (percent < 50) return { icone: '🟡', palavra: 'Moderado', cor: 'yellow' }
  if (percent < 75) return { icone: '🟠', palavra: 'Alto', cor: '#ff8700' }
  if (percent < 90) return { icone: '🔴', palavra: 'Muito Alto', cor: 'red' }
  return { icone: '🚨', palavra: 'Cheio', cor: 'redBright' }
}

export function tokens(n: number) {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/[.,]0$/, '').replace('.', ',')}M`
  if (abs >= 1_000) return `${Math.round(n / 1_000)}k`
  return `${n}`
}

export function barra(percent: number) {
  const i = Math.min(BARRAS.length - 1, Math.max(0, Math.floor((percent / 100) * BARRAS.length)))
  return BARRAS[i]
}

export function variacao(atual: Leitura, anterior: Leitura | undefined) {
  if (!anterior) return null
  const delta = atual.tokens - anterior.tokens
  if (delta < 0) return `${tokens(delta).replace('-', '−')} (compactou)`
  return `+${tokens(delta)} no último turno`
}

/** Medidor de fogo: células cheias proporcionais à cota usada. */
export function fogo(percent: number, celulas = 10) {
  const cheias = Math.min(celulas, Math.max(0, Math.round((percent / 100) * celulas)))
  return '▰'.repeat(cheias) + '▱'.repeat(celulas - cheias)
}

/** Tempo até a cota renovar: "2h13m", "47m" ou "agora". */
export function restante(resetsAt: string | undefined, agora: number) {
  if (!resetsAt) return null
  const min = Math.ceil((Date.parse(resetsAt) - agora) / 60_000)
  if (Number.isNaN(min)) return null
  if (min <= 0) return 'agora'
  if (min < 60) return `${min}m`
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}m`
}

/** Hora local da renovação no mesmo formato do tempo restante: "14h45m". */
export function horaRenovacao(resetsAt: string | undefined) {
  if (!resetsAt) return null
  const t = Date.parse(resetsAt)
  if (Number.isNaN(t)) return null
  const d = new Date(t)
  return `${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}m`
}

export const register: Register = on => {
  // Cota em tempo real: o motor avisa a cada ponto inteiro que a janela anda.
  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) {
      await update($, limites, () => [...e.rateLimits])
    }
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    const { context, rateLimits } = await $.session.usage()

    if (e.usage) {
      const u = e.usage
      const total = u.input_tokens + u.output_tokens + u.cache_creation_input_tokens
      await update($, gasto, anterior => anterior + total)
    }
    if (Array.isArray(rateLimits)) {
      await update($, limites, () => [...rateLimits])
    }

    if (context.tokens !== undefined && context.window > 0) {
      const leitura: Leitura = {
        tokens: context.tokens,
        janela: context.window,
        percent: context.percent ?? Math.round((context.tokens / context.window) * 100),
      }
      await update($, historico, anterior => [...anterior, leitura].slice(-(TURNOS + 1)))
    }

    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const hist = await read($, historico)
    const total = await read($, gasto)
    const janelas = await read($, limites)
    const atual = hist[hist.length - 1]
    const cinco = janelas.find(j => j.kind === 'five_hour')

    if (e.props.hasSurvey || (!atual && !cinco)) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)
    const c = atual ? carga(atual.percent) : null
    const ultimos = hist.slice(-TURNOS)
    const delta = atual ? variacao(atual, hist[hist.length - 2]) : null
    const f = cinco ? carga(cinco.percentUsed) : null
    const volta = restante(cinco?.resetsAt, await $.clock.now())
    const horario = horaRenovacao(cinco?.resetsAt)

    return (
      <Box flexDirection="column">
        {atual && c && (
          <Box>
            <Text>{c.icone} {c.palavra}: {atual.percent}%</Text>
            <Text> {tokens(atual.tokens)}/{tokens(atual.janela)}</Text>
            <Text> </Text>
            {ultimos.map((l, i) => (
              <Text key={`b${i}`} color={carga(l.percent).cor}>
                {barra(l.percent)}
              </Text>
            ))}
            {delta && <Text> {delta}</Text>}
          </Box>
        )}
        <Box flexWrap="nowrap">
          <Text wrap="truncate">
            <Text>🔥 Sessão: {tokens(total)} tokens</Text>
            {cinco && f && <Text>  5h </Text>}
            {cinco && f && <Text color={f.cor}>{fogo(cinco.percentUsed)}</Text>}
            {cinco && f && <Text> {Math.round(cinco.percentUsed)}%</Text>}
            {cinco && volta && <Text>  🕐 Renova: {volta}{horario && ` (${horario})`}</Text>}
          </Text>
        </Box>
      </Box>
    )
  })
}
