import { z } from 'zod';

export const businessInfoSchema = z.object({
    businessType: z.string().max(100).optional(),
    address: z.string().max(300).optional(),
    phone: z.string().max(50).optional(),
    hours: z.string().max(500).optional(),
    website: z.string().max(300).optional(),
    extras: z.string().max(1000).optional(),
});

export type BusinessInfo = z.infer<typeof businessInfoSchema>;

export const accountSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório').max(100),
    handle: z.string().min(1, 'Handle (@) é obrigatório').max(50),
    password: z.string().nullable().optional(),
    oauthToken: z.string().nullable().optional(),
    adsToken: z.string().nullable().optional(),
    adsAccountId: z.string().nullable().optional(),
    avatarUrl: z.string().url('URL inválida').or(z.literal('')).nullable(),
    notes: z.string().max(2000).nullable().optional(),
    businessInfo: businessInfoSchema.optional(),
});

export type AccountFormData = z.infer<typeof accountSchema>;

export function serializeBusinessInfo(info: BusinessInfo): string | null {
    const hasAny = Object.values(info).some((v) => v && v.trim() !== '');
    if (!hasAny) return null;
    return JSON.stringify(info);
}

export function parseBusinessInfo(notes: string | null): BusinessInfo {
    if (!notes) return {};
    try {
        const parsed = JSON.parse(notes);
        if (typeof parsed === 'object' && parsed !== null) return parsed as BusinessInfo;
        // Legacy free-text notes
        return { extras: notes };
    } catch {
        // Legacy free-text notes — store in extras
        return { extras: notes };
    }
}

export function formatBusinessInfoForAI(notes: string | null): string {
    if (!notes) return '';
    const info = parseBusinessInfo(notes);
    const lines: string[] = [];
    if (info.businessType) lines.push(`Tipo de negócio: ${info.businessType}`);
    if (info.address) lines.push(`Endereço: ${info.address}`);
    if (info.phone) lines.push(`Telefone/WhatsApp: ${info.phone}`);
    if (info.hours) lines.push(`Horário de funcionamento: ${info.hours}`);
    if (info.website) lines.push(`Site/Cardápio: ${info.website}`);
    if (info.extras) lines.push(`Observações: ${info.extras}`);
    return lines.join('\n');
}
