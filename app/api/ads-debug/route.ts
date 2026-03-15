/**
 * /api/ads-debug — Endpoint de inspeção local (apenas NODE_ENV=development)
 *
 * Retorna o raw da Meta API sem processamento para validar campos, valores
 * e estrutura dos dados. Use via DevTools ou curl enquanto roda npm run dev.
 *
 * Exemplo de uso no Console do Browser:
 *   fetch('/api/ads-debug', {
 *     method: 'POST',
 *     headers: {'Content-Type': 'application/json'},
 *     body: JSON.stringify({ token: 'SEU_TOKEN', accountId: 'act_XXXXXX', datePreset: 'last_30d', target: 'insights' })
 *   }).then(r => r.json()).then(console.log)
 *
 * Targets disponíveis:
 *   insights    — Raw insights por campanha (campaign level)
 *   account     — Raw insights nível conta (account level) — usado para delta
 *   daily       — Raw insights diários (account level, time_increment=1)
 *   campaigns   — Raw lista de campanhas
 *   adsets      — Raw lista de adsets
 *   account_info — Info da conta (moeda, nome, etc.)
 */
import { NextRequest, NextResponse } from 'next/server';

const GRAPH_BASE = 'https://graph.facebook.com/v25.0';

const INSIGHTS_FIELDS = [
    'campaign_id', 'campaign_name', 'adset_id', 'adset_name',
    'impressions', 'clicks', 'spend', 'cpc', 'cpm', 'ctr', 'reach', 'frequency',
    'outbound_clicks', 'outbound_clicks_ctr',
    'actions', 'cost_per_action_type', 'purchase_roas',
    'date_start', 'date_stop', 'objective', 'account_currency',
].join(',');

async function metaGet(path: string, token: string, params: Record<string, string> = {}) {
    const url = new URL(`${GRAPH_BASE}/${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    url.searchParams.set('access_token', token);
    const res = await fetch(url.toString(), { next: { revalidate: 0 } });
    return res.json();
}

export async function POST(req: NextRequest) {
    // Bloquear em produção
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Debug endpoint disponível apenas em desenvolvimento.' }, { status: 403 });
    }

    const body = await req.json();
    const { token, accountId, datePreset = 'last_30d', timeRange, target = 'insights' } = body;

    if (!token || !accountId) {
        return NextResponse.json({ error: 'token e accountId são obrigatórios.' }, { status: 400 });
    }

    const timeParams: Record<string, string> = timeRange
        ? { time_range: JSON.stringify(timeRange) }
        : { date_preset: datePreset };

    try {
        let raw: any;
        let description: string;

        switch (target) {
            case 'insights':
                description = `Insights nível campanha — ${datePreset || `${timeRange?.since} → ${timeRange?.until}`}`;
                raw = await metaGet(`${accountId}/insights`, token, {
                    fields: INSIGHTS_FIELDS,
                    level: 'campaign',
                    limit: '50',
                    ...timeParams,
                });
                break;

            case 'account':
                description = `Insights nível conta (usado para delta) — ${datePreset}`;
                raw = await metaGet(`${accountId}/insights`, token, {
                    fields: INSIGHTS_FIELDS,
                    level: 'account',
                    limit: '10',
                    ...timeParams,
                });
                break;

            case 'daily':
                description = `Insights diários (time_increment=1) — ${datePreset}`;
                raw = await metaGet(`${accountId}/insights`, token, {
                    fields: INSIGHTS_FIELDS,
                    level: 'account',
                    time_increment: '1',
                    limit: '100',
                    ...timeParams,
                });
                break;

            case 'campaigns':
                description = 'Lista de campanhas (sem insights)';
                raw = await metaGet(`${accountId}/campaigns`, token, {
                    fields: 'id,name,status,effective_status,objective,daily_budget,lifetime_budget,budget_remaining,created_time',
                    limit: '100',
                });
                break;

            case 'adsets':
                description = 'Lista de adsets';
                raw = await metaGet(`${accountId}/adsets`, token, {
                    fields: 'id,name,campaign_id,status,effective_status,daily_budget,optimization_goal,billing_event',
                    limit: '100',
                });
                break;

            case 'account_info':
                description = 'Informações da conta';
                raw = await metaGet(accountId, token, {
                    fields: 'id,name,currency,account_status,amount_spent,balance,spend_cap,timezone_name,business',
                });
                break;

            default:
                return NextResponse.json({ error: `Target desconhecido: ${target}. Use: insights, account, daily, campaigns, adsets, account_info` }, { status: 400 });
        }

        // Análise rápida dos dados retornados
        const analysis = analyzeRaw(raw, target);

        return NextResponse.json({
            target,
            description,
            params: { datePreset, timeRange, accountId: accountId.replace('act_', 'act_****') },
            analysis,
            raw,
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

function analyzeRaw(raw: any, target: string) {
    if (!raw) return { error: 'Resposta vazia' };
    if (raw.error) return { metaError: raw.error };

    const data: any[] = raw.data || (Array.isArray(raw) ? raw : [raw]);

    if (target === 'account_info') {
        return {
            currency: raw.currency,
            accountStatus: raw.account_status,
            amountSpent: raw.amount_spent,
            timezone: raw.timezone_name,
        };
    }

    if (data.length === 0) {
        return { rowCount: 0, warning: 'API retornou 0 linhas — sem atividade no período ou período muito curto' };
    }

    // Amostra do primeiro item para inspeção
    const first = data[0];
    const analysis: any = {
        rowCount: data.length,
        paging: raw.paging ? { hasNext: !!raw.paging.next, cursors: !!raw.paging.cursors } : null,
    };

    if (target === 'insights' || target === 'account' || target === 'daily') {
        // Verificar quais campos têm dados
        const fieldsWithData: string[] = [];
        const fieldsEmpty: string[] = [];
        const checkFields = ['impressions', 'clicks', 'spend', 'cpc', 'cpm', 'ctr', 'reach', 'actions', 'outbound_clicks_ctr', 'purchase_roas'];
        for (const f of checkFields) {
            const val = first[f];
            if (val === undefined || val === null) fieldsEmpty.push(f);
            else if (Array.isArray(val) && val.length === 0) fieldsEmpty.push(`${f}(empty_array)`);
            else fieldsWithData.push(f);
        }

        // Totais rápidos
        const totalSpend = data.reduce((s, r) => s + (parseFloat(r.spend) || 0), 0);
        const totalImpressions = data.reduce((s, r) => s + (parseInt(r.impressions) || 0), 0);
        const totalClicks = data.reduce((s, r) => s + (parseInt(r.clicks) || 0), 0);

        // Tipos de actions encontrados
        const actionTypes = new Set<string>();
        data.forEach(r => (r.actions || []).forEach((a: any) => actionTypes.add(a.action_type)));

        // outbound_clicks_ctr — verificar formato
        const outboundCtrSample = first.outbound_clicks_ctr;

        analysis.totals = {
            spend: totalSpend.toFixed(2),
            impressions: totalImpressions,
            clicks: totalClicks,
            avgCtr: first.ctr,
            avgCpm: first.cpm,
        };
        analysis.fieldsWithData = fieldsWithData;
        analysis.fieldsEmpty = fieldsEmpty;
        analysis.actionTypesFound = Array.from(actionTypes);
        analysis.outboundCtrFormat = outboundCtrSample
            ? `Array com ${outboundCtrSample.length} item(s): ${JSON.stringify(outboundCtrSample[0])}`
            : 'ausente';
        analysis.firstRowSample = {
            campaign_id: first.campaign_id,
            campaign_name: first.campaign_name,
            impressions: first.impressions,
            spend: first.spend,
            ctr: first.ctr,
            outbound_clicks_ctr: first.outbound_clicks_ctr,
            purchase_roas: first.purchase_roas,
            date_start: first.date_start,
            date_stop: first.date_stop,
        };
    }

    if (target === 'campaigns') {
        analysis.statusBreakdown = data.reduce((acc: any, c) => {
            acc[c.effective_status] = (acc[c.effective_status] || 0) + 1;
            return acc;
        }, {});
        analysis.campaignNames = data.map((c: any) => `${c.name} (${c.effective_status})`);
    }

    return analysis;
}
