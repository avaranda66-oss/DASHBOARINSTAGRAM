import { NextRequest, NextResponse } from 'next/server';
import { generateAIContent } from '@/lib/services/ai-adapter';

export async function POST(req: NextRequest) {
    try {
        const { context } = await req.json();

        const prompt = `Você é um especialista em Facebook Ads e marketing digital. Analise os seguintes dados de campanhas e forneça insights acionáveis em português brasileiro.

## Dados das Campanhas

- Gasto total: R$ ${context.totalSpend?.toFixed(2) || '0'}
- Total de impressões: ${context.totalImpressions || 0}
- Total de cliques: ${context.totalClicks || 0}
- CTR médio: ${context.avgCtr?.toFixed(2) || '0'}%
- CPC médio: R$ ${context.avgCpc?.toFixed(2) || '0'}
- ROAS: ${context.roas?.toFixed(2) || '0'}x
- Frequência média: ${context.frequency?.toFixed(1) || '0'}
- Campanhas ativas: ${context.activeCampaigns || 0}

## Campanhas Individuais
${(context.campaigns || []).map((c: any) => `- ${c.name} (${c.status}) | Objetivo: ${c.objective} | Gasto: R$${c.spend || '0'} | Impressões: ${c.impressions || '0'} | Cliques: ${c.clicks || '0'} | CTR: ${c.ctr || '0'}% | CPC: R$${c.cpc || '0'}`).join('\n')}

## Sua Análise Deve Incluir:

1. **Diagnóstico Geral**: Status de saúde das campanhas (1-2 frases)
2. **Top Performer**: Qual campanha está melhor e por quê
3. **Campanhas Problemáticas**: Quais precisam de atenção imediata
4. **Otimização de Budget**: Como redistribuir a verba para melhorar resultados
5. **Próximos Passos**: 3 ações concretas que o anunciante deveria tomar HOJE
6. **Alerta de Riscos**: Qualquer sinal de alerta (fadiga de audiência, CPC alto, etc)

Seja direto, use linguagem clara e forneça números específicos. Não use introduções genéricas.`;

        const analysis = await generateAIContent(prompt);

        return NextResponse.json({ success: true, analysis });
    } catch (e: any) {
        console.error('[ads-ai-analysis] Erro:', e);
        return NextResponse.json(
            { success: false, error: e.message || 'Erro ao gerar análise IA.' },
            { status: 500 },
        );
    }
}
