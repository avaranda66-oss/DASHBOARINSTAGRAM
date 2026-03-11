# 10 Indicadores Estatísticos Avançados para Instagram (Small Data)

Bem-vindo ao observatório. Quando lidamos com *small data* (20-100 observações), a média é mentirosa e a mediana é preguiçosa. Precisamos de cálculos de alta sensibilidade para expor o que o algoritmo de distribuição do Instagram está realmente recompensando ou punindo.

Aqui estão 10 indicadores insanos para integrar no núcleo da sua dashboard.

---

### 1. Coeficiente de Atravessamento da Bolha ($\alpha_{vir}$)
*Mede não apenas a viralidade, mas a capacidade do conteúdo de escapar da audiência raiz (seguidores).*

**Fórmula:**  
$\alpha_{vir} = \frac{Reach - Followers}{Followers + 1}$ 
*(Se $\alpha_{vir} > 0$, o post atingiu não-seguidores. Se $\alpha_{vir} > 1$, atingiu 2x mais pessoas que sua base)*

**Interpretação:**  
Mostra a ressonância do algoritmo. Valores negativos mostram que o Instagram bloqueou a entrega na sua própria base.
**Exemplo Real:** 5.000 followers, Reach = 12.500. $\alpha_{vir} = (12500 - 5000) / 5001 = 1.49$. O post quebrou a bolha.
**Visualização:** Um *Dotted Scatter Plot*. Eixo Y = Coeficiente, Eixo X = Tempo. Uma linha zero cruza o meio; pontos acima do zero romperam a bolha.

---

### 2. Índice de Gravidade de Retenção ($G_{ret}$)
*Um score composto onde o "peso" da interação determina a lealdade/profundidade do impacto.*

**Fórmula:**  
$G_{ret} = \frac{(Likes \times 1) + (Comments \times 3) + (Shares \times 5) + (Saves \times 8)}{Reach} \times 100$

**Interpretação:**  
O alcance (Reach) mascara um conteúdo vazio. Este índice pune "caixa vazia" (alto alcance, baixa fricção de salvamento). Salvamentos recebem peso 8 por exigirem maior "intenção mental" de retorno futuro.
**Exemplo Real:** Reach=10k, Likes=500, Comm=20, Shares=10, Saves=50. $G_{ret} = (500 + 60 + 50 + 400) / 10000 \times 100 = 10.1$.
**Visualização:** *Waterfall Chart* horizontal mostrando a contribuição de cada fator (verde pra saves, ocre pra likes, etc) no peso do post.

---

### 3. Variação Estocástica de Engajamento ($\sigma_{E}$)
*Mede se seu criador de conteúdo produz resultados consistentes ou é uma roleta-russa.*

**Fórmula:**  
$\sigma_{E} = \sqrt{ \frac{1}{N} \sum_{i=1}^{N} (E_i - \mu_E)^2 }$ (Desvio Padrão do Engajamento Rate normalizado)
*Onde $E_i = (Interactions_i / Reach_i)$.*

**Interpretação:**  
Uma variância muito alta ($\sigma_{E}$) significa que a audiência está confusa. As vezes o post explode, as vezes flopa. Variância baixa = audiência fiel e consistente.
**Exemplo Real:** $\sigma_{E} = 0.05$ (Baixo, alta previsibilidade); $\sigma_{E} = 0.42$ (Alta imprevisibilidade).
**Visualização:** *Box Plot* minimalista ou área de sombreamento cinza ao redor da linha de tendência de engajamento (Bollinger Bands caseiras).

---

### 4. Coeficiente de Decomposição Magnética ($\lambda_{decay}$)
*Calcula a taxa instantânea na qual o engajamento 'morre' nos seus últimos posts.*

**Fórmula:**  
Assumindo um decaimento exponencial: $Reach(t) = Reach_0 \cdot e^{-\lambda t}$. (Resolvemos via Regressão Linear sobre o logaritmo da performance dos últimos $n$ posts).
Se não tem série temporal granular, medimos no nível macro:
$\lambda = - \frac{\ln(E_{recente} / \mu_{antigo})}{\Delta t}$

**Interpretação:**  
Revela "fadiga de audiência". Se o $\lambda$ é muito grande e negativo rapidamente, o formato atual do conteúdo secou para o algoritmo.
**Visualização:** Gráfico tipo *Sparkline* declinante onde a área por baixo (área sob a curva) fica vermelha/dusty rose dependendo da gravidade, com um badge de "Fadiga Estimada".

---

### 5. Sensibilidade Sintática de Hashtags ($H_{corr\_index}$)
*Qual hashtag tem a melhor performance condicional no seu cluster de dados?*

**Fórmula:**  
Score de uma hashtag $j$:  
$H_{j} = \frac{\mu(Reach | \text{post contém } j)}{\mu(Reach | \text{post não contém } j)}$

**Interpretação:**  
Se $H_{j} = 1.8$, adicionar a `#brutalism` aumenta estatisticamente o seu alcance esperado em 80% comparado a não usar. Abaixo de 1.0 é detratora (shadowban ou irrelevante).
**Exemplo Real:** Média sem `#design` = 2000 reach. Média com `#design` = 1200. $H = 0.6$ (tóxica no seu dataset).
**Visualização:** Gráfico de *Barra Divergente* (Horizontal). Eixo zero no 1. Barras pra direita (Verdes/Sage) são propulsoras, barras pra esquerda (Ocre/Vermelha) são hashtags âncora/detratoras.

---

### 6. Vetor de ROI de Esforço Formativo ($\mathbf{v}_{ROI}$)
*O formato x versus y: Qual dá o maior retorno por fricção de criação calculada heurísticamente?*

**Fórmula:**  
Atribua pesos de esforço: ($W_{img} = 1, W_{carousel} = 2.5, W_{video} = 4$)
$\mathbf{v}_{ROI}(\text{Type}) = \frac{\text{Mediana}(G_{ret} \text{ para o Type})}{\text{Peso do Type}(W)}$

**Interpretação:**  
Mostra a eficiência implacável. Às vezes o Reels (vídeo) dá muito mais alcance, mas quando você divide pelo *peso/tempo* de produção, as 3 imagens estáticas no Carrossel produzem um ROI gravidade/esforço muito superior.
**Exemplo Real:** $v_{img} = 8.5/1 = 8.5$. $v_{video} = 12/4 = 3.0$. Focar em imagens puras é mais eficiente para o seu tempo.
**Visualização:** Um Gráfico de Dispersão Quadrante 2x2: Eixo Y = Retorno, Eixo X = Esforço Estimado.

---

### 7. Distribuição de Densidade Temporal Concentrada (TCD)
*Mapeamento do horário de pico ótimo cruzado por interação/hora.*

**Fórmula:**  
Cálculo de KDE (Kernel Density Estimation) dos timestamps ponderados pelo Reach do respectivo post.
(Abordagem simples para React: $TCD_{hora} = \sum (\text{Reach}_{post} \text{ se Post é na hora } H) / \text{Nº de posts na hora } H$).

**Interpretação:**  
Mata o mito do "postar às 18h". Encontra as anomalias estocásticas de quando sua demografia exata acorda ou não faz nada e entra no app.
**Visualização:** *Heatmap / Punchcard* semanal monocromático (opacidade dos blocos baseada no TCD).

---

### 8. Posição no Abismo Quantílico ($Q_{pos}$)
*Exclui a média inútil. Em qual estrato absoluto (0 a 100 percentil) da sua própria história este post específico caiu.*

**Fórmula:**  
$Q_{pos} = \frac{\text{Contagem}(Reach_{all} \le Reach_{post})}{N} \times 100$

**Interpretação:**  
"Este post está no $85^{th}$ percentil da sua história." Significa que ele é melhor do que 85% de tudo que você já fez. A média (sendo alavancada por outliers) diria que o post é apenas "ok", mas os quantis te dizem a verdade medular da sua constância.
**Visualização:** Um velocímetro elegante de linha única (tipo semicírculo), de 0 a 100, indicando a "nota final" do post atual onde 50 é o meridiano.

---

### 9. EMA-7 (Exponential Moving Average 7 posts) de Estabilidade Óptica
*Uma média móvel do engajamento que dá mais peso para os posts imediatos e "esquece" o passado longínquo.*

**Fórmula:**  
$EMA_{hoje} = (E_{post} \times \frac{2}{1+7}) + EMA_{ontem} \times (1 - \frac{2}{1+7})$

**Interpretação:**  
Você posta um flop absurdo. Se a média móvel simples reagir de forma violenta, é mentira; uma queda brusca num único post raramente mata o momento num log-algo estocástico. Isso rastreia a **inércia algorítmica** da sua conta de verdade.
**Visualização:** O gráfico Premium de onda com *AreaChart* (como o que desenvolvi no ChartCard) exibindo a linha fantasma por cima das barras da linha do tempo.

---

### 10. Métrica Global de Ressonância Termodinâmica ($H_{core}$)
*Se você pudesse ver 1 único score na Dashboard inteira condensando todos os 9.*

**Fórmula:**  
Uma normalização em \textit{z-scores} multivariada:  
$H_{core} = (0.4 \times z(EMA_7)) + (0.3 \times z(\alpha_{vir})) + (0.3 \times z(G_{ret}))$ 
(Onde $z$ é $(valor - \text{media})/\text{desvio padrão}$)
Mapeamos o limite de $-3$ a $+3$ numa escala de 0 a 100 para o usuário final.

**Interpretação:**  
A "temperatura do núcleo" (Core Temperature) da sua conta. Abaixo de 40: conta "morta", algoritmo te odeia. Entre 40-70: tração padrão. Acima de 80: conta "incandescente" no feed, a hora exata para dobrar a verba ou postar intensamente, capitalizando na hiper-alavanca.
**Visualização:** Um painel circular no grid Overview (como o Big Block do Bento), pulsando letargicamente entre vermelho profundo (danger) ou coral forte (accent) se a temperatura ultrapassar de 80.
