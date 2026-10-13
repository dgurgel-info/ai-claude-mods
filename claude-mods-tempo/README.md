# Tempo — mod para Claude Code

Mostra a previsão do tempo e a tábua da maré da sua localidade, em português, num letreiro rolante junto ao prompt.

## Como aparece no Claude Code

```
? for shortcuts            ⛅ Parcialmente nublado 24°C · Santos/SP · 🌊 maré subindo 1,2 m ▲ cheia 14:32
```

> Representação em texto. Para um print real, salve em `docs/screenshot.png` e adicione `![Tempo](docs/screenshot.png)`.

## Como funciona

- Descobre a cidade pelo IP (`ipwho.is`, com `get.geojs.io` de reserva).
- Clima atual via Open-Meteo, atualizado a cada 15 min.
- Maré via Open-Meteo Marine; some sozinha se você estiver longe do mar.
- A linha é redesenhada a cada minuto e rola como um letreiro.

## Instalação

```
/plugin marketplace add dgurgel-info/ai-claude-mods
/plugin install tempo@ai-claude-mods
```

## Estrutura

```
.claude-plugin/   plugin.json e marketplace.json
hooks/            hooks.json, register.ts (mod) e tempo.ts (lógica)
tests/            tempo.test.ts
types/            tipos
```
