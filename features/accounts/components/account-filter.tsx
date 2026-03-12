'use client';

import { useAccountStore } from '@/stores';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Instagram, Users } from 'lucide-react';

export function AccountFilter() {
    const { accounts, selectedAccountId, setSelectedAccountId } = useAccountStore();
    const selectedAccount = accounts.find(a => a.id === selectedAccountId);

    return (
        <div className="flex items-center gap-2">
            <Select
                value={selectedAccountId}
                onValueChange={(val) => {
                    setSelectedAccountId(val as string | 'all');
                }}
            >
                <SelectTrigger className="w-[200px] h-9 bg-background/50 backdrop-blur-sm border-border/50 focus:ring-pink-500/20">
                    <SelectValue placeholder="Filtrar por conta">
                        {selectedAccountId === 'all' ? (
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span>Contas (Todas)</span>
                            </div>
                        ) : selectedAccount ? (
                            <div className="flex items-center gap-2">
                                {selectedAccount.avatarUrl ? (
                                    <img src={`/api/image-proxy?url=${encodeURIComponent(selectedAccount.avatarUrl)}`} className="h-4 w-4 rounded-full object-cover" alt="" />
                                ) : (
                                    <Instagram className="h-4 w-4 text-pink-500" />
                                )}
                                <span className="truncate">{selectedAccount.name}</span>
                            </div>
                        ) : (
                            "Filtrar por conta"
                        )}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>Contas (Todas)</span>
                        </div>
                    </SelectItem>
                    {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                            <div className="flex items-center gap-2">
                                {acc.avatarUrl ? (
                                    <img
                                        src={`/api/image-proxy?url=${encodeURIComponent(acc.avatarUrl)}`}
                                        className="h-4 w-4 rounded-full object-cover"
                                        alt=""
                                    />
                                ) : (
                                    <Instagram className="h-4 w-4 text-pink-500" />
                                )}
                                <span className="truncate">{acc.name}</span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
