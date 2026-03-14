# Workflow: Review Component
> Ativar com: `/review-component`
> Uso: `/review-component design-system/atoms/Button/index.tsx`

## Instruções para o Agente

Revise o componente indicado contra as regras do design system.

### Checklist de Revisão

**TypeScript**
- [ ] Sem `any` em APIs públicas
- [ ] Props tipadas com interface explícita
- [ ] Tipos de variante/size como unions claras

**Tokens e Tailwind**
- [ ] Sem cores hex hard-coded no className
- [ ] Sem valores arbitrários de spacing (`px-[17px]`)
- [ ] Radius dentro da escala definida
- [ ] Sombras apenas via tokens

**Atomic Design**
- [ ] Átomo: sem lógica de negócio, sem data-fetching
- [ ] Molécula: composta apenas de átomos existentes
- [ ] Não importa de `components/ui/` (shadcn v1)

**Tipografia**
- [ ] JetBrains Mono em todos os números
- [ ] Inter em texto corpo/títulos

**Acessibilidade**
- [ ] Focus-visible em elementos interativos
- [ ] aria-label em ícones sem texto
- [ ] roles semânticos corretos

**Framer Motion**
- [ ] Sem animações excessivas
- [ ] Presets do `design-system/tokens/motion.ts` utilizados

### Output
Responda com:
1. Lista de issues encontradas (máximo 8 bullets)
2. Status: `✅ APROVADO` ou `⚠️ AJUSTES NECESSÁRIOS`
3. Se houver issues críticas, mostre o trecho corrigido
