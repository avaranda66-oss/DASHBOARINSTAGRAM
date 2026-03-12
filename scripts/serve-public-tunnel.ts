import express from 'express';
import path from 'path';
import { Tunnel, TryCloudflareHandler } from 'cloudflared';

const app = express();
const port = 3005;
const publicPath = path.join(process.cwd(), 'public');

app.use((req, res, next) => {
    console.log(`[Tunnel] ${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

app.use('/public', express.static(publicPath));

app.get('/health', (req, res) => {
    res.send('Static server is running');
});

const startServer = async () => {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    app.listen(port, async () => {
        console.log(`Local server running at http://localhost:${port}`);
        console.log(`Serving files from: ${publicPath}`);

        try {
            // Cloudflare Quick Tunnel — sem bypass page, sem conta necessária
            const cfTunnel = Tunnel.quick(`http://localhost:${port}`);
            new TryCloudflareHandler(cfTunnel);

            cfTunnel.once('url', async (tunnelUrl: string) => {
                const publicUrl = `${tunnelUrl}/public`;

                console.log(`\n***************************************************`);
                console.log(`PUBLIC URL FOR META API: ${publicUrl}`);
                console.log(`***************************************************\n`);

                // Aguardar 8s para o cloudflared estabilizar a conexão antes de liberar para o scheduler
                console.log('[Tunnel] Aguardando estabilização do túnel (8s)...');
                await new Promise(resolve => setTimeout(resolve, 8000));

                await prisma.setting.upsert({
                    where: { key: 'tunnel_url' },
                    update: { value: JSON.stringify(publicUrl) },
                    create: { key: 'tunnel_url', value: JSON.stringify(publicUrl) }
                });
                console.log(`[Tunnel] URL salva no banco de dados com sucesso.`);
            });

            cfTunnel.on('exit', async () => {
                console.log('[Tunnel] Cloudflare tunnel encerrado.');
                await prisma.setting.update({
                    where: { key: 'tunnel_url' },
                    data: { value: null }
                }).catch(() => { });
            });

            process.on('SIGINT', () => {
                cfTunnel.stop();
                process.exit(0);
            });
        } catch (err) {
            console.error('[Tunnel] Erro ao iniciar cloudflared:', err);
        }
    });
};

startServer().catch(console.error);
