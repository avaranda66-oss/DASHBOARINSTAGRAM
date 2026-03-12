'use client';

import { useState } from 'react';
import { useAccountStore, useContentStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AccountFormDialog } from './account-form-dialog';
import { Plus, Users, Edit3, MapPin, Phone, Clock } from 'lucide-react';
import type { Account } from '@/types/account';
import { parseBusinessInfo } from '../schemas/account.schema';

const getInitials = (name: string) =>
    name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export function AccountList() {
    const { accounts } = useAccountStore();
    const { contents } = useContentStore();
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);

    const handleEdit = (a: Account) => {
        setEditingAccount(a);
        setEditorOpen(true);
    };

    const handleAddNew = () => {
        setEditingAccount(null);
        setEditorOpen(true);
    };

    return (
        <>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Contas Instagram</h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Gerencie os perfis para atrelar seus conteúdos a páginas específicas.
                    </p>
                </div>
                <Button onClick={handleAddNew} className="bg-gradient-to-tr from-pink-600 to-purple-600 text-white border-0 hover:opacity-90">
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Conta
                </Button>
            </div>

            {accounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-20">
                    <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium">Nenhuma conta cadastrada</h3>
                    <p className="text-muted-foreground text-sm mt-1 text-center max-w-sm mb-6">
                        Cadastre sua primeira conta de Instagram para começar a organizar melhor seus posts.
                    </p>
                    <Button onClick={handleAddNew}>Cadastrar Conta</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {accounts.map((account) => {
                        const contentCount = contents.filter((c) => c.accountId === account.id).length;

                        const bizInfo = parseBusinessInfo(account.notes ?? null);
                        return (
                            <Card key={account.id} className="group relative overflow-hidden flex flex-col h-full border-border/50 hover:border-border transition-all hover:shadow-md">
                                {account.isAutomationConnected && (
                                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                                        <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-[10px] font-bold text-green-600 uppercase tracking-tight">Automação OK</span>
                                    </div>
                                )}

                                <div className="absolute top-3 right-3">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity bg-background/50 backdrop-blur-sm"
                                        onClick={() => handleEdit(account)}
                                    >
                                        <Edit3 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                    </Button>
                                </div>

                                <div className="p-6 flex flex-col items-center text-center">
                                    <div className="h-20 w-20 rounded-full border-2 border-border/50 overflow-hidden mb-4 bg-muted flex items-center justify-center shadow-sm">
                                        {account.avatarUrl ? (
                                            <img src={`/api/image-proxy?url=${encodeURIComponent(account.avatarUrl)}`} alt={account.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <span className="text-xl font-bold text-muted-foreground">
                                                {getInitials(account.name)}
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="text-lg font-semibold line-clamp-1">{account.name}</h3>
                                    <p className="text-sm text-pink-500 font-medium mb-3">{account.handle}</p>

                                    {bizInfo.businessType && (
                                        <span className="text-[11px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground mb-3">
                                            {bizInfo.businessType}
                                        </span>
                                    )}

                                    {(bizInfo.address || bizInfo.phone || bizInfo.hours) && (
                                        <div className="w-full text-left space-y-1 mb-3">
                                            {bizInfo.address && (
                                                <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                                                    <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/60" />
                                                    <span className="line-clamp-1">{bizInfo.address}</span>
                                                </p>
                                            )}
                                            {bizInfo.phone && (
                                                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                                    <Phone className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                                                    {bizInfo.phone}
                                                </p>
                                            )}
                                            {bizInfo.hours && (
                                                <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                                                    <Clock className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/60" />
                                                    <span className="line-clamp-2">{bizInfo.hours}</span>
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    <div className="mt-auto pt-4 w-full border-t border-border/50 flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Conteúdos Ativos</span>
                                        <span className="font-semibold bg-muted px-2 py-0.5 rounded-md">{contentCount}</span>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            <AccountFormDialog
                open={editorOpen}
                onOpenChange={setEditorOpen}
                account={editingAccount}
            />
        </>
    );
}
