# Contexto — mod para Claude Code

Mostra a carga da janela de contexto e o consumo da cota de 5 horas numa linha acima do prompt.

## Como aparece no Claude Code

```
🟡 Moderado: 38%  76k/200k ▁▂▂▃▃▄▄▅  +6k no último turno
🔥 Sessão: 142k tokens  5h ▰▰▰▱▱▱▱▱▱▱ 32%  🕐 Renova: 2h13m
                                                                  
╭──────────────────────────────────────────────────────────────╮
│ >                                                            │
╰──────────────────────────────────────────────────────────────╯
```

> Representação em texto. Para trocar por um print real, salve a imagem em
> `docs/screenshot.png` e adicione `![Contexto](docs/screenshot.png)` aqui.

## O que cada linha mostra

**Linha 1 — janela de contexto**

| Elemento | Significado |
| --- | --- |
| `🟡 Moderado: 38%` | Nível de carga e percentual usado |
| `76k/200k` | Tokens em uso / tamanho da janela |
| `▁▂▃▄▅` | Histórico dos últimos 12 turnos, colorido por nível |
| `+6k no último turno` | Variação desde o turno anterior (`(compactou)` se o contexto diminuiu) |

Níveis: 🟢 Leve (<25%) · 🟡 Moderado (<50%) · 🟠 Alto (<75%) · 🔴 Muito Alto (<90%) · 🚨 Cheio (≥90%).

**Linha 2 — sessão e cota**

- `🔥 Sessão` — total de tokens consumidos na sessão.
- `5h ▰▰▰▱▱▱▱▱▱▱ 32%` — cota usada na janela de 5 horas.
- `🕐 Renova` — tempo até a cota renovar.

A linha some enquanto uma pesquisa (survey) estiver aberta ou antes da primeira leitura.

## Instalação

```
/plugin marketplace add dgurgel-info/ai-claude-mods
/plugin install contexto@ai-claude-mods
```

(ou, localmente, `/plugin marketplace add ./claude-mods-contexto`)

## Estrutura

```
.claude-plugin/   plugin.json e marketplace.json
hooks/            hooks.json, register.tsx (mod) e register.test.ts
types/            tipos Leitura e Limite
```
