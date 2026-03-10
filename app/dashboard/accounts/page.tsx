'use client';

import { useEffect } from 'react';
import { useAccountStore, useContentStore } from '@/stores';
import { AccountList } from '@/features/accounts/components/account-list';

export default function AccountsPage() {
    const { isLoaded: isAccountsLoaded, loadAccounts } = useAccountStore();
    const { isLoaded: isContentsLoaded, loadContents } = useContentStore();

    useEffect(() => {
        if (!isAccountsLoaded) loadAccounts();
        if (!isContentsLoaded) loadContents();
    }, [isAccountsLoaded, isContentsLoaded, loadAccounts, loadContents]);

    return <AccountList />;
}
