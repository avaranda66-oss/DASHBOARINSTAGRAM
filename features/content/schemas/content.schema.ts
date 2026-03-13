import { z } from 'zod';

export const contentSchema = z.object({
    title: z.string().min(1, 'Título obrigatório').max(100, 'Máximo 100 caracteres'),
    description: z.string().max(2200, 'Máximo 2200 caracteres').nullable().optional(),
    type: z.enum(['post', 'story', 'reel', 'carousel', 'campaign']),
    status: z.enum(['idea', 'draft', 'approved', 'scheduled', 'published', 'failed']),
    scheduledAt: z.string().nullable().optional(),
    accountId: z.string().nullable().optional(),
    hashtags: z.array(z.string()).max(30, 'Máximo 30 hashtags'),
    mediaUrls: z.array(z.string()),
    collectionIds: z.array(z.string()),
});

export type ContentFormData = z.infer<typeof contentSchema>;
