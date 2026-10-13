import { expect, test } from 'claude-code/testing'

import { descreverClima, estadoMare, letreiro, montarLinha } from '../hooks/tempo'

const local = { cidade: 'Fortaleza', uf: 'CE', latitude: -3.7, longitude: -38.5 }

test('símbolos do clima em português', () => {
  expect(descreverClima(0, true)).toEqual({ icone: '☀️', texto: 'Ensolarado' })
  expect(descreverClima(63, true).texto).toBe('Chuva')
  expect(descreverClima(73, true).icone).toBe('❄️')
  expect(descreverClima(95, false).texto).toBe('Tempestade')
})

test('maré subindo, com a próxima cheia', () => {
  const mare = { tempos: [0, 3600, 7200, 10800], alturas: [-0.5, 0.5, 1.2, 0.8], offsetSegundos: -10800 }
  const estado = estadoMare(mare, 1800 * 1000)!
  expect(estado.isSubindo).toBe(true)
  expect(estado.altura).toBe(0)
  expect(estado.proxima).toEqual({ isCheia: true, altura: 1.2, hora: '23:00' })
})

test('linha compacta', () => {
  const linha = montarLinha(
    local,
    { temperatura: 29.6, codigo: 2, isDia: true },
    { altura: -0.38, isSubindo: false, proxima: { isCheia: false, altura: -1.02, hora: '14:00' } },
  )
  expect(linha).toBe('📍 Fortaleza-CE  ⛅ 29,6°C  🌊 ↘ −0,38m')
})

test('sem maré longe do mar', () => {
  expect(montarLinha(local, { temperatura: 20, codigo: 61, isDia: true })).toBe('📍 Fortaleza-CE  🌧️ 20,0°C')
})

test('letreiro rola em laço e mantém a largura', () => {
  expect(letreiro('curto', 3, 10)).toBe('curto')
  expect(letreiro('abcdefghij', 0, 4)).toBe('abcd')
  expect(letreiro('abcdefghij', 2, 4)).toBe('cdef')
  expect(letreiro('abcdefghij', 9, 4)).toBe('j   ')
  expect(letreiro('abcdefghij', 17, 4)).toBe('abcd')
  expect(letreiro('ab🌊cdefgh', 1, 4)).toBe('b🌊c')
})
