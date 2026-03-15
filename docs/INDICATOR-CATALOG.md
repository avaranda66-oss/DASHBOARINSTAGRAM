# INDICATOR-CATALOG.md — Catalogo Completo de Indicadores

**Projeto:** DASHBOARD-OSS v2
**Atualizado:** 2026-03-15
**Branch:** v2-dashboard

---

## Resumo Geral

| Item | Valor |
|------|-------|
| **Modulos** | 17 utility modules em `lib/utils/` |
| **Funcoes exportadas** | ~105 funcoes |
| **Cobertura de testes** | 714 tests, 17 test files, **100% PASS** |
| **Dependencias externas** | Zero (Pure TypeScript) |
| **BUG DOCUMENTADO** | `InsightQueue.bubbleUp` — heap ordering invertido (min-heap em vez de max-heap). O `compare()` retorna `b.score - a.score` (max-heap correto), porem o `bubbleUp` usa `<= 0` como condicao de parada, o que pode causar inversao parcial de prioridade em cenarios de insercao sequencial com scores proximos. |

---

## Indice de Modulos

1. [math-core.ts](#1-math-corets) — Primitivas matematicas
2. [statistics.ts](#2-statisticsts) — Analise estatistica para Instagram
3. [forecasting.ts](#3-forecastingts) — Previsao de series temporais
4. [anomaly-detection.ts](#4-anomaly-detectionts) — Deteccao de anomalias STL+MAD
5. [hw-optimizer.ts](#5-hw-optimizerts) — Holt-Winters auto-tuning
6. [bayesian-ab.ts](#6-bayesian-abts) — A/B testing bayesiano + Chi2 + Fisher
7. [incrementality.ts](#7-incrementalityts) — ITS + Welch t-test + MDE
8. [advanced-indicators.ts](#8-advanced-indicatorsts) — Elasticidade + fadiga + saturacao
9. [creative-scorer.ts](#9-creative-scorerts) — Scoring multidimensional de criativos
10. [mmm.ts](#10-mmmts) — Media Mix Modeling
11. [budget-pacing.ts](#11-budget-pacingts) — Budget pacing alerts
12. [causal-behavioral.ts](#12-causal-behavioralts) — Granger + Fogg + Hook Rate
13. [attribution.ts](#13-attributionts) — Shapley + Markov Chain
14. [rules-engine.ts](#14-rules-enginets) — Motor de regras de automacao
15. [sentiment.ts](#15-sentimentts) — Analise de sentimento PT-BR
16. [insight-engine.ts](#16-insight-enginets) — Motor de alertas com priority queue
17. [isolation-forest.ts](#17-isolation-forestts) — Isolation Forest multivariado

---

## 1. math-core.ts

**Proposito:** Primitivas matematicas reutilizaveis — zero dependencies.

| Funcao | Proposito | Formula/Algoritmo | Range | Negocio | Teste |
|--------|-----------|-------------------|-------|---------|-------|
| `normalCDF(z: number): number` | CDF da distribuicao normal padrao. Calcula P(Z <= z). | Abramowitz & Stegun formula 26.2.17. Precisao \|erro\| < 7.5e-8 | [0, 1] | ⭐⭐ | PASS |
| `normalQuantile(p: number): number` | Inversa da CDF normal (quantil). Retorna z tal que P(Z <= z) = p. | Rational approximation de Acklam (2003). Precisao \|erro\| < 4.5e-4 | (-Inf, +Inf) | ⭐⭐ | PASS |
| `bootstrapCI(values, options?): {lower, upper, point, B}` | Intervalo de confianca bootstrap via metodo do percentil. Reamostra B vezes com reposicao. | Percentile bootstrap, PRNG deterministico (seed=42), default B=1000, alpha=0.05 | number (depende dos dados) | ⭐⭐⭐ | PASS |
| `clamp01(x: number): number` | Restringe valor ao intervalo [0,1]. | `max(0, min(1, x))` | [0, 1] | ⭐ | PASS |
| `solveLinearSystem(A, b): number[]` | Resolve sistema linear A*x = b via eliminacao gaussiana com pivotamento parcial. | Gaussian elimination, partial pivoting. Usado por fitITS (4x4). | number[] | ⭐⭐ | PASS |
| `olsSimple(x, y): {alpha, beta, rSquared, residuals}` | Regressao linear simples (OLS) via equacoes normais. y = alpha + beta*x. | Normal equations: beta = SXY/SXX, alpha = meanY - beta*meanX | number (coef.), R2 em [0,1] | ⭐⭐⭐ | PASS |

**Consumido por:** `statistics.ts`, `advanced-indicators.ts`, `mmm.ts`, `causal-behavioral.ts`, `incrementality.ts`, `creative-scorer.ts`, `bayesian-ab.ts`

---

## 2. statistics.ts

**Proposito:** Modulo principal de analise estatistica para small data de Instagram. 35 funcoes exportadas cobrindo desde estatisticas descritivas ate indicadores comportamentais avancados.

| Funcao | Proposito | Formula/Algoritmo | Range | Negocio | Teste |
|--------|-----------|-------------------|-------|---------|-------|
| `descriptiveStats(values): {...}` | Estatisticas descritivas completas: media, mediana, stdDev, Q1, Q3, IQR, CV. | Bessel's correction (n-1) para variancia amostral | number (varias saidas) | ⭐⭐⭐ | PASS |
| `percentileRank(value, dataset): number` | Percentil rank de um valor dentro de um dataset de referencia. | % de valores <= value no dataset | [0, 100] | ⭐⭐⭐ | PASS |
| `movingAverage(values, window): number[]` | Media movel centrada com janela configuravel. | SMA: media dos w pontos ao redor de cada posicao | number[] | ⭐⭐ | PASS |
| `growthRate(values): number` | Taxa de crescimento percentual do primeiro ao ultimo ponto da serie. | `((last - first) / \|first\|) * 100` | number (%) | ⭐⭐⭐⭐ | PASS |
| `linearTrend(values): {slope, direction, r2, predicted}` | Regressao linear temporal. Classifica tendencia como rising/falling/stable. | OLS sobre indices 0..n-1. Threshold de estabilidade: \|slope\| < 5% da media | slope: number, R2: [0,1] | ⭐⭐⭐⭐ | PASS |
| `pearsonCorrelation(x, y): number` | Coeficiente de correlacao de Pearson entre duas series. | r = SXY / sqrt(SXX * SYY) | [-1, 1] | ⭐⭐⭐ | PASS |
| `engagementScore(post, options?): number` | Score de engajamento ponderado com sigmoid. Pesos: saves(35%), shares(25%), comments(20%), likes(10%), views(10%). | Log transform + sigmoid: `100 / (1 + e^(-k*(weighted - midpoint)))`. US-50: midpoint dinamico via mediana do historico da conta. | [0, 100] | ⭐⭐⭐⭐⭐ | PASS |
| `detectOutliers(values): {outliers, lowerBound, upperBound}` | Deteccao de outliers via metodo IQR (Q1 - 1.5*IQR, Q3 + 1.5*IQR). | Tukey fences: lower = Q1 - 1.5*IQR, upper = Q3 + 1.5*IQR | indices + bounds | ⭐⭐⭐ | PASS |
| `performanceBadge(value, dataset): {badge, percentile, emoji, color}` | Classifica valor em badge (exceptional/above_average/average/below_average/underperforming). | Baseado em percentileRank: >=90 exceptional, >=70 above_average, etc. | badge string | ⭐⭐⭐⭐ | PASS |
| `metricSummary(values, metricName): {...}` | Resumo executivo de serie temporal: valor atual, media, tendencia, volatilidade, insight PT-BR. | Combina descriptiveStats + linearTrend + classificacao de volatilidade | object | ⭐⭐⭐⭐ | PASS |
| `periodComparison(current, previous): {...}` | Comparacao entre dois periodos com direcao, variacao % e significancia via Cohen's d. | Cohen's d = \|diff\| / pooledStd. Significancia: d >= 0.8 significant, >= 0.3 marginal | object | ⭐⭐⭐⭐⭐ | PASS |
| `bestTimeToPost(posts): {bestDay, worstDay, dayBreakdown}` | Identifica melhor e pior dia da semana para publicacao baseado em engajamento medio. | Agrupamento por dia da semana + media por grupo | string + number | ⭐⭐⭐⭐ | PASS |
| `apifyEngagementScore(post): number` | Variante de engagementScore para dados Apify (sem saves/shares). Pesos: comments(45%), likes(30%), views(25%). | Sigmoid com midpoint fixo = 3 | [0, 100] | ⭐⭐⭐ | PASS |
| `hashtagEfficiency(posts): [{hashtag, avgEngagement, count}]` | Eficiencia de hashtags: engajamento medio por hashtag, ordenado por performance. | Agrupamento + media, minimo 2 posts por hashtag | number[] | ⭐⭐⭐⭐ | PASS |
| `captionSegmentAnalysis(posts): {segments, bestSegment, insight}` | Analise de legenda por faixa de tamanho (0, 1-50, 51-150, 151-500, 501-1000, 1000+). | Agrupamento por ranges + media de engajamento | object | ⭐⭐⭐⭐ | PASS |
| `postingConsistencyIndex(posts, options?): {cv, avgIntervalDays, postsPerWeek, score, classification}` | Indice de consistencia: 60% frequencia + 40% regularidade (CV dos intervalos). US-52: target configuravel. | freqScore = (postsPerWeek/target)*100; regScore = (1-CV)*100 | [0, 100] | ⭐⭐⭐⭐⭐ | PASS |
| `zScores(values): number[]` | Z-Score de cada valor em relacao ao dataset. | Z = (valor - media) / stdDev | number[] | ⭐⭐ | PASS |
| `paretoAnalysis(posts): {percentOfPosts, topPostIds, ...}` | Analise de Pareto (80/20): quais posts geram 80% do engajamento. | Ordenacao decrescente + acumulacao ate 80% do total | number (%) | ⭐⭐⭐⭐ | PASS |
| `contentVelocityScore(posts): {score, postsPerWeek, avgEngagement, classification}` | Momentum da conta: frequencia * engajamento medio. | `rawVelocity = postsPerWeek * log1p(avgEngagement)`, sigmoid(midpoint=15) | [0, 100] | ⭐⭐⭐⭐ | PASS |
| `peakEngagementWindow(posts): {peakHourStart, peakHourEnd, ...}` | Janela de 2h com maior engajamento medio (sliding window circular). | Agrupamento por hora + sliding window de 2h | hour: [0, 23] | ⭐⭐⭐⭐ | PASS |
| `reciprocityIndex(posts): {repliesCount, totalComments, ratio, classification}` | Indice de reciprocidade: respostas da marca / total de comentarios (Cialdini). | ratio = repliesCount / totalComments * 100 | [0, 100] (%) | ⭐⭐⭐⭐ | PASS |
| `socialProofScore(posts): {score, highProofPosts, classification}` | Prova social: (saves+shares) / (likes+comments). Alto = conteudo que pessoas compartilham. | ratio * 5, clamp [0,100]. Threshold highProof: ratio > 10% | [0, 100] | ⭐⭐⭐⭐ | PASS |
| `brandEquityScore(posts): {score, ratio, classification}` | Forca da marca: engajamento SEM hashtags vs COM hashtags. Ratio > 1 = marca forte. | ratio = avgWithout / avgWith. Score = ratio * 50 | [0, 100] | ⭐⭐⭐⭐⭐ | PASS |
| `contentMixScore(posts): {score, currentMix, bestType, recommendation}` | Avalia distribuicao de tipos de conteudo vs engajamento por tipo. | % do best type * 1.5, clamp [0,100] | [0, 100] | ⭐⭐⭐ | PASS |
| `hookQualityScore(posts): {score, hookTypes, bestHookType, insight}` | Qualidade do hook (primeiros 50 chars): agrupa por tipo (pergunta, emoji, CAPS, etc.) e compara engajamento. | Classificacao regex do hook + media por tipo | [0, 100] | ⭐⭐⭐⭐ | PASS |
| `investmentDepthScore(posts): {score, longComments, ratio, avgWords, classification}` | Profundidade de investimento (Nir Eyal Hook Model): ratio de comentarios longos (>5 palavras). | ratio = longComments / totalComments * 100. Score = ratio * 1.5 | [0, 100] | ⭐⭐⭐⭐ | PASS |
| `contentROIScore(posts): {score, avgROI, bestROIType, typeROI}` | ROI de conteudo (Hormozi): engajamento / esforco de producao (Image=1, Carousel=2, Video=3). | ROI = engagement / effort. Score = log1p(avgROI) * 15 | [0, 100] | ⭐⭐⭐⭐ | PASS |
| `contentIdentityScore(posts): {score, typeDistribution, classification}` | Consistencia da identidade (Lindstrom SMASH): CV do content mix. Baixo CV = identidade forte. | score = (1 - min(CV, 1.5) / 1.5) * 100 | [0, 100] | ⭐⭐⭐ | PASS |
| `variableRewardScore(values): {score, cv, classification}` | Variabilidade do engajamento (Nir Eyal): CV ideal entre 0.3-0.7 (recompensa variavel). | Sweet spot check: CV 0.3-0.7 = alto score | [0, 100] | ⭐⭐⭐ | PASS |
| `persuasionTriggerCount(caption): {total, urgency, authority, scarcity, hasPersuasion}` | Conta gatilhos de persuasao (Cialdini 6 principios) no caption via regex PT-BR. | Regex match: urgencia + autoridade + escassez | count: number | ⭐⭐⭐⭐ | PASS |
| `temporalPeriodComparison(posts): {recentAvg, previousAvg, changePercent, cohensD, ...}` | Comparacao temporal inteligente: 30d vs 30d anteriores, fallback 14d, fallback split 50/50. | periodComparison + Cohen's d explicito | object | ⭐⭐⭐⭐⭐ | PASS |
| `postSentimentRanking(posts): {mostEmotional, mostInterest, mostActiveInterest}` | Ranking de posts por sentimento, interesse e interesse ativo nos comentarios. | Regex positivo/negativo + word count + ratio comentarios longos | arrays ranked | ⭐⭐⭐⭐ | PASS |
| `shannonEntropy(categories): {entropy, normalizedEntropy, maxEntropy, ...}` | Entropia de Shannon para diversidade de content mix. Normalizado [0,1]. | H = -Sigma(p*log2(p)). normalizedEntropy = H / log2(k) | [0, 1] normalizado | ⭐⭐⭐ | PASS |
| `weightedRecentTrend(values, halflife?): {slope, direction, r2, predicted}` | Regressao linear ponderada (WLS) com decaimento exponencial. US-71: substitui linearTrend nos KPI cards. | w_t = e^(-lambda*(T-t)), lambda = ln(2)/halflife. WLS via equacoes normais ponderadas. | slope: number, R2: [0,1] | ⭐⭐⭐⭐⭐ | PASS |
| `viralPotentialIndex(data): {score, classification, drivers}` | Indice de potencial viral. US-55: shares(45%) > saves(35%) > comments(20%). | Log-normalizacao + sigmoid. Modo rico (shares/saves/comments) ou modo proxy (engagementRate). | [0, 100] | ⭐⭐⭐⭐⭐ | PASS |

**Consumido por:** Paginas de analytics (Raio-X, Overview, Posts), componentes KPI cards, ads-kpi-cards.

---

## 3. forecasting.ts

**Proposito:** Previsao de series temporais via Holt-Winters aditivo e deteccao de mudancas via CUSUM.

| Funcao | Proposito | Formula/Algoritmo | Range | Negocio | Teste |
|--------|-----------|-------------------|-------|---------|-------|
| `holtWinters(data, options?): {fitted, forecast, level, trend, seasonal}` | Triple Exponential Smoothing aditivo. Ideal para dados com tendencia + sazonalidade (metricas semanais). | L_t = alpha*(x_t - S_{t-m}) + (1-alpha)*(L_{t-1} + T_{t-1}); forecast_h = L + h*T + S | number[] | ⭐⭐⭐⭐⭐ | PASS |
| `cusumDetect(data, options?): {changePoints, cusumPos, cusumNeg}` | CUSUM (Cumulative Sum) change-point detection. Detecta pontos onde a media muda significativamente. | CUSUM+: max(0, S+ + z - K); threshold H = thresholdMult * stdDev | indices[] | ⭐⭐⭐⭐ | PASS |

**Consumido por:** `hw-optimizer.ts`, `insight-engine.ts`, componentes de forecast na UI.

---

## 4. anomaly-detection.ts

**Proposito:** Deteccao de anomalias robusta via STL + MAD + CUSUM. Story US-25.

| Funcao | Proposito | Formula/Algoritmo | Range | Negocio | Teste |
|--------|-----------|-------------------|-------|---------|-------|
| `stlDecompose(data, period?): STLDecomposition` | Decompoe serie temporal em tendencia + sazonalidade + residuo. Simplificado de Cleveland et al. (1990). | Tendencia: media movel centrada. Sazonalidade: media por posicao no ciclo. Residuo: original - trend - seasonal | components[] | ⭐⭐⭐⭐ | PASS |
| `madScore(values): MADResult` | Calcula MAD e modified Z-scores. Mais robusto que stdDev contra outliers. | M_i = 0.6745 * (x_i - mediana) / MAD. Fator 0.6745 normaliza para consistencia com stdDev em Normal. | z-scores: number[] | ⭐⭐⭐⭐ | PASS |
| `madAnomalyDetect(values, threshold?): AnomalyDetectionResult` | Detecta anomalias via modified Z-score (MAD). Threshold padrao 3.5 (Iglewicz & Hoaglin 1993). | \|M_i\| > threshold => anomalia | indices[] | ⭐⭐⭐⭐⭐ | PASS |
| `stlCusum(data, options?): STLCUSUMResult` | CUSUM aplicado sobre residuos STL. Elimina ~80% dos falsos positivos sazonais. | STL decompose + CUSUM sobre residuos. Threshold: 2.5 * MAD dos residuos. | changePoints[] | ⭐⭐⭐⭐⭐ | PASS |
| `multivariateAnomalyScore(metrics, threshold?): MultivariateAnomalyResult` | Detecta anomalias coordenadas em multiplas metricas (shadow ban, viral spike). | Media geometrica dos \|modified Z-scores\| por posicao. Normalizado 0-100. | scores: [0, 100] | ⭐⭐⭐⭐⭐ | PASS |

**Consumido por:** `creative-scorer.ts`, `insight-engine.ts`, pagina de anomalias.

---

## 5. hw-optimizer.ts

**Proposito:** Auto-tuning de Holt-Winters + prediction intervals. Story US-26.

| Funcao | Proposito | Formula/Algoritmo | Range | Negocio | Teste |
|--------|-----------|-------------------|-------|---------|-------|
| `selectHWModel(data, period?): HWModel` | Selecao automatica aditivo vs multiplicativo via CV dos fatores sazonais. | CV(seasonal_ratios) > 0.15 => multiplicativo | 'additive' \| 'multiplicative' | ⭐⭐⭐ | PASS |
| `holtWintersMultiplicative(data, options?): {...}` | HW multiplicativo para series onde amplitude sazonal cresce com o nivel. | L_t = alpha*(x_t/S_{t-m}) + (1-alpha)*(L+T); forecast_h = (L+h*T)*S | number[] | ⭐⭐⭐⭐ | PASS |
| `optimizeHW(data, options?): HWOptimizeResult` | Grid search para otimizacao de alpha, beta, gamma. 729 combinacoes, metrica MSSE. | Grid: {0.1..0.9}^3. MSSE = MSE / mean(\|diff(actual)\|^2). Para N>90, usa ultimos 90 pontos. | params + MSSE | ⭐⭐⭐⭐ | PASS |
| `holtWintersWithPI(data, options?): HWWithPIResult` | HW completo com auto-tuning e intervalos de predicao 80% e 95%. | PI_h = forecast +/- z_conf * sigma_1 * sqrt(h). z_80=1.28, z_95=1.96 | fitted[] + forecast[] + PI | ⭐⭐⭐⭐⭐ | PASS |

**Consumido por:** `insight-engine.ts`, componentes de forecast.

---

## 6. bayesian-ab.ts

**Proposito:** A/B Testing estatisticamente correto para CTR. Story US-24.

| Funcao | Proposito | Formula/Algoritmo | Range | Negocio | Teste |
|--------|-----------|-------------------|-------|---------|-------|
| `chiSquaredProportions(aClicks, aImpr, bClicks, bImpr, alpha?): ChiSquaredResult` | Chi-quadrado de Pearson para comparar dois CTRs. Correcao de Yates automatica quando celula esperada < 10. | chi2 = Sigma((O-E)^2/E). p-value via CDF chi2(df=1). | chiSq: number, pValue: [0,1] | ⭐⭐⭐⭐⭐ | PASS |
| `bayesianAB(aClicks, aImpr, bClicks, bImpr, options?): BayesianABResult` | Teste A/B bayesiano via Beta-Binomial conjugada. P(B>A) via Monte Carlo (10k amostras, seed=42). | Prior: Beta(1,1). Posterior: Beta(1+k, 1+n-k). P(B>A) = count(thetaB > thetaA) / B | probBWins: [0,1] | ⭐⭐⭐⭐⭐ | PASS |
| `sprtTest(clicksA, clicksB, options?): SPRTResult` | Teste sequencial de Wald (SPRT) para parada antecipada sem inflacao de erro tipo I. | Log-likelihood ratio acumulado. Boundaries: B_lower = beta/(1-alpha), B_upper = (1-beta)/alpha | decision: enum | ⭐⭐⭐⭐⭐ | PASS |
| `fisherExact2x2(a, b, c, d, alpha?): FisherExactResult` | Teste exato de Fisher para tabelas 2x2. Alternativa ao Chi2 quando celulas < 5 ou n < 40. | Distribuicao hipergeometrica. p-value bilateral = Sigma P(k) para P(k) <= P(obs). Odds ratio com correcao Haldane-Anscombe. | pValue: [0,1], oddsRatio: number | ⭐⭐⭐⭐⭐ | PASS |

**Consumido por:** `insight-engine.ts`, pagina de A/B testing.

---

## 7. incrementality.ts

**Proposito:** Incrementality testing para conta unica Meta Ads. Story US-41.

| Funcao | Proposito | Formula/Algoritmo | Range | Negocio | Teste |
|--------|-----------|-------------------|-------|---------|-------|
| `fitITS(y, interventionIndex): ITSResult` | Interrupted Time Series: regressao segmentada com mudanca de nivel e slope. | Y_t = b0 + b1*t + b2*D_t + b3*(t*D_t). OLS via solveLinearSystem 4x4. Efeito causal: Delta_t = b2 + b3*t_pos | betas, R2, causalEffects | ⭐⭐⭐⭐⭐ | PASS |
| `welchTTest(x, y): WelchTTestResult` | Teste t de Welch para diferenca de medias (nao assume variancias iguais). | t = diff / se. df via Welch-Satterthwaite. p-value via normalCDF. | t: number, pValue: [0,1] | ⭐⭐⭐⭐⭐ | PASS |
| `bootstrapDiffMeans(x, y, B?, alpha?): BootstrapDiffResult` | Intervalo de confianca bootstrap para diferenca de medias. PRNG deterministico (seed=42). | Percentile bootstrap nao-parametrico. Default B=5000, alpha=0.05. | point, lower, upper | ⭐⭐⭐⭐ | PASS |
| `requiredDaysForLift(lift, mu, sigma, alpha?, power?): MDEResult` | Calcula dias por grupo necessarios para detectar um lift. | n = 2*(z_{1-alpha/2} + z_{1-beta})^2 / d^2, onde d = lift*mu/sigma (Cohen's d) | daysPerGroup: number | ⭐⭐⭐⭐⭐ | PASS |
| `minimumDetectableEffect(daysPerGroup, mu, sigma, alpha?, power?): MDEResult` | Calcula MDE dado um numero fixo de dias por grupo. Inverso de requiredDaysForLift. | d = sqrt(2*(z_a + z_b)^2 / n), lift = d*sigma/mu | mdePercent: number | ⭐⭐⭐⭐⭐ | PASS |

**Consumido por:** Pagina de incrementality testing, reports.

---

## 8. advanced-indicators.ts

**Proposito:** Indicadores avancados de marketing analytics: elasticidade, fadiga criativa, saturacao.

| Funcao | Proposito | Formula/Algoritmo | Range | Negocio | Teste |
|--------|-----------|-------------------|-------|---------|-------|
| `advertisingElasticity(spend, revenue): {elasticity, rSquared, interpretation, confidence}` | Elasticidade publicitaria via regressao log-log. Mede retornos crescentes/decrescentes do investimento. | OLS(log(spend), log(revenue)). beta = elasticidade. e<1: decrescente, e>1: crescente. | elasticity: number, R2: [0,1] | ⭐⭐⭐⭐⭐ | PASS |
| `creativeHalfLife(dailyCTRs): {halfLife, lambda, decayRate, ...}` | Meia-vida de fadiga criativa via decaimento exponencial. Estima dias ate CTR cair pela metade. | CTR(t) = CTR_0 * e^(-lambda*t). halfLife = ln(2)/lambda. Regressao log-linear. | halfLife: number (dias) | ⭐⭐⭐⭐⭐ | PASS |
| `diminishingReturns(spend, result): {Vmax, Km, saturationPercent, interpretation}` | Modela retornos decrescentes via Michaelis-Menten. Identifica zona de saturacao. | resultado = (Vmax*spend)/(Km+spend). Lineweaver-Burk transform para estimacao. saturacao = spend/(Km+spend)*100 | Vmax, Km: number, saturacao: [0,100] | ⭐⭐⭐⭐⭐ | PASS |

**Consumido por:** Pagina de analytics avancado, dashboard ads.

---

## 9. creative-scorer.ts

**Proposito:** Motor de scoring multidimensional de criativos Meta Ads. Story US-36.

| Funcao | Proposito | Formula/Algoritmo | Range | Negocio | Teste |
|--------|-----------|-------------------|-------|---------|-------|
| `scoreVisual(meta: CreativeMeta): number` | Score visual baseado em metadados offline: face, texto, cor, UGC. Base 0.5 + deltas. | Heuristicas: hasFace +0.15, textDensity LOW +0.15, UGC +0.10, bonus cor contextual. | [0, 1] | ⭐⭐⭐ | PASS |
| `scoreCopy(meta: CreativeMeta): number` | Score de copy: tipo de caption e uso de emojis. Sweet spot: 1-5 emojis. | captionType QUESTION +0.10, LIST/HOW_TO +0.08, emojis 1-5 +0.05 | [0, 1] | ⭐⭐⭐ | PASS |
| `scorePerformance(current, bench): number` | Score de performance: CTR, saveRate, commentRate, ROAS vs benchmarks. Log2 saturation. | perf += weight * log2(kpi/avg + 1). Pesos: CTR 0.20, saveRate 0.15, commentRate 0.10, ROAS 0.20 | [0, 1] | ⭐⭐⭐⭐⭐ | PASS |
| `scoreFatigue(serie: HistoricalSerie): number` | Detecta fadiga criativa via STL trend decrescente + hookRate drop + spend vs CTR divergence. | STL trend decline >= 3 periodos +0.40, hookRate drop >10pp +0.30, spend up + CTR down +0.20 | [0, 1] | ⭐⭐⭐⭐⭐ | PASS |
| `scoreCreative(meta, serie): CreativeScore` | Score composto: 0.20*visual + 0.20*copy + 0.50*performance - 0.30*fatigue. | Composicao ponderada das 4 dimensoes. >0.70 saudavel, 0.50-0.70 mediano, <0.50 substituir. | [0, 1] total | ⭐⭐⭐⭐⭐ | PASS |

**Consumido por:** Pagina de creative intelligence.

---

## 10. mmm.ts

**Proposito:** Media Mix Modeling: Adstock geometrico + Hill Saturation + Grid Search. Story US-40.

| Funcao | Proposito | Formula/Algoritmo | Range | Negocio | Teste |
|--------|-----------|-------------------|-------|---------|-------|
| `geometricAdstock(spend, theta): number[]` | Adstock geometrico (carryover exponencial). A_t = X_t + theta * A_{t-1}. | theta: 0.3-0.6 para performance, 0.6-0.9 para brand | number[] | ⭐⭐⭐⭐ | PASS |
| `weibullAdstock(spend, shape, scale, maxLag?): number[]` | Adstock de Weibull para picos atrasados e caudas nao-exponenciais. | Kernel Weibull normalizado. shape>1: pico atrasado. | number[] | ⭐⭐⭐ | PASS |
| `hillSaturation(adstock, K, alpha?): number[]` | Hill function: f(a) = a^alpha / (K^alpha + a^alpha). K = half-saturation spend. | f(0)=0, f(K)=0.5, f(inf)->1. alpha>1: curva S. | [0, 1] | ⭐⭐⭐⭐ | PASS |
| `logSaturation(adstock, K): number[]` | Saturacao logaritmica: f(a) = log(1 + a/K). Fallback numerico estavel. | Nunca satura completamente (sem assintota em 1). | [0, +inf) | ⭐⭐⭐ | PASS |
| `fitMMM(spend, outcome, options?): MMMFitResult` | Grid search theta x K para ajuste do modelo MMM de canal unico. | Grid default: theta {0.1..0.9} x K em percentis do adstock = 20 combinacoes. OLS por combinacao. Selecao por MSE minimo. | theta, K, R2 | ⭐⭐⭐⭐⭐ | PASS |
| `predictOutcome(spend, fit): number` | Predicao de outcome para spend estatico (estado estacionario). | Adstock estacionario: A = spend/(1-theta). Aplica saturacao + regressao. | number | ⭐⭐⭐⭐ | PASS |
| `computeROASCurve(spendLevels, fit): ROASCurvePoint[]` | Gera curva ROAS total + marginal para faixa de niveis de spend. | ROAS total = outcome/spend. ROAS marginal = deltaOutcome/deltaSpend. | array of points | ⭐⭐⭐⭐⭐ | PASS |
| `findOptimalBudget(minSpend, maxSpend, fit, steps?): OptimalBudgetResult` | Encontra budget otimo: ponto com maior ROAS marginal. | Grid de spend levels + computeROASCurve + max(marginalROAS) | optimalSpend: number | ⭐⭐⭐⭐⭐ | PASS |

**Consumido por:** Pagina de MMM, budget allocation.

---

## 11. budget-pacing.ts

**Proposito:** Calculadora de budget pacing para campanhas Meta Ads. Story US-63.

| Funcao | Proposito | Formula/Algoritmo | Range | Negocio | Teste |
|--------|-----------|-------------------|-------|---------|-------|
| `calculateBudgetPacing(campaign): BudgetPacingAlert \| null` | Calcula pacing de uma campanha: utilizacao, ritmo, dias ate esgotamento. | pacingRatio = utilizationPct / expectedUtilizationPct. >1.2 overspending, <0.6 underspending. Severity: critical/warn/info. | PacingStatus enum | ⭐⭐⭐⭐⭐ | PASS |
| `calculateAllPacingAlerts(campaigns): BudgetPacingAlert[]` | Calcula pacing de todas as campanhas e ordena por severidade. | Map + filter + sort por severity (critical > warn > info) | array sorted | ⭐⭐⭐⭐⭐ | PASS |

**Consumido por:** Dashboard de pacing, alertas automaticos.

---

## 12. causal-behavioral.ts

**Proposito:** Causalidade Granger, Hook Rate, Social Proof Velocity, Fogg Score, Halo Effect. Story US-27.

| Funcao | Proposito | Formula/Algoritmo | Range | Negocio | Teste |
|--------|-----------|-------------------|-------|---------|-------|
| `grangerTest(x, y, options?): GrangerResult` | Teste de causalidade de Granger (1969). Testa ambas as direcoes automaticamente. | F-stat = ((RSS_r - RSS_u)/p) / (RSS_u/(n-2p-1)). Minimo 20 observacoes. | fStat, pValue, causalDirection | ⭐⭐⭐⭐⭐ | PASS |
| `hookRate(avgWatchTimeMs, videoDurationMs, contentType?): HookRateResult` | Hook Rate proxy: retencao nos primeiros 3s de Reels/videos. | Proxy: (avgWatchTime/3000)*100 * 0.6 + normalizedHook * 0.4. Benchmarks: >70% excelente. | [0, 100] | ⭐⭐⭐⭐⭐ | PASS |
| `socialProofVelocity(timestamps, publishedAt, windowHours?): SocialProofVelocityResult` | Velocidade de acumulacao de prova social nas primeiras horas pos-publicacao. | velocity = (inWindow / total) * 100. >=60% viral, >=40% forte. | [0, 100] (%) | ⭐⭐⭐⭐ | PASS |
| `foggBehaviorScore(post): FoggBehaviorScore` | Fogg Behavior Model: B = MAP (Motivation x Ability x Prompt). Score 0-100. | Motivation(0-33) + Ability(0-33) + Prompt(0-34). Componentes: sentiment, intent, CTA, urgencia, formato. | [0, 100] | ⭐⭐⭐⭐⭐ | PASS |
| `organicPaidHalo(campaignEndDates, followerTimeSeries, firstDate, windowDays?): OrganicPaidHaloResult` | Mede efeito halo: crescimento organico pos-campanha paga vs baseline. | Lift = (avgPost - baseline) / \|baseline\| * 100. Significancia via consistencia entre campanhas. | haloEffect: % lift | ⭐⭐⭐⭐ | PASS |

**Consumido por:** Paginas de analytics comportamental, Reels analytics.

---

## 13. attribution.ts

**Proposito:** Atribuicao multi-touch via Shapley Values e Markov Chain. Story US-29.

| Funcao | Proposito | Formula/Algoritmo | Range | Negocio | Teste |
|--------|-----------|-------------------|-------|---------|-------|
| `shapleyValues(players, valueFn): Record<string, number>` | Shapley Values para atribuicao de credito. Enumeracao de coalizoes com bitmask 2^n (max n=20). | phi_i = Sigma [|S|!(n-|S|-1)!/n!] * [v(S u {i}) - v(S)]. Propriedades: eficiencia, simetria, nulidade, aditividade. | number por jogador (soma = v(N)) | ⭐⭐⭐⭐⭐ | PASS |
| `estimateTransitionMatrix(paths): TransitionMatrix` | Estima matriz de transicao Markov a partir de historico de paths (touchpoints). | Contagem de transicoes estado->estado + normalizacao por linha. | P: number[][] (estocástica) | ⭐⭐⭐⭐ | PASS |
| `removalEffect(matrix, channelState, startState, convState): number` | Removal effect: fracao de conversoes atribuida a um canal via Markov Chain. | RE(c) = (P_base - P_removed) / P_base. P via power iteration ate convergencia. | [0, 1] | ⭐⭐⭐⭐⭐ | PASS |

**Consumido por:** Pagina de atribuicao multi-touch.

---

## 14. rules-engine.ts

**Proposito:** Motor de regras de automacao para campanhas Meta Ads. Story US-64.

| Funcao | Proposito | Formula/Algoritmo | Range | Negocio | Teste |
|--------|-----------|-------------------|-------|---------|-------|
| `extractCampaignMetrics(campaign): Record<RuleMetric, number>` | Extrai metricas flat de campaign insights: CPA, ROAS, CTR, CPC, CPM, spend, conversions, impressions, frequency. | Parse de insights + soma de actions de conversao + ROAS de purchase_roas. | Record numerico | ⭐⭐⭐⭐ | PASS |
| `evaluateCondition(condition, metrics): boolean` | Avalia uma condicao (metric op value) contra metricas extraidas. | Operadores: gt, gte, lt, lte, eq (com tolerancia 0.001) | boolean | ⭐⭐⭐ | PASS |
| `evaluateRule(rule, campaign): boolean` | Avalia todas as condicoes de uma regra (logica AND). Retorna true se TODAS passam. | every(condition => evaluateCondition(c, metrics)) | boolean | ⭐⭐⭐⭐ | PASS |
| `simulateRule(rule, campaigns): RuleSimulationResult` | Simula execucao de regra em todas campanhas alvo sem aplicar acoes. | Map de campanhas + evaluateRule + formatAction | simulation result | ⭐⭐⭐⭐⭐ | PASS |
| `formatCondition(c): string` | Formata condicao para exibicao: "CPA > 50". | Label lookup | string | ⭐⭐ | PASS |
| `formatAction(action, value?): string` | Formata acao para exibicao: "Aumentar budget 20%". | Label lookup | string | ⭐⭐ | PASS |
| `formatConditionsSummary(conditions): string` | Formata todas condicoes: "CPA > 50 E ROAS < 1.5". | Join com " E " | string | ⭐⭐ | PASS |

**Consumido por:** Pagina de automacao, painel de regras.

---

## 15. sentiment.ts

**Proposito:** Analise de sentimento de comentarios em PT-BR com deteccao de buying intent, urgencia, linguagem sensorial e autoridade.

| Funcao | Proposito | Formula/Algoritmo | Range | Negocio | Teste |
|--------|-----------|-------------------|-------|---------|-------|
| `analyzeSingleComment(text, commentOwner?, postOwner?): {sentiment, positiveScore, negativeScore}` | Sentimento de um comentario: POSITIVE/NEUTRAL/NEGATIVE/BRAND_REPLY. Emojis valorem 0.5x, palavras 2.0x * effortMultiplier. | Regex PT-BR slang + emojis. effortMultiplier: 1-7 words=2.0x, 8-14=3.5x, 15+=5.0x | sentiment enum | ⭐⭐⭐⭐ | PASS |
| `analyzeCommentsSentiment(posts): {positive, neutral, negative, brand, pctPos, pctNeu, pctNeg, total, positivityMultiplier}` | Sentimento agregado de todos comentarios. Filtra brand replies. Percentuais baseados em contagem, nao scores. | Sum de categorias + positivityMultiplier = (pos + neu*0.5) / total + communityBonus | percentages | ⭐⭐⭐⭐⭐ | PASS |
| `detectBuyingIntent(comments): {intentComments, intentCount, intentRate}` | Detecta comentarios com intencao de compra via regex PT-BR ("onde compro", "quanto custa", "link", etc.). | 30+ keywords PT-BR de buying intent | intentRate: [0, 100] | ⭐⭐⭐⭐⭐ | PASS |
| `detectUrgencyTriggers(caption): {hasUrgency, triggers, count}` | Detecta gatilhos de urgencia/escassez (Cialdini): "ultimas vagas", "so hoje", "limitado". | 15+ keywords PT-BR de urgencia | boolean + count | ⭐⭐⭐⭐ | PASS |
| `sensoryLanguageScore(caption): {score, sensoryWords, count, classification}` | Detecta linguagem sensorial (Lindstrom): palavras visuais, auditivas, tateis, gustativas, olfativas. | Score = min(uniqueWords * 20, 100). >=3 = multisensorial. | [0, 100] | ⭐⭐⭐⭐ | PASS |
| `detectAuthoritySignals(caption): {hasAuthority, signals, count}` | Detecta sinais de autoridade (Cialdini): estatisticas, certificacoes, anos de experiencia. | Regex: numeros + "comprovado" + "especialista" + etc. | boolean + count | ⭐⭐⭐⭐ | PASS |

**Consumido por:** `causal-behavioral.ts`, Raio-X de sentimento, pagina de analytics.

---

## 16. insight-engine.ts

**Proposito:** Motor de alertas automaticos com priority queue (binary max-heap), scoring, deduplicacao e priorizacao. Story US-35.

| Funcao/Classe | Proposito | Formula/Algoritmo | Range | Negocio | Teste |
|--------|-----------|-------------------|-------|---------|-------|
| `kpiPointFromMAD(kpiId, values, entityId?, revenueBaseline?): KpiPoint \| null` | Popula KpiPoint a partir de MAD score. Mediana como expected, MAD*1.4826 como stdDev. | stdDev_consistente = MAD * 1.4826 (consistencia com Normal) | KpiPoint | ⭐⭐⭐ | PASS |
| `kpiPointFromForecast(kpiId, historicalValues, currentValue, ...): KpiPoint \| null` | Popula KpiPoint a partir de HW forecast. Primeiro ponto de forecast como expected. | holtWintersWithPI(h=1). residualStdDev como stdDev. | KpiPoint | ⭐⭐⭐ | PASS |
| `kpiPointFromABTest(kpiId, aClicks, aImpr, bClicks, bImpr, ...): KpiPoint \| null` | Verifica se A/B test tem vencedor. Z-score sintetico baseado em certeza bayesiana. | bayesianAB(). syntheticZ = (certainty - 0.5) * 10 | KpiPoint | ⭐⭐⭐⭐ | PASS |
| `kpiPointFromSTLCUSUM(kpiId, values, period?, entityId?): KpiPoint \| null` | Popula KpiPoint quando ultimo ponto trigou alarme CUSUM sobre residuos STL. US-51. | stlCusum(). expected = trend[t] + seasonal[t]. stdDev = MAD(residuals)*1.4826 | KpiPoint | ⭐⭐⭐⭐ | PASS |
| `class InsightQueue` | Fila de prioridade binary max-heap. push O(log n), pop O(log n), peek O(1). | Max-heap por score. toArray() retorna copia ordenada. | N/A | ⭐⭐⭐ | PASS |
| `class InsightEngine` | Motor principal: scoring, deduplicacao, priorizacao. Score = wSignal*signal + wImpact*impact. | z = (value-expected)/stdDev. signal = min(\|z\|/5, 1). impact = revenueImpact/cap. Cooldown 24h, 2x bypass. | score: number | ⭐⭐⭐⭐⭐ | PASS |
| `CONFIG_CONSERVATIVE` | Preset conservador (99% CI, cooldown 24h): zCritical=2.6, wSignal=0.6, wImpact=0.4. | Constante | EngineConfig | ⭐⭐⭐ | PASS |
| `CONFIG_SENSITIVE` | Preset sensivel (95% CI, cooldown 6h): zCritical=2.0, wSignal=0.7, wImpact=0.3. | Constante | EngineConfig | ⭐⭐⭐ | PASS |

**Consumido por:** Sistema de alertas, notifications.

---

## 17. isolation-forest.ts

**Proposito:** Deteccao de anomalias multivariadas via Isolation Forest. Story US-28.

| Funcao/Classe | Proposito | Formula/Algoritmo | Range | Negocio | Teste |
|--------|-----------|-------------------|-------|---------|-------|
| `class IsolationForest` | Isolation Forest completo: fit() + scoreSamples() + detect(). | Principio: anomalias sao facilmente isoladas por particoes aleatorias → caminhos mais curtos. | N/A | ⭐⭐⭐⭐⭐ | PASS |
| `.fit(data: Point[]): this` | Treina o modelo com dataset N x D. Constroi nTrees arvores com subamostra psi. | Fisher-Yates shuffle para subamostra. Arvore: split aleatorio em [min, max). maxDepth = ceil(log2(psi)). | this (chaining) | ⭐⭐⭐⭐ | PASS |
| `.scoreSamples(data: Point[]): number[]` | Calcula anomaly scores [0,1] para cada ponto. Proximo de 1 = anomalia. | score = 2^(-avgPathLen / c(psi)). c(n) = 2*H(n-1) - 2*(n-1)/n. H = ln + Euler-Mascheroni. | [0, 1] | ⭐⭐⭐⭐⭐ | PASS |
| `.detect(data, threshold?): IsolationForestResult` | Detecta anomalias: score > threshold (default 0.6). | Classificacao binaria sobre scoreSamples(). | boolean[] + scores | ⭐⭐⭐⭐⭐ | PASS |

**Consumido por:** Deteccao de anomalias em campanhas (multiplas metricas simultaneas).

---

## Legenda

| Simbolo | Significado |
|---------|-------------|
| ⭐ | Funcao utilitaria interna |
| ⭐⭐ | Funcao de suporte (usada por outros modulos) |
| ⭐⭐⭐ | Indicador util para analise |
| ⭐⭐⭐⭐ | Indicador importante para decisao de negocio |
| ⭐⭐⭐⭐⭐ | Indicador critico — impacto direto em receita/performance |
| PASS | Todos os testes do modulo passando (714 total) |

---

## Grafo de Dependencias entre Modulos

```
math-core.ts
  ├── statistics.ts (olsSimple)
  ├── advanced-indicators.ts (olsSimple)
  ├── mmm.ts (olsSimple)
  ├── bayesian-ab.ts (normalCDF)
  ├── incrementality.ts (normalCDF, normalQuantile, solveLinearSystem)
  ├── causal-behavioral.ts (olsSimple, normalCDF)
  └── creative-scorer.ts (clamp01)

anomaly-detection.ts
  ├── creative-scorer.ts (stlDecompose)
  └── insight-engine.ts (madScore, stlCusum)

forecasting.ts
  └── hw-optimizer.ts (holtWinters)

hw-optimizer.ts
  └── insight-engine.ts (holtWintersWithPI)

bayesian-ab.ts
  └── insight-engine.ts (bayesianAB)

sentiment.ts
  └── causal-behavioral.ts (detectBuyingIntent, detectUrgencyTriggers, sensoryLanguageScore)
```

---

*Catalogo gerado em 2026-03-15 a partir de leitura completa dos 17 modulos fonte.*
