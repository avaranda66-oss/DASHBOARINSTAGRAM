export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { SchedulerService } = await import('./lib/services/scheduler.service');
        // Iniciar o agendador automático
        SchedulerService.start();
    }
}
