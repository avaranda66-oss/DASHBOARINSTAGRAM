import nodemailer from 'nodemailer';
import type { AlertCondition } from '@/lib/services/alert-engine.service';

// ─── US-60 — Email Service via Gmail SMTP ────────────────────────────────────
//
// Requer variáveis de ambiente:
//   GMAIL_USER     — email completo (ex: seuemail@gmail.com)
//   GMAIL_APP_PASS — senha de app do Google (16 caracteres)
//
// Como obter a App Password:
//   1. myaccount.google.com/security
//   2. Ativar verificação em 2 etapas
//   3. Pesquisar "Senhas de app" → criar senha para "Dashboard OSS"
//   4. Copiar os 16 caracteres → colar em GMAIL_APP_PASS no .env

interface SendReportOptions {
    to: string;
    subject: string;
    pdfBuffer: Buffer;
    filename: string;
    accountName?: string;
    period?: string;
}

function createTransporter() {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASS;

    if (!user || !pass) {
        throw new Error(
            'GMAIL_USER e GMAIL_APP_PASS não configurados. Adicione ao .env.',
        );
    }

    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: { user, pass },
    });
}

export async function sendReportEmail(opts: SendReportOptions): Promise<boolean> {
    try {
        const transporter = createTransporter();
        const from = process.env.GMAIL_USER!;
        const accountLabel = opts.accountName || 'Conta';
        const periodLabel = opts.period || 'último período';

        await transporter.sendMail({
            from: `"Dashboard OSS" <${from}>`,
            to: opts.to,
            subject: opts.subject,
            html: `
                <div style="font-family: system-ui, sans-serif; color: #1a1a1a; max-width: 600px;">
                    <h2 style="margin: 0 0 8px 0;">Relatório de Ads — ${accountLabel}</h2>
                    <p style="color: #666; font-size: 14px; margin: 0 0 16px 0;">
                        Período: ${periodLabel}
                    </p>
                    <p style="font-size: 14px;">
                        Seu relatório de performance está em anexo no formato PDF.
                    </p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                    <p style="font-size: 11px; color: #999;">
                        Enviado automaticamente pelo Dashboard OSS · ADS_ENGINE_V2
                    </p>
                </div>
            `,
            attachments: [
                {
                    filename: opts.filename,
                    content: opts.pdfBuffer,
                    contentType: 'application/pdf',
                },
            ],
        });

        return true;
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Erro desconhecido';
        console.error(`[email.service] Falha ao enviar email:`, message);
        return false;
    }
}

export function isEmailConfigured(): boolean {
    return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASS);
}

// ─── US: predictive-alert-loop — Alert Email ──────────────────────────────────

const SEVERITY_STYLES: Record<string, { bg: string; color: string; label: string }> = {
    critical: { bg: '#2D0A0A', color: '#EF4444', label: 'CRÍTICO' },
    warning:  { bg: '#2D1F0A', color: '#FBBF24', label: 'ATENÇÃO' },
    info:     { bg: '#0A1A0A', color: '#A3E635', label: 'INFO' },
};

export async function sendAlertEmail(
    alerts: AlertCondition[],
    accountName: string,
    recipient: string,
): Promise<boolean> {
    try {
        const transporter = createTransporter();
        const from = process.env.GMAIL_USER!;

        const criticals = alerts.filter(a => a.severity === 'critical');
        const warnings  = alerts.filter(a => a.severity === 'warning');
        const infos     = alerts.filter(a => a.severity === 'info');

        const renderRows = (items: AlertCondition[]) =>
            items.map(a => {
                const s = SEVERITY_STYLES[a.severity] ?? SEVERITY_STYLES.info;
                return `
                <tr style="border-bottom: 1px solid #1a1a1a;">
                    <td style="padding: 10px 12px; background: ${s.bg}; width: 80px;">
                        <span style="color: ${s.color}; font-weight: bold; font-size: 11px; font-family: monospace;">
                            ${s.label}
                        </span>
                    </td>
                    <td style="padding: 10px 12px; font-size: 13px; color: #e5e5e5;">
                        ${a.message}
                    </td>
                    <td style="padding: 10px 12px; font-size: 11px; color: #888; white-space: nowrap; font-family: monospace;">
                        ${a.metric}: ${a.currentValue.toFixed(2)} / ${a.threshold.toFixed(2)}
                    </td>
                </tr>`;
            }).join('');

        const allRows = [...criticals, ...warnings, ...infos];
        const subject = `⚠ [${allRows.length}] alertas detectados — ${accountName}`;

        await transporter.sendMail({
            from: `"Dashboard OSS" <${from}>`,
            to: recipient,
            subject,
            html: `
                <div style="font-family: system-ui, sans-serif; background: #0a0a0a; color: #f5f5f5; max-width: 680px; padding: 24px; border-radius: 8px;">
                    <h2 style="margin: 0 0 4px 0; font-size: 18px; color: #f5f5f5;">
                        Alerta Automático — ${accountName}
                    </h2>
                    <p style="color: #666; font-size: 13px; margin: 0 0 20px 0;">
                        ${allRows.length} alertas detectados · ${new Date().toLocaleString('pt-BR')}
                    </p>

                    <table style="width: 100%; border-collapse: collapse; background: #111;">
                        <thead>
                            <tr style="background: #1a1a1a;">
                                <th style="padding: 8px 12px; text-align: left; font-size: 10px; color: #555; font-family: monospace; letter-spacing: 0.1em;">SEV</th>
                                <th style="padding: 8px 12px; text-align: left; font-size: 10px; color: #555; font-family: monospace; letter-spacing: 0.1em;">MENSAGEM</th>
                                <th style="padding: 8px 12px; text-align: left; font-size: 10px; color: #555; font-family: monospace; letter-spacing: 0.1em;">MÉTRICA</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${renderRows(allRows)}
                        </tbody>
                    </table>

                    <hr style="border: none; border-top: 1px solid #1a1a1a; margin: 24px 0;" />
                    <p style="font-size: 11px; color: #444; font-family: monospace;">
                        Dashboard OSS · Alertas automáticos · ADS_ENGINE_V2
                    </p>
                </div>
            `,
        });

        return true;
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Erro desconhecido';
        console.error(`[email.service] Falha ao enviar alert email:`, message);
        return false;
    }
}
