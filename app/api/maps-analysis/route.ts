import { NextRequest, NextResponse } from 'next/server';
import { resolveAIConfig, generateAIContentWithSystem } from '@/lib/services/ai-adapter';

const SYSTEM_PROMPT = `
Você é um Especialista em Marketing e Reputação Digital focado em Inteligência Competitiva de Negócios Locais no Google Maps.
Seu objetivo é analisar os comentários (reviews) recentes de um negócio e gerar um relatório estruturado em formato JSON contendo insights críticos e estratégias acionáveis.

A análise deve identificar com clareza a percepção do público através destes pontos:
- Qualidade do produto/serviço.
- Experiência no atendimento.
- Atmosfera e estrutura física.

Os dados de entrada serão um array de objetos JSON contendo: autor, data, nota (stars) e texto do comentário.

VOCÊ DEVE RETORNAR ESTRITAMENTE O SEGUINTE JSON (sem formatação markdown como \`\`\`json):
{
  "summary": "Um parágrafo resumindo a percepção geral dos clientes sobre o negócio baseando-se nos reviews mais frequentes.",
  "sentimentScore": {
    "positive": 85, // Porcentagem de sentimento positivo
    "neutral": 5, // Porcentagem de sentimento neutro
    "negative": 10 // Porcentagem de sentimento negativo
  },
  "positiveHighlights": [
    "Ponto forte recorrente 1 (ex: Comida muito bem temperada)",
    "Ponto forte recorrente 2 (ex: Atendimento rápido e cordial)"
  ],
  "negativeHighlights": [
    "Ponto fraco recorrente 1 (ex: Tempo de espera elevado aos finais de semana)",
    "Ponto fraco recorrente 2 (ex: Acústica do local causa muito barulho)"
  ],
  "recommendations": [
    "Recomendação acionável 1 para melhorar a operação ou marketing",
    "Recomendação acionável 2"
  ]
}
`;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { businessName, reviews } = body;

        if (!businessName || !reviews || !Array.isArray(reviews)) {
            return NextResponse.json({ success: false, error: 'Parâmetros inválidos. Necessário businessName e reviews (array).' }, { status: 400 });
        }

        if (reviews.length === 0) {
            return NextResponse.json({ success: false, error: 'O negócio não possui reviews para análise.' }, { status: 400 });
        }

        // Resolvendo configuração da IA (Gemini ou OpenRouter salvos no banco)
        const cfg = await resolveAIConfig();

        const maxReviews = reviews.slice(0, 30); // Limite por contexto
        
        const promptText = `
Negócio: ${businessName}
Reviews a analisar (${maxReviews.length} mais recentes):
${JSON.stringify(maxReviews, null, 2)}
        `.trim();

        const responseText = await generateAIContentWithSystem(promptText, {
            systemPrompt: SYSTEM_PROMPT,
            jsonMode: true,
            temperature: 0.3 // Baixa temperatura para manter formato JSON consistente
        }, cfg);

        const parsedResult = JSON.parse(responseText);

        return NextResponse.json({
            success: true,
            data: parsedResult,
        });
    } catch (error: any) {
        console.error('[API maps-analysis] Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
