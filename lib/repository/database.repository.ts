import prisma from '@/lib/db';
import type { IRepository } from './repository.interface';

export class DatabaseRepository<T extends { id: string }, P> implements IRepository<T> {
    constructor(
        private modelName: keyof typeof prisma,
        private mapToEntity: (dbItem: any) => T,
        private mapToDb: (entity: T) => any
    ) { }

    async findAll(): Promise<T[]> {
        const model = prisma[this.modelName] as any;
        const items = await model.findMany();
        return items.map(this.mapToEntity);
    }

    async findById(id: string): Promise<T | null> {
        const model = prisma[this.modelName] as any;
        const item = await model.findUnique({ where: { id } });
        return item ? this.mapToEntity(item) : null;
    }

    async save(entity: T): Promise<T> {
        const model = prisma[this.modelName] as any;
        const dbData = this.mapToDb(entity);
        const { id, ...data } = dbData;

        const saved = await model.upsert({
            where: { id: id || 'new' },
            create: dbData,
            update: data
        });

        return this.mapToEntity(saved);
    }

    async delete(id: string): Promise<void> {
        const model = prisma[this.modelName] as any;
        await model.delete({ where: { id } });
    }

    async deleteAll(): Promise<void> {
        const model = prisma[this.modelName] as any;
        await model.deleteMany();
    }
}
