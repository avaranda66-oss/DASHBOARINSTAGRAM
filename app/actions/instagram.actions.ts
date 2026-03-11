'use server';

import { InstagramService } from '@/lib/services/instagram.service';
import prisma from '@/lib/db';
import { exec } from 'child_process';
import path from 'path';

export async function checkInstagramLoginAction(): Promise<boolean> {
    try {
        return await InstagramService.checkLoginStatus();
    } catch (e) {
        console.error(e);
        return false;
    }
}

export async function loginInstagramAction(): Promise<boolean> {
    return new Promise((resolve) => {
        try {
            const cwd = process.cwd();
            // Evita bug de aspas no CMD: mudamos de diretório primeiro e mandamos rodar o script relativo
            exec(`start cmd.exe /K "cd /d "${cwd}" && node scripts/playwright-login.js"`, (error) => {
                if (error) {
                    console.error("Erro ao iniciar script de login:", error);
                    resolve(false);
                    return;
                }
                resolve(true);
            });
        } catch (e) {
            console.error(e);
            resolve(false);
        }
    });
}

export async function publishInstagramPostAction(contentId: string, handle?: string): Promise<{ success: boolean; message: string }> {
    try {
        const content = await prisma.content.findUnique({
            where: { id: contentId }
        });

        if (!content) throw new Error("Post não encontrado no banco.");

        // Obter mídia
        const mediaArr = content.mediaUrls ? JSON.parse(content.mediaUrls) : [];
        if (mediaArr.length === 0) {
            throw new Error("Agendamento falhou: Nenhuma imagem nesse post para enviar.");
        }

        const imageUrls = mediaArr; // Array com todas as imagens do post

        const titleText = content.title ? `${content.title}\n\n` : "";
        const descText = content.description ? `${content.description}\n\n` : "";

        let tagsText = "";
        try {
            const parsedTags = content.hashtags ? JSON.parse(content.hashtags) : [];
            if (Array.isArray(parsedTags) && parsedTags.length > 0) {
                tagsText = parsedTags.map(t => t.startsWith('#') ? t : `#${t}`).join(' ');
            }
        } catch (e) { }

        // Passa a legenda formatada
        const caption = `${titleText}${descText}${tagsText}`.trim();

        // Chamar o bot baseando-se no tipo de conteúdo
        let success = false;
        const targetHandle = handle || content.accountId || "default";
        const normalizedType = (content.type || 'post').toLowerCase();

        if (normalizedType === 'story') {
            console.log(`[Action] Detectado tipo STORY para ${contentId}. Chamando publishStory...`);
            // publishStory espera apenas uma URL de imagem
            success = await InstagramService.publishStory(targetHandle, imageUrls[0]);
        } else if (normalizedType === 'reel') {
            console.log(`[Action] Detectado tipo REEL para ${contentId}. Chamando publishReel...`);
            success = await InstagramService.publishReel(targetHandle, imageUrls[0], caption);
        } else {
            console.log(`[Action] Detectado tipo ${content.type} para ${contentId}. Chamando publishPost...`);
            success = await InstagramService.publishPost(targetHandle, imageUrls, caption);
        }

        if (success) {
            // Atualizar status no banco SQLite local
            await prisma.content.update({
                where: { id: contentId },
                data: { status: 'published' }
            });
            return { success: true, message: "Post publicado de verdade e status atualizado para 'Published'." };
        }

        return { success: false, message: "Erro desconhecido na publicação." };
    } catch (e: any) {
        console.error("publishInstagramPostAction erro:", e);
        return { success: false, message: e.message || "Erro interno." };
    }
}
