'use client';

import { useEffect } from 'react';
import { useAccountStore, useContentStore } from '@/stores';
import { AccountList } from '@/features/accounts/components/account-list';
import { motion } from 'framer-motion';

export default function AccountsPage() {
    const { isLoaded: isAccountsLoaded, loadAccounts } = useAccountStore();
    const { isLoaded: isContentsLoaded, loadContents } = useContentStore();

    useEffect(() => {
        if (!isAccountsLoaded) loadAccounts();
        if (!isContentsLoaded) loadContents();
    }, [isAccountsLoaded, isContentsLoaded, loadAccounts, loadContents]);

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
        >
            <AccountList />
        </motion.div>
    );
}
