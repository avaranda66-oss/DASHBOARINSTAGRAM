'use client';

import { useRouter } from 'next/navigation';
import { useUIStore, useContentStore, useCollectionStore, useAccountStore } from '@/stores';
import { useTheme } from 'next-themes';
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut';
import {
    CommandDialog,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandSeparator,
} from '@/components/ui/command';
import {
    LayoutDashboard,
    KanbanSquare,
    CalendarDays,
    FolderHeart,
    Users,
    Settings,
    Plus,
    Moon,
    Sun,
    EditIcon,
} from 'lucide-react';

export function CommandPalette() {
    const router = useRouter();
    const { setTheme, theme } = useTheme();
    const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
    const { contents } = useContentStore();

    useKeyboardShortcut('k', () => setCommandPaletteOpen(true), { ctrl: true });

    const runCommand = (command: () => void) => {
        setCommandPaletteOpen(false);
        command();
    };

    const navItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { name: 'Storyboard (Kanban)', icon: KanbanSquare, path: '/dashboard/storyboard' },
        { name: 'Calendário', icon: CalendarDays, path: '/dashboard/calendar' },
        { name: 'Coleções', icon: FolderHeart, path: '/dashboard/collections' },
        { name: 'Contas', icon: Users, path: '/dashboard/accounts' },
        { name: 'Configurações', icon: Settings, path: '/dashboard/settings' },
    ];

    const recentContents = [...contents]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

    return (
        <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
            <CommandInput placeholder="Digite um comando ou busque... (Ex: Novo post)" />

            <CommandList>
                <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

                <CommandGroup heading="Ações Rápidas">
                    <CommandItem onSelect={() => runCommand(() => router.push('/dashboard/storyboard?new=true'))}>
                        <Plus className="mr-2 h-4 w-4" />
                        <span>Criar Novo Conteúdo</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push('/dashboard/collections?new=true'))}>
                        <FolderHeart className="mr-2 h-4 w-4" />
                        <span>Nova Coleção</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push('/dashboard/accounts?new=true'))}>
                        <Users className="mr-2 h-4 w-4" />
                        <span>Nova Conta Instagram</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Navegação">
                    {navItems.map((item) => (
                        <CommandItem key={item.path} onSelect={() => runCommand(() => router.push(item.path))}>
                            <item.icon className="mr-2 h-4 w-4" />
                            <span>{item.name}</span>
                        </CommandItem>
                    ))}
                </CommandGroup>

                <CommandSeparator />

                {recentContents.length > 0 && (
                    <CommandGroup heading="Conteúdos Recentes">
                        {recentContents.map((item) => (
                            <CommandItem key={item.id} onSelect={() => runCommand(() => router.push(`/dashboard/storyboard?edit=${item.id}`))}>
                                <EditIcon className="mr-2 h-4 w-4" />
                                <span>{item.title}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                <CommandSeparator />

                <CommandGroup heading="Preferências">
                    <CommandItem onSelect={() => runCommand(() => setTheme(theme === 'dark' ? 'light' : 'dark'))}>
                        {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                        <span>Alternar Tema ({theme === 'dark' ? 'Light' : 'Dark'})</span>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}
