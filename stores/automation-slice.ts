import { create } from 'zustand';
import { toast } from 'sonner';
import { publishInstagramPostAction } from '@/app/actions/instagram.actions';
import { useContentStore } from './content-slice';
import { useAccountStore } from './account-slice';

export interface QueueItem {
    id: string;
    contentId: string;
    title: string;
    type: 'post' | 'story';
    status: 'pending' | 'processing' | 'completed' | 'failed';
    error?: string;
}

interface AutomationState {
    queue: QueueItem[];
    isProcessing: boolean;
    addToQueue: (contentId: string, title: string, type?: 'post' | 'story') => void;
    removeFromQueue: (id: string) => void;
    clearQueue: () => void;
    processNext: () => Promise<void>;
}

export const useAutomationStore = create<AutomationState>()((set, get) => ({
    queue: [],
    isProcessing: false,

    addToQueue: (contentId, title, type = 'post') => {
        const id = Math.random().toString(36).substring(7);
        const newItem: QueueItem = {
            id,
            contentId,
            title,
            type,
            status: 'pending',
        };

        set((state) => ({ queue: [...state.queue, newItem] }));
        toast.success(`Adicionado à fila: ${title}`);

        // Inicia o processamento se não houver nada rodando
        if (!get().isProcessing) {
            get().processNext();
        }
    },

    removeFromQueue: (id) => {
        set((state) => {
            const item = state.queue.find(i => i.id === id);
            if (item?.status === 'processing') return state; // Não remove o que está rodando
            return { queue: state.queue.filter((i) => i.id !== id) };
        });
    },

    clearQueue: () => {
        set((state) => ({
            queue: state.queue.filter(i => i.status === 'processing')
        }));
    },

    processNext: async () => {
        const { queue, isProcessing } = get();
        if (isProcessing) return;

        const nextItem = queue.find((i) => i.status === 'pending');
        if (!nextItem) {
            set({ isProcessing: false });
            return;
        }

        set({ isProcessing: true });

        // Atualiza status do item conforme o processamento
        set((state) => ({
            queue: state.queue.map(i => i.id === nextItem.id ? { ...i, status: 'processing' } : i)
        }));

        try {
            toast.info(`Processando: ${nextItem.title}`);

            // Buscar handle da conta associada ao post
            const content = useContentStore.getState().contents.find(c => c.id === nextItem.contentId);
            const account = content?.accountId
                ? useAccountStore.getState().accounts.find(a => a.id === content.accountId)
                : null;

            // Pega o handle real da conta selecionada
            const handle = account?.handle ? account.handle.replace('@', '') : "default";

            const result = await publishInstagramPostAction(nextItem.contentId, handle);

            if (result.success) {
                set((state) => ({
                    queue: state.queue.map(i => i.id === nextItem.id ? { ...i, status: 'completed' } : i)
                }));
                toast.success(`Postado com sucesso: ${nextItem.title}`);

                // Remove item completado após um tempo ou mantém para histórico
                setTimeout(() => {
                    set((state) => ({ queue: state.queue.filter(i => i.id !== nextItem.id) }));
                }, 3000);
            } else {
                set((state) => ({
                    queue: state.queue.map(i => i.id === nextItem.id ? { ...i, status: 'failed', error: result.message } : i)
                }));
                toast.error(`Erro ao postar ${nextItem.title}: ${result.message}`);
            }
        } catch (error: any) {
            set((state) => ({
                queue: state.queue.map(i => i.id === nextItem.id ? { ...i, status: 'failed', error: error.message } : i)
            }));
            toast.error(`Erro crítico na fila: ${error.message}`);
        } finally {
            set({ isProcessing: false });
            // Recursão para o próximo item
            get().processNext();
        }
    },
}));
