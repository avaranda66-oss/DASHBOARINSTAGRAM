import { LocalStorageRepository } from './local-storage.repository';
import type { Content } from '@/types/content';
import type { Account } from '@/types/account';
import type { Collection } from '@/types/collection';
import type { UserSettings } from '@/types/settings';
import type { CachedAnalytics } from '@/types/analytics';
import type { CompetitorProfile } from '@/types/competitor';

export const contentRepository = new LocalStorageRepository<Content>(
    'ig-dashboard:contents',
);

export const collectionRepository = new LocalStorageRepository<Collection>(
    'ig-dashboard:collections',
);

export const accountRepository = new LocalStorageRepository<Account>(
    'ig-dashboard:accounts',
);

export const settingsRepository = new LocalStorageRepository<UserSettings & { id: string }>(
    'ig-dashboard:settings',
);

export const analyticsRepository = new LocalStorageRepository<CachedAnalytics>(
    'ig-dashboard:analytics-cache',
);

export const competitorRepository = new LocalStorageRepository<CompetitorProfile>(
    'ig-dashboard:competitors',
);

export type { IRepository } from './repository.interface';
export { LocalStorageRepository } from './local-storage.repository';
