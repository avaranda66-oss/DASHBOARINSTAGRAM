'use client';

import { useState } from 'react';
import { useAccountStore, useContentStore } from '@/stores';
import { Button } from '@/design-system/atoms/Button';
import { Badge } from '@/design-system/atoms/Badge';
import { AccountFormDialog } from './account-form-dialog';
import type { Account } from '@/types/account';
import { parseBusinessInfo } from '../schemas/account.schema';
import { cn } from '@/design-system/utils/cn';

const wrap = (g: string) => <span className="font-mono text-[10px]">{g}</span>;

// V2 Common Styles
const CARD_STYLE = {
    backgroundColor: '#0A0A0A',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: '8px',
};

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
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-8 pb-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[#A3E635] text-[10px] tracking-widest">[ACC_CTRL_V2]</span>
                        <h2 className="text-[1.75rem] font-bold tracking-tight text-[#F5F5F5]">Managed Accounts</h2>
                    </div>
                    <p className="text-[13px] text-[#4A4A4A]">Índice de perfis e identidades de marca autenticadas.</p>
                </div>
                <Button onClick={handleAddNew} variant="solid" className="font-mono text-[10px] tracking-widest uppercase">
                    ADD_IDENTITY {wrap('↗')}
                </Button>
            </div>

            {accounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-lg bg-[#0A0A0A]/50" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <span className="font-mono text-[#4A4A4A] text-4xl mb-4">{wrap('◎')}</span>
                    <h3 className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#8A8A8A]">No Accounts Registered</h3>
                    <p className="text-[12px] text-[#4A4A4A] mt-2 mb-6 max-w-sm text-center">Inicie o mapeamento de marcas para liberar a gestão de conteúdo.</p>
                    <Button onClick={handleAddNew} variant="outline" size="sm">INITIALIZE_HUB</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {accounts.map((account) => {
                        const contentCount = contents.filter((c) => c.accountId === account.id).length;
                        const bizInfo = parseBusinessInfo(account.notes ?? null);

                        return (
                            <div 
                                key={account.id} 
                                className="group relative border p-6 flex flex-col items-center text-center transition-all duration-150"
                                style={CARD_STYLE}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0A0A0A'}
                            >
                                {account.isAutomationConnected && (
                                    <div className="absolute top-4 left-4">
                                        <Badge intent="success" variant="subtle" size="sm">AUTO_SYNC</Badge>
                                    </div>
                                )}

                                <div className="absolute top-4 right-4">
                                    <button
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-[#A3E635]"
                                        onClick={() => handleEdit(account)}
                                    >
                                        <span className="font-mono text-[10px]">{wrap('◎')} EDIT_0x</span>
                                    </button>
                                </div>

                                <div className="h-20 w-20 rounded-full border border-white/10 overflow-hidden mb-6 bg-white/5 flex items-center justify-center grayscale group-hover:grayscale-0 transition-all duration-300">
                                    {account.avatarUrl ? (
                                        <img src={`/api/image-proxy?url=${encodeURIComponent(account.avatarUrl)}`} alt={account.name} className="h-full w-full object-cover opacity-80 group-hover:opacity-100" />
                                    ) : (
                                        <span className="text-xl font-bold text-[#4A4A4A] font-mono">
                                            {getInitials(account.name)}
                                        </span>
                                    )}
                                </div>

                                <h3 className="text-[15px] font-bold text-[#F5F5F5] uppercase tracking-tight mb-1">{account.name}</h3>
                                <p className="text-[11px] font-mono text-[#A3E635] mb-4 opacity-70">@{account.handle.toLowerCase()}</p>

                                {bizInfo.businessType && (
                                    <div className="mb-4">
                                        <Badge intent="default" variant="subtle" size="sm">{bizInfo.businessType.toUpperCase()}</Badge>
                                    </div>
                                )}

                                <div className="w-full space-y-2 mb-6 text-left">
                                    {bizInfo.address && (
                                        <div className="flex gap-2">
                                            <span className="font-mono text-[10px] text-[#A3E635] shrink-0">{wrap('◎')}</span>
                                            <p className="text-[10px] text-[#4A4A4A] line-clamp-1 uppercase tracking-wider">{bizInfo.address}</p>
                                        </div>
                                    )}
                                    {bizInfo.phone && (
                                        <div className="flex gap-2">
                                            <span className="font-mono text-[10px] text-[#A3E635] shrink-0">{wrap('↳')}</span>
                                            <p className="text-[10px] text-[#4A4A4A] font-mono">{bizInfo.phone}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-auto pt-4 w-full border-t border-white/5 flex items-center justify-between">
                                    <span className="font-mono text-[9px] text-[#4A4A4A] uppercase tracking-[0.2em]">Active_Files</span>
                                    <span className="font-mono text-[11px] text-[#F5F5F5] bg-white/5 px-2 py-0.5 rounded">
                                        {contentCount.toString().padStart(2, '0')}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <AccountFormDialog
                open={editorOpen}
                onOpenChange={setEditorOpen}
                account={editingAccount}
            />
        </div>
    );
}
