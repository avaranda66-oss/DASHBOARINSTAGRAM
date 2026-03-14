# Workflow: Build Brandbook Page
> Ativar com: `/build-brandbook-page`
> Uso: `/build-brandbook-page foundations` ou `/build-brandbook-page components`

## Instruções para o Agente

Você vai construir uma página do brandbook do design system.
O brandbook fica em `app/brandbook/` e documenta visualmente o design system.

### Passo 1 — Leitura obrigatória
- `@design-system/CONTEXT.md`
- `@design-system/DESIGN-SYSTEM.md`
- `@app/brandbook/layout.tsx` (se existir)

### Passo 2 — Identidade da página
Cada página do brandbook segue a identidade "Apple Clean + Psychedelic Math":
- Fundo: #000000 (preto absoluto)
- Labels numerados estilo: [00], [01], [02]...
- Tipografia display: Inter bold, tracking tight, tamanhos grandes
- Acento primário: #A855F7 (neon purple)
- Gradientes apenas em elementos de destaque (cosmos, aurora, etc.)
- Fonte mono (JetBrains Mono) em todos os tokens e código exibido

### Passo 3 — Estrutura da página
```
app/brandbook/{slug}/page.tsx
```
Cada página tem:
- Header com número [0X] + título em display grande
- Seções separadas por linha divisória border-[#262626]
- Footer com link para próxima página

### Passo 4 — Reportar
Arquivo criado + screenshot via browser tool se disponível.
