'use client';

import { useAccountStore } from '@/stores';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
/* [ZERO_LUCIDE_PURGE] */
import { cn } from '@/design-system/utils/cn';

const GLYPHS = {
    INSTA: '◎',
    USERS: '○',
};

const wrap = (g: string) => <span className="font-mono text-[10px]">{g}</span>;

export function AccountFilter() {
    const { accounts, selectedAccountId, setSelectedAccountId } = useAccountStore();
    const selectedAccount = accounts.find(a => a.id === selectedAccountId);

    return (
        <div className="flex items-center gap-2 font-mono">
            <Select
                value={selectedAccountId}
                onValueChange={(val) => {
                    setSelectedAccountId(val as string | 'all');
                }}
            >
                <SelectTrigger className="w-[200px] h-9 bg-[#0A0A0A] border-white/10 text-[11px] font-bold uppercase tracking-widest focus:ring-opacity-20 focus:ring-[#A3E635] focus:border-[#A3E635]/40 transition-all">
                    <SelectValue placeholder="FILTER_ACCOUNT_NODE">
                        {selectedAccountId === 'all' ? (
                            <div className="flex items-center gap-2">
                                <span className="text-[#4A4A4A]">{wrap(GLYPHS.USERS)}</span>
                                <span>ALL_NODES</span>
                            </div>
                        ) : selectedAccount ? (
                            <div className="flex items-center gap-2">
                                {selectedAccount.avatarUrl ? (
                                    <img src={`/api/image-proxy?url=${encodeURIComponent(selectedAccount.avatarUrl)}`} className="h-4 w-4 rounded-full object-cover grayscale opacity-60" alt="" />
                                ) : (
                                    <span className="text-pink-500 opacity-60">{wrap(GLYPHS.INSTA)}</span>
                                )}
                                <span className="truncate">{selectedAccount.name}</span>
                            </div>
                        ) : (
                            "SELECT_NODE"
                        )}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-[#0A0A0A] border-white/10 font-mono text-[11px] uppercase tracking-widest">
                    <SelectItem value="all" className="hover:bg-white/5 transition-colors focus:bg-[#A3E635]/10 focus:text-[#A3E635]">
                        <div className="flex items-center gap-2">
                            <span className="text-[#4A4A4A]">{wrap(GLYPHS.USERS)}</span>
                            <span>ALL_CHANNELS</span>
                        </div>
                    </SelectItem>
                    {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id} className="hover:bg-white/5 transition-colors focus:bg-[#A3E635]/10 focus:text-[#A3E635]">
                            <div className="flex items-center gap-2">
                                {acc.avatarUrl ? (
                                    <img
                                        src={`/api/image-proxy?url=${encodeURIComponent(acc.avatarUrl)}`}
                                        className="h-4 w-4 rounded-full object-cover grayscale opacity-60"
                                        alt=""
                                    />
                                ) : (
                                    <span className="text-pink-500 opacity-60">{wrap(GLYPHS.INSTA)}</span>
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
