# Workflow: Build Molecule
> Ativar com: `/build-molecule`
> Uso: `/build-molecule KpiCard` ou `/build-molecule FormField`

## Instruções para o Agente

Moléculas são compostas EXCLUSIVAMENTE de átomos existentes. Nunca crie estilo novo em uma molécula.

### Passo 1 — Leitura obrigatória
- `@design-system/CONTEXT.md`
- `@design-system/atoms/index.ts` (átomos disponíveis)
- `@design-system/tokens/colors.ts`

### Passo 2 — Listar átomos que serão usados
Antes de gerar, liste quais átomos do `design-system/atoms/` serão compostos.
Se algum átomo necessário não existir, pare e diga ao usuário qual átomo precisa ser criado primeiro com `/build-atom`.

### Passo 3 — Gerar a molécula
Crie `design-system/molecules/{ComponentName}/index.tsx` compondo apenas átomos existentes.
A molécula só pode adicionar: layout (flex, grid, gap), composição e lógica de estado visual.

### Passo 4 — Barrel export
Atualize `design-system/molecules/index.ts` com o novo export.

### Passo 5 — Reportar
Mostre ao usuário os átomos utilizados e o exemplo de uso.
