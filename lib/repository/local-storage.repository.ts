import type { IRepository } from './repository.interface';

export class LocalStorageRepository<T extends { id: string }>
    implements IRepository<T> {
    constructor(private readonly key: string) { }

    async findAll(): Promise<T[]> {
        if (typeof window === 'undefined') return [];
        try {
            const raw = localStorage.getItem(this.key);
            return raw ? (JSON.parse(raw) as T[]) : [];
        } catch {
            console.error(`[Repository] Failed to read from localStorage key: ${this.key}`);
            return [];
        }
    }

    async findById(id: string): Promise<T | null> {
        const all = await this.findAll();
        return all.find((e) => e.id === id) ?? null;
    }

    async save(entity: T): Promise<T> {
        if (typeof window === 'undefined') return entity;
        try {
            const all = await this.findAll();
            const idx = all.findIndex((e) => e.id === entity.id);
            if (idx >= 0) {
                all[idx] = entity;
            } else {
                all.push(entity);
            }
            localStorage.setItem(this.key, JSON.stringify(all));
            return entity;
        } catch (error) {
            if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                console.error(
                    '[Repository] localStorage quota exceeded. Consider clearing old data.',
                );
            }
            throw error;
        }
    }

    async saveAll(entities: T[]): Promise<void> {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(this.key, JSON.stringify(entities));
        } catch (error) {
            if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                console.error(
                    '[Repository] localStorage quota exceeded. Consider clearing old data.',
                );
            }
            throw error;
        }
    }

    async delete(id: string): Promise<void> {
        if (typeof window === 'undefined') return;
        const all = await this.findAll();
        const filtered = all.filter((e) => e.id !== id);
        localStorage.setItem(this.key, JSON.stringify(filtered));
    }

    async deleteAll(): Promise<void> {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(this.key);
    }
}
