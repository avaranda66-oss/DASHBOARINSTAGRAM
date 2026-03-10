import { z } from 'zod';

export const accountSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório').max(100),
    handle: z.string().min(1, 'Handle (@) é obrigatório').max(50),
    password: z.string().nullable().optional(),
    avatarUrl: z.string().url('URL inválida').or(z.literal('')).nullable(),
    notes: z.string().max(500).nullable(),
});

export type AccountFormData = z.infer<typeof accountSchema>;
