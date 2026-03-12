export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // Limpar tunnel_url ao iniciar — evita race condition onde o scheduler usa
        // a URL antiga do processo anterior antes do serve-public-tunnel.ts estabelecer o novo túnel.
        try {
            const prisma = await import('./lib/db');
            await prisma.default.setting.upsert({
                where: { key: 'tunnel_url' },
                update: { value: null },
                create: { key: 'tunnel_url', value: null }
            });
            console.log('[Instrumentation] tunnel_url limpa — aguardando novo túnel.');
        } catch { /* se o DB não existir ainda, ignorar */ }

        const { SchedulerService } = await import('./lib/services/scheduler.service');
        SchedulerService.start();
    }
}
