# Workflow: Build Atom
> Ativar com: `/build-atom`
> Uso: `/build-atom Button` ou `/build-atom Badge` ou `/build-atom Card`

## Instruções para o Agente

Você vai construir um componente atômico do design system. Siga os passos abaixo na ordem.

### Passo 1 — Leitura obrigatória
Leia os arquivos de contexto antes de gerar qualquer código:
- `@design-system/CONTEXT.md`
- `@design-system/tokens/colors.ts`
- `@design-system/tokens/spacing.ts`
- `@design-system/tokens/motion.ts`
- `@design-system/utils/cn.ts`

### Passo 2 — Verificar se o átomo já existe
Verifique se já existe um arquivo em `design-system/atoms/{ComponentName}/index.tsx`.
Se sim, pergunte ao usuário se quer refatorar ou criar variante.

### Passo 3 — Gerar o componente
Crie o arquivo em `design-system/atoms/{ComponentName}/index.tsx` com:
- Interface de props completa e tipada (sem `any`)
- Componente funcional com export named
- Uso exclusivo dos tokens do design system
- Micro-animações Framer Motion onde apropriado
- Focus-visible para acessibilidade
- JetBrains Mono se o componente exibir números

### Passo 4 — Criar barrel export
Crie ou atualize `design-system/atoms/index.ts` para re-exportar o novo componente:
```typescript
export { ComponentName } from './ComponentName'
```

### Passo 5 — Reportar
Mostre ao usuário:
- Arquivo criado: `design-system/atoms/{ComponentName}/index.tsx`
- Props disponíveis (tabela: nome, tipo, default, descrição)
- Exemplo de uso em JSX

## Regra Final
Gere apenas código que funciona com o stack atual. Sem comentários desnecessários, sem explicações fora do código, sem libs externas.
