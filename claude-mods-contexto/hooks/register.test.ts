import { describe, expect, test } from 'claude-code/testing'

import { barra, carga, fogo, restante, tokens, variacao } from './register'

describe('carga', () => {
  test('faixas', () => {
    expect(carga(0).palavra).toBe('Leve')
    expect(carga(24).palavra).toBe('Leve')
    expect(carga(25).palavra).toBe('Moderado')
    expect(carga(49).cor).toBe('yellow')
    expect(carga(50).palavra).toBe('Alto')
    expect(carga(74).cor).toBe('#ff8700')
    expect(carga(75).palavra).toBe('Muito Alto')
    expect(carga(89).cor).toBe('red')
    expect(carga(90).palavra).toBe('Cheio')
    expect(carga(100).cor).toBe('redBright')
  })

  test('tokens e barras', () => {
    expect(tokens(134_000)).toBe('134k')
    expect(tokens(1_000_000)).toBe('1M')
    expect(barra(0)).toBe('▁')
    expect(barra(100)).toBe('█')
    expect(variacao({ tokens: 134_000, janela: 200_000, percent: 67 }, { tokens: 36_000, janela: 200_000, percent: 18 }))
      .toBe('+98k no último turno')
  })
})

describe('medidor de fogo', () => {
  test('barra e contagem regressiva', () => {
    expect(fogo(0)).toBe('▱▱▱▱▱▱▱▱▱▱')
    expect(fogo(34)).toBe('▰▰▰▱▱▱▱▱▱▱')
    expect(fogo(100)).toBe('▰▰▰▰▰▰▰▰▰▰')
    const agora = Date.parse('2026-01-01T10:00:00Z')
    expect(restante('2026-01-01T12:13:00Z', agora)).toBe('2h13m')
    expect(restante('2026-01-01T10:47:00Z', agora)).toBe('47m')
    expect(restante('2026-01-01T09:00:00Z', agora)).toBe('agora')
    expect(restante(undefined, agora)).toBeNull()
  })
})

for (const surface of ['terminal', 'desktop'] as const) {
  test(`linha acima do prompt (${surface})`, async ($, on) => {
    let usados = 36_000
    on('ui.render', () => null as never)
    on('clock.now', () => ({ value: Date.parse('2026-01-01T00:00:00Z') }) as never)
    on('session.usage', () => ({ value: {
      startedAt: 0,
      context: { tokens: usados, window: 200_000, percent: Math.round((usados / 200_000) * 100) },
      rateLimits: [{ kind: 'five_hour', percentUsed: 34, resetsAt: '2026-01-01T02:13:00Z' }],
      cost: { usd: 0 },
    } }) as never)

    on('turn.complete', () => ({ text: '' }) as never)
    const fim = {
      answer: '', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer',
      usage: { model: 'm', input_tokens: 1000, output_tokens: 500, cache_read_input_tokens: 99_000, cache_creation_input_tokens: 500 },
    } as never
    await $.turn.complete(fim)
    usados = 134_000
    await $.turn.complete(fim)

    const ui = await $.ui.mount({
      plugin: 'contexto',
      surface,
      component: 'AbovePrompt',
      props: { hasSurvey: false, isWorking: false } as never,
    })
    const texto = (await ui.find({ type: 'Box' }))?.text ?? ''
    expect(texto).toContain('🟠 Alto: 67%')
    expect(texto).toContain('67%')
    expect(texto).toContain('134k/200k')
    expect(texto).toContain('▂▆')
    expect(texto).toContain('+98k no último turno')
    expect(texto).toContain('Sessão: 4k tokens')
    expect(texto).toContain('▰▰▰▱▱▱▱▱▱▱')
    expect(texto).toContain('34%')
    expect(texto).toContain('Renova: 2h13m')
  })
}
