import { NextRequest, NextResponse } from 'next/server';
import { updateCampaignStatus, updateCampaignBudget, updateAdSetStatus } from '@/lib/services/facebook-ads.service';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { token, action, targetId, status, dailyBudget, lifetimeBudget } = body;

        if (!token || !action || !targetId) {
            return NextResponse.json(
                { success: false, error: 'Token, action e targetId são obrigatórios.' },
                { status: 400 },
            );
        }

        let result = false;

        switch (action) {
            case 'campaign_status':
                if (!['ACTIVE', 'PAUSED', 'ARCHIVED'].includes(status)) {
                    return NextResponse.json({ success: false, error: 'Status inválido.' }, { status: 400 });
                }
                result = await updateCampaignStatus(token, targetId, status);
                break;

            case 'campaign_budget':
                result = await updateCampaignBudget(token, targetId, dailyBudget, lifetimeBudget);
                break;

            case 'adset_status':
                if (!['ACTIVE', 'PAUSED', 'ARCHIVED'].includes(status)) {
                    return NextResponse.json({ success: false, error: 'Status inválido.' }, { status: 400 });
                }
                result = await updateAdSetStatus(token, targetId, status);
                break;

            default:
                return NextResponse.json({ success: false, error: `Ação desconhecida: ${action}` }, { status: 400 });
        }

        return NextResponse.json({ success: result });
    } catch (e: any) {
        console.error('[ads-actions] Erro:', e);
        return NextResponse.json(
            { success: false, error: e.message || 'Erro interno.' },
            { status: 500 },
        );
    }
}
