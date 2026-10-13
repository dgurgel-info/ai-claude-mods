/** Uma leitura da janela de contexto ao fim de um turno. */
export type Leitura = { tokens: number; janela: number; percent: number }

/** Uma janela de cota, como `$.session.usage()` a entrega. */
export type Limite = { kind: string; percentUsed: number; resetsAt?: string }

declare module 'claude-code' {
  interface PluginState {
    contexto: {
      historico: Leitura[]
      /** Tokens gastos na sessão (entrada + saída + escrita de cache). */
      gasto: number
      /** Janelas de cota (`five_hour`, `seven_day`...) da última leitura. */
      limites: Limite[]
    }
  }
}
