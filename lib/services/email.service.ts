import nodemailer from 'nodemailer';

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

        console.log(`[email.service] Relatório enviado para ${opts.to}`);
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
