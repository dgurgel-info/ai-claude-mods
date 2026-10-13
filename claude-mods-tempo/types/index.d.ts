export type Linha = string

declare module 'claude-code' {
  interface PluginState {
    tempo: { linha: Linha; passo: number }
  }
}
