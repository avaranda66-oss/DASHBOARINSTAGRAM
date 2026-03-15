'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
// Lucide icons removed for ASCII HUD alignment
import type { InstagramPostMetrics, MetaPostMetrics } from '@/types/analytics';
import {
    reciprocityIndex, socialProofScore, brandEquityScore,
    contentMixScore, contentVelocityScore, paretoAnalysis,
    contentROIScore, investmentDepthScore, variableRewardScore,
    hookQualityScore, contentIdentityScore, persuasionTriggerCount,
    linearTrend, descriptiveStats, postingConsistencyIndex,
} from '@/lib/utils/statistics';
import { detectBuyingIntent, detectUrgencyTriggers, sensoryLanguageScore } from '@/lib/utils/sentiment';
import { InfoTooltip } from './post-detail-card';

interface IntelligencePanelProps {
    posts: InstagramPostMetrics[];
    isMeta?: boolean;
}

function ScoreGauge({ score, label, color }: { score: number; label: string; color: string }) {
    return (
        <div className="text-center">
            <div className="relative w-14 h-14 mx-auto">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-zinc-800" />
                    <circle
                        cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3"
                        className={color}
                        strokeDasharray={`${score * 0.88} 88`}
                        strokeLinecap="round"
                    />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-zinc-200">
                    {score}
                </span>
            </div>
            <p className="text-[9px] text-zinc-500 mt-1 leading-tight">{label}</p>
        </div>
    );
}

function CategoryHeader({ title, expert, color, tip, glyph = '◎' }: { title: string; expert: string; color: string; tip?: string; glyph?: string }) {
    return (
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/[0.04]">
            <span className="font-mono text-xs" style={{ color }}>{glyph}</span>
            <span className="text-xs font-semibold text-zinc-200">{title}</span>
            {tip && <InfoTooltip text={tip} />}
            <span className="text-[9px] px-1.5 py-0.5 rounded-full ml-auto" style={{ background: color + '15', color }}>{expert}</span>
        </div>
    );
}

function MetricItem({ label, value, sub, color, tip }: { label: string; value: string | number; sub?: string; color?: string; tip?: string }) {
    return (
        <div className="flex items-baseline justify-between py-1">
            <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                {label}
                {tip && <InfoTooltip text={tip} />}
            </span>
            <div className="text-right">
                <span className="text-sm font-mono font-bold" style={{ color: color ?? 'var(--v2-text-primary, #e4e4e7)' }}>{value}</span>
                {sub && <p className="text-[9px] text-zinc-600">{sub}</p>}
            </div>
        </div>
    );
}

export function IntelligencePanel({ posts, isMeta = false }: IntelligencePanelProps) {
    const analysis = useMemo(() => {
        if (posts.length < 3) return null;

        const engValues = posts.map(p => p.likesCount + p.commentsCount);

        // === 1. Performance de Valor (Hormozi) ===
        const contentROI = contentROIScore(
            posts.map(p => ({ type: p.type, engagement: p.likesCount + p.commentsCount }))
        );

        const allComments = posts.flatMap(p =>
            (p.latestComments ?? []).filter(c => c.ownerUsername !== p.ownerUsername).map(c => ({
                id: c.id, text: c.text, ownerUsername: c.ownerUsername,
            }))
        );
        const buyingIntent = detectBuyingIntent(allComments);

        // Value Per Follower (Meta only) — saves+shares total
        let valuePerFollower: number | null = null;
        if (isMeta) {
            const totalSaves = posts.reduce((s, p) => s + ((p as MetaPostMetrics).saved ?? 0), 0);
            const totalShares = posts.reduce((s, p) => s + ((p as MetaPostMetrics).shares ?? 0), 0);
            const totalEng = posts.reduce((s, p) => s + p.likesCount + p.commentsCount, 0);
            if (totalEng > 0) {
                valuePerFollower = Math.round(((totalSaves + totalShares) / totalEng) * 10000) / 100;
            }
        }

        // === 2. Influência & Persuasão (Cialdini) ===
        const reciprocity = reciprocityIndex(posts);

        const proofPosts = isMeta ? posts.map(p => {
            const mp = p as MetaPostMetrics;
            return { likes: p.likesCount, comments: p.commentsCount, saves: mp.saved ?? 0, shares: mp.shares ?? 0 };
        }) : null;
        const socialProof = proofPosts ? socialProofScore(proofPosts) : null;

        let totalPersuasion = 0;
        let persuasionPosts = 0;
        for (const post of posts) {
            const result = persuasionTriggerCount(post.caption ?? '');
            if (result.hasPersuasion) {
                persuasionPosts++;
                totalPersuasion += result.total;
            }
        }

        // === 3. Hook & Retenção (Nir Eyal) ===
        const engStats = descriptiveStats(engValues);
        const variableReward = variableRewardScore(engValues);
        const investmentDepth = investmentDepthScore(posts);

        // === 4. Awareness & Copy (Schwartz) ===
        const hookQuality = hookQualityScore(
            posts.map(p => ({ caption: p.caption ?? '', engagement: p.likesCount + p.commentsCount }))
        );

        let sensoryTotal = 0;
        let sensoryPosts = 0;
        for (const post of posts) {
            const result = sensoryLanguageScore(post.caption ?? '');
            if (result.count > 0) {
                sensoryPosts++;
                sensoryTotal += result.score;
            }
        }
        const avgSensoryScore = sensoryPosts > 0 ? Math.round(sensoryTotal / sensoryPosts) : 0;

        // === 5. Marca & Identidade (Lindstrom) ===
        const brandEquity = brandEquityScore(
            posts.map(p => ({ hashtags: p.hashtags ?? [], engagement: p.likesCount + p.commentsCount }))
        );
        const contentIdentity = contentIdentityScore(posts);
        const consistency = postingConsistencyIndex(posts);

        // === 6. Momentum & Crescimento (Brunson) ===
        const velocity = contentVelocityScore(
            posts.filter(p => p.timestamp).map(p => ({ timestamp: p.timestamp, engagement: p.likesCount + p.commentsCount }))
        );
        const pareto = paretoAnalysis(
            posts.map(p => ({ id: p.id, engagement: p.likesCount + p.commentsCount }))
        );
        const trend = linearTrend(engValues);

        // Urgency count
        let urgencyCount = 0;
        let urgencyPosts = 0;
        for (const post of posts) {
            const result = detectUrgencyTriggers(post.caption ?? '');
            if (result.hasUrgency) {
                urgencyPosts++;
                urgencyCount += result.count;
            }
        }

        return {
            // Hormozi
            contentROI, buyingIntent, valuePerFollower,
            // Cialdini
            reciprocity, socialProof, totalPersuasion, persuasionPosts,
            // Eyal
            variableReward, investmentDepth, engagementCV: engStats.cv,
            // Schwartz
            hookQuality, avgSensoryScore, sensoryPosts,
            // Lindstrom
            brandEquity, contentIdentity, consistency,
            // Brunson
            velocity, pareto, trend,
            // Extra
            urgencyCount, urgencyPosts,
        };
    }, [posts, isMeta]);

    if (!analysis) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 backdrop-blur-md p-5"
        >
            <div className="flex items-center gap-2 mb-5">
                <span className="font-mono text-xs text-violet-400">◎</span>
                <h3 className="text-sm font-semibold text-zinc-200">Painel de Inteligência</h3>
                <span className="text-[9px] text-zinc-600 ml-auto">6 frameworks · {posts.length} posts</span>
            </div>

            {/* Score Gauges Row */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
                <ScoreGauge score={analysis.contentROI.score} label="Content ROI" color="text-emerald-400" />
                <ScoreGauge score={analysis.variableReward.score} label="Hook Model" color="text-sky-400" />
                <ScoreGauge score={analysis.brandEquity.score} label="Brand Equity" color="text-violet-400" />
                <ScoreGauge score={analysis.hookQuality.score} label="Hook Quality" color="text-amber-400" />
                <ScoreGauge score={analysis.velocity.score} label="Momentum" color="text-rose-400" />
                <ScoreGauge score={analysis.contentIdentity.score} label="Identidade" color="text-cyan-400" />
            </div>

            {/* 6 Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                {/* 1. Performance de Valor (Hormozi) */}
                <div className="p-3 rounded-xl border border-white/[0.04] bg-zinc-800/20">
                    <CategoryHeader glyph="◎" title="Performance de Valor" expert="Hormozi" color="#10b981" tip="Equação de Valor de Alex Hormozi: Valor = (Resultado × Probabilidade) ÷ (Tempo × Esforço). Mede se seu conteúdo entrega valor percebido alto com eficiência." />
                    <MetricItem label="Content ROI Score" value={analysis.contentROI.score} sub={`Melhor ROI: ${analysis.contentROI.bestROIType}`} color="#10b981"
                        tip="Mede o retorno de engajamento vs esforço estimado de produção. Image=1, Carrossel=2, Video=3. Score alto = muito engajamento com pouco esforço. Para melhorar: foque no tipo com maior ROI." />
                    <MetricItem label="Buying Intent" value={`${analysis.buyingIntent.intentCount}`} sub={`${analysis.buyingIntent.intentRate}% dos comentários`}
                        tip="Detecta comentários com intenção de compra (preço, onde comprar, link, etc). Taxa acima de 5% é excelente. Para melhorar: inclua CTAs claros e mostre benefícios do produto." />
                    {analysis.valuePerFollower !== null && (
                        <MetricItem label="Value/Follower" value={`${analysis.valuePerFollower}%`} sub="(saves+shares)/eng total" color="#10b981"
                            tip="Razão de saves+shares sobre engagement total. Saves indicam conteúdo útil que o público quer guardar. Shares indicam conteúdo que vale compartilhar. Acima de 15% é ótimo." />
                    )}
                    <div className="mt-2 pt-2 border-t border-white/[0.04]">
                        {analysis.contentROI.typeROI.slice(0, 3).map(t => (
                            <div key={t.type} className="flex justify-between text-[10px] py-0.5">
                                <span className="text-zinc-500">{t.type}</span>
                                <span className="text-zinc-300 font-mono">{t.avgROI} ROI ({t.count})</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. Influência & Persuasão (Cialdini) */}
                <div className="p-3 rounded-xl border border-white/[0.04] bg-zinc-800/20">
                    <CategoryHeader glyph="◎" title="Influência & Persuasão" expert="Cialdini" color="#3b82f6" tip="6 Princípios de Robert Cialdini: Reciprocidade, Compromisso, Prova Social, Autoridade, Escassez e Afinidade. Mede como seu conteúdo aplica técnicas de influência." />
                    <MetricItem
                        label="Reciprocidade"
                        value={`${analysis.reciprocity.ratio}%`}
                        sub={`${analysis.reciprocity.repliesCount}/${analysis.reciprocity.totalComments} — ${analysis.reciprocity.classification}`}
                        color={analysis.reciprocity.classification === 'excelente' ? '#10b981' : '#3b82f6'}
                        tip="% de comentários respondidos pela marca. Cialdini: reciprocidade gera lealdade. Acima de 30% é bom, acima de 60% é excelente. Para melhorar: responda mais comentários, especialmente os longos."
                    />
                    {analysis.socialProof && (
                        <MetricItem label="Social Proof" value={analysis.socialProof.score} sub={`${analysis.socialProof.highProofPosts} high-proof posts — ${analysis.socialProof.classification}`}
                            tip="Ratio (saves+shares)/(likes+comments). Saves e shares são ações de alto valor — indicam que o conteúdo é bom o suficiente para guardar ou recomendar. Score acima de 60 é excelente." />
                    )}
                    <MetricItem label="Gatilhos Persuasão" value={analysis.totalPersuasion} sub={`em ${analysis.persuasionPosts} posts`}
                        tip="Conta gatilhos de persuasão nas legendas: autoridade (especialista, estudo), escassez (últimas vagas, limitado), urgência (agora, hoje). Para melhorar: use 1-2 gatilhos por post naturalmente." />
                    <MetricItem label="Gatilhos Escassez" value={analysis.urgencyCount} sub={`em ${analysis.urgencyPosts} posts`}
                        tip="Gatilhos de urgência específicos: 'últimas unidades', 'por tempo limitado', 'vagas esgotando'. Use com moderação — excesso reduz credibilidade." />
                </div>

                {/* 3. Hook & Retenção (Nir Eyal) */}
                <div className="p-3 rounded-xl border border-white/[0.04] bg-zinc-800/20">
                    <CategoryHeader glyph="↻" title="Hook & Retenção" expert="Nir Eyal" color="#06b6d4" tip="Modelo Hook de Nir Eyal: Gatilho → Ação → Recompensa Variável → Investimento. Mede se seu público está 'viciado' no seu conteúdo e se volta regularmente." />
                    <MetricItem
                        label="Recompensa Variável"
                        value={analysis.variableReward.score}
                        sub={`CV: ${analysis.variableReward.cv} — ${analysis.variableReward.classification}`}
                        color={analysis.variableReward.classification === 'recompensa variavel ideal' ? '#10b981' : '#f59e0b'}
                        tip="Nir Eyal: público volta quando não sabe o que esperar. CV entre 0.3-0.7 é ideal — variação controlada. Muito baixo = previsível (entedia). Muito alto = inconsistente (confunde). Alterne tipos de conteúdo."
                    />
                    <MetricItem
                        label="Investimento do Público"
                        value={`${analysis.investmentDepth.ratio}%`}
                        sub={`${analysis.investmentDepth.longComments} longos / ${analysis.investmentDepth.shortComments + analysis.investmentDepth.longComments} total — ${analysis.investmentDepth.classification}`}
                        color={analysis.investmentDepth.classification === 'alto investimento' ? '#10b981' : '#06b6d4'}
                        tip="% de comentários com mais de 5 palavras. Comentários longos = público investido e engajado. Acima de 30% é bom. Para melhorar: faça perguntas abertas, peça opiniões, conte histórias."
                    />
                    <MetricItem label="Média Palavras/Comentário" value={analysis.investmentDepth.avgWords}
                        tip="Média de palavras por comentário do público. Acima de 8 palavras indica que seu público se esforça para interagir — sinal forte de comunidade ativa." />
                    <MetricItem label="Consistência (CV)" value={`${Math.round(analysis.engagementCV * 100)}%`} sub={analysis.engagementCV < 0.3 ? 'baixa variação' : analysis.engagementCV < 0.7 ? 'variação ideal' : 'alta variação'}
                        tip="Coeficiente de variação do engajamento entre posts. CV baixo (<30%) = público consistente. CV entre 30-70% = ideal (variação saudável). CV alto (>70%) = engajamento muito desigual entre posts." />
                </div>

                {/* 4. Awareness & Copy (Schwartz) */}
                <div className="p-3 rounded-xl border border-white/[0.04] bg-zinc-800/20">
                    <CategoryHeader glyph="◎" title="Awareness & Copy" expert="Schwartz" color="#f59e0b" tip="5 Níveis de Consciência de Eugene Schwartz: do desconhecido ao mais consciente. Analisa a qualidade das suas legendas e hooks para capturar atenção em cada nível." />
                    <MetricItem
                        label="Hook Quality"
                        value={analysis.hookQuality.score}
                        sub={`Melhor: ${analysis.hookQuality.bestHookType}`}
                        color="#f59e0b"
                        tip="Schwartz: os primeiros 50 caracteres da legenda determinam se alguém para para ler. Analisa tipos de hook (pergunta, emoji, CAPS, etc) e qual gera mais engajamento. Use o tipo que funciona melhor."
                    />
                    <MetricItem label="Linguagem Sensorial" value={analysis.avgSensoryScore} sub={`${analysis.sensoryPosts} posts com palavras sensoriais`}
                        tip="Palavras que ativam os sentidos: 'saboroso', 'brilhante', 'suave', 'quente'. Legendas sensoriais criam conexão emocional mais forte. Score alto = legendas mais envolventes." />
                    <div className="mt-2 pt-2 border-t border-white/[0.04]">
                        <p className="text-[9px] text-zinc-600 mb-1">Tipos de hook vs engajamento:</p>
                        {analysis.hookQuality.hookTypes.slice(0, 4).map(h => (
                            <div key={h.type} className="flex justify-between text-[10px] py-0.5">
                                <span className={h.type === analysis.hookQuality.bestHookType ? 'text-amber-400' : 'text-zinc-500'}>{h.type}</span>
                                <span className="text-zinc-300 font-mono">{h.avgEngagement} eng ({h.count})</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 5. Marca & Identidade (Lindstrom) */}
                <div className="p-3 rounded-xl border border-white/[0.04] bg-zinc-800/20">
                    <CategoryHeader glyph="◎" title="Marca & Identidade" expert="Lindstrom" color="#8b5cf6" tip="SMASH de Martin Lindstrom: marcas fortes ativam os 5 sentidos e têm identidade consistente. Mede a força da sua marca independente de hashtags e tendências." />
                    <MetricItem
                        label="Brand Equity"
                        value={`${analysis.brandEquity.ratio}x`}
                        sub={`${analysis.brandEquity.classification}`}
                        color={analysis.brandEquity.classification === 'marca forte' ? '#10b981' : '#8b5cf6'}
                        tip="Lindstrom: compara engajamento SEM hashtags vs COM hashtags. Ratio >1x = público engaja pela marca, não pelas hashtags. Marca forte não depende de hashtags para alcance."
                    />
                    <MetricItem label="Identidade de Conteúdo" value={analysis.contentIdentity.score} sub={analysis.contentIdentity.classification}
                        tip="Consistência do mix de conteúdo (imagem, vídeo, carrossel). Score alto = identidade visual definida. Score baixo = muita variação de formato. Identidade forte ajuda o público a reconhecer sua marca." />
                    <MetricItem label="Ritmo de Posting" value={`${analysis.consistency.score}/100`} sub={`${analysis.consistency.postsPerWeek} posts/sem — ${analysis.consistency.classification}`}
                        tip="Regularidade de publicação. Score alto = publica em intervalos previsíveis. O algoritmo favorece criadores consistentes. 3-5 posts/semana com intervalo regular é o ideal." />
                    <div className="mt-2 pt-2 border-t border-white/[0.04]">
                        <p className="text-[9px] text-zinc-600 mb-1">Equity: sem hashtag vs com hashtag</p>
                        <div className="flex justify-between text-[10px]">
                            <span className="text-zinc-500">Sem #{' '}<span className="text-zinc-300">{analysis.brandEquity.withoutHashtags.avgEngagement} eng</span></span>
                            <span className="text-zinc-500">Com #{' '}<span className="text-zinc-300">{analysis.brandEquity.withHashtags.avgEngagement} eng</span></span>
                        </div>
                    </div>
                </div>

                {/* 6. Momentum & Crescimento (Brunson) */}
                <div className="p-3 rounded-xl border border-white/[0.04] bg-zinc-800/20">
                    <CategoryHeader glyph="↗" title="Momentum & Crescimento" expert="Brunson" color="#ef4444" tip="Hook-Story-Offer de Russell Brunson + Escada de Valor. Mede se seu conteúdo tem momentum (frequência + qualidade) e se a tendência é de crescimento." />
                    <MetricItem
                        label="Content Velocity"
                        value={analysis.velocity.score}
                        sub={`${analysis.velocity.postsPerWeek} posts/sem · ${analysis.velocity.avgEngagement} eng/post — ${analysis.velocity.classification}`}
                        color={analysis.velocity.classification === 'alto momentum' ? '#10b981' : '#ef4444'}
                        tip="Brunson: frequência × qualidade = momentum. Combina posts/semana com engajamento médio. Alto momentum = publica frequente E com bom engajamento. Para melhorar: aumente frequência sem perder qualidade."
                    />
                    <MetricItem
                        label="Pareto (80/20)"
                        value={`${analysis.pareto.percentOfPosts}%`}
                        sub={`${analysis.pareto.ratio} posts geram 80% do engagement`}
                        tip="Princípio de Pareto: poucos posts geram a maioria do engagement. Se 20% dos posts geram 80% do engajamento = eficiente. Se precisa de 50%+ = engajamento disperso. Analise seus top posts e replique o padrão."
                    />
                    <MetricItem
                        label="Tendência"
                        value={analysis.trend.direction === 'rising' ? '↑ Crescendo' : analysis.trend.direction === 'falling' ? '↓ Caindo' : '→ Estável'}
                        sub={`R² = ${analysis.trend.r2.toFixed(2)} · slope = ${analysis.trend.slope.toFixed(2)}`}
                        color={analysis.trend.direction === 'rising' ? '#10b981' : analysis.trend.direction === 'falling' ? '#ef4444' : '#9ca3af'}
                        tip="Regressão linear do engajamento ao longo do tempo. R² próximo de 1 = tendência forte e confiável. Slope positivo = crescimento. Se caindo, revise sua estratégia de conteúdo recente."
                    />
                </div>
            </div>
        </motion.div>
    );
}
