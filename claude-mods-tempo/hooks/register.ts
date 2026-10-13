import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { estadoMare, letreiro, montarLinha } from './tempo'
import type { Clima, Local, Mare } from './tempo'

const ATUALIZAR_DADOS_MS = 15 * 60 * 1000
const ATUALIZAR_LINHA_MS = 60 * 1000
const ROLAR_MS = 350
const LARGURA = 30

const linha = atom({ plugin: 'tempo', key: 'linha' } as const, '')
const passo = atom({ plugin: 'tempo', key: 'passo' } as const, 0)

const json = async ($: EngineInterface, url: string): Promise<any> => {
  const resposta = await $.http.fetch(url)
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status} em ${url}`)
  return JSON.parse(resposta.text)
}

// Siglas dos estados, para o serviço reserva que só dá o nome por extenso.
const UFS: Record<string, string> = {
  acre: 'AC', alagoas: 'AL', amapa: 'AP', amazonas: 'AM', bahia: 'BA', ceara: 'CE',
  'distrito federal': 'DF', 'espirito santo': 'ES', goias: 'GO', maranhao: 'MA',
  'mato grosso': 'MT', 'mato grosso do sul': 'MS', 'minas gerais': 'MG', para: 'PA',
  paraiba: 'PB', parana: 'PR', pernambuco: 'PE', piaui: 'PI', 'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN', 'rio grande do sul': 'RS', rondonia: 'RO', roraima: 'RR',
  'santa catarina': 'SC', 'sao paulo': 'SP', sergipe: 'SE', tocantins: 'TO',
}

const sigla = (estado?: string) =>
  estado ? UFS[estado.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()] : undefined

const buscarLocal = async ($: EngineInterface): Promise<Local> => {
  try {
    const d = await json($, 'https://ipwho.is/')
    if (d.success) return { cidade: d.city, uf: d.region_code || sigla(d.region), latitude: d.latitude, longitude: d.longitude }
  } catch {}
  const d = await json($, 'https://get.geojs.io/v1/ip/geo.json')
  return { cidade: d.city, uf: sigla(d.region), latitude: Number(d.latitude), longitude: Number(d.longitude) }
}

const buscarClima = async ($: EngineInterface, local: Local): Promise<Clima> => {
  const d = await json(
    $,
    `https://api.open-meteo.com/v1/forecast?latitude=${local.latitude}&longitude=${local.longitude}` +
      '&current=temperature_2m,weather_code,is_day&timezone=auto',
  )
  return { temperatura: d.current.temperature_2m, codigo: d.current.weather_code, isDia: d.current.is_day === 1 }
}

const buscarMare = async ($: EngineInterface, local: Local): Promise<Mare | undefined> => {
  const d = await json(
    $,
    `https://marine-api.open-meteo.com/v1/marine?latitude=${local.latitude}&longitude=${local.longitude}` +
      '&hourly=sea_level_height_msl&timeformat=unixtime&timezone=auto&past_days=1&forecast_days=2&cell_selection=sea',
  )
  // Longe do mar (o ponto de grade fica muito distante, ou não há dados): sem maré.
  const isLonge = Math.abs(d.latitude - local.latitude) > 1 || Math.abs(d.longitude - local.longitude) > 1
  const alturas: (number | null)[] = d.hourly?.sea_level_height_msl ?? []
  if (isLonge || alturas.every(a => a == null)) return undefined
  return { tempos: d.hourly.time, alturas, offsetSegundos: d.utc_offset_seconds }
}

let local: Local | undefined
let clima: Clima | undefined
let mare: Mare | undefined

const desenhar = async ($: EngineInterface) => {
  if (!local) return
  const agora = await $.clock.now()
  const texto = montarLinha(local, clima, mare && estadoMare(mare, agora))
  await update($, linha, () => texto)
}

const atualizar = async ($: EngineInterface) => {
  try {
    local ??= await buscarLocal($)
    const [c, m] = await Promise.allSettled([buscarClima($, local), buscarMare($, local)])
    if (c.status === 'fulfilled') clima = c.value
    if (m.status === 'fulfilled') mare = m.value
    await desenhar($)
  } catch {}
}

const rolar = ($: EngineInterface) => update($, passo, n => n + 1)

export const register: Register = on => {
  on('session.start', ($, e, next) => {
    $.clock.after(1, () => void atualizar($))
    $.clock.every(ATUALIZAR_DADOS_MS, () => void atualizar($))
    $.clock.every(ATUALIZAR_LINHA_MS, () => void desenhar($))
    $.clock.every(ROLAR_MS, () => void rolar($))
    return next(e)
  })

  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const texto = await read($, linha)
    if (!texto) return next(e)
    const tail = letreiro(texto, await read($, passo), LARGURA)
    return next({ ...e, props: { ...e.props, tail } })
  })
}
