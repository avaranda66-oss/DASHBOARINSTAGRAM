'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function MetaStatusBadge() {
    const { data: session } = useSession();

    if (session?.accessToken) {
        return (
            <span className="font-mono text-[10px] px-2 py-0.5 bg-[#A3E635]/10 text-[#A3E635] border border-[#A3E635]/20 tracking-widest uppercase">
                ● META ATIVO
            </span>
        );
    }

    return (
        <Link
            href="/connect"
            className="font-mono text-[10px] px-2 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 tracking-widest uppercase animate-pulse hover:animate-none hover:bg-yellow-500/20 transition-colors"
        >
            ⚡ CONECTAR META
        </Link>
    );
}
