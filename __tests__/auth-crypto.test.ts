import { describe, it, expect, vi } from 'vitest';

// Mock next-auth e dependências antes de importar auth.ts
vi.mock('next-auth', () => ({
    default: vi.fn(() => ({
        handlers: {},
        auth: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
    })),
}));

vi.mock('next-auth/providers/facebook', () => ({
    default: vi.fn(),
}));

vi.mock('next-auth/providers/credentials', () => ({
    default: vi.fn(),
}));

vi.mock('@/lib/db/supabase', () => ({
    createSupabaseServiceClient: vi.fn(),
}));

import { hashPassword, verifyPassword } from '../lib/auth/auth';

// =============================================================================
// hashPassword
// =============================================================================

describe('hashPassword', () => {
    it('retorna string no formato "salt:hash"', () => {
        const result = hashPassword('minhasenha');
        expect(result).toContain(':');
        const parts = result.split(':');
        expect(parts).toHaveLength(2);
        expect(parts[0]).toBeTruthy();
        expect(parts[1]).toBeTruthy();
    });

    it('salt tem 32 caracteres hex (16 bytes)', () => {
        const [salt] = hashPassword('teste').split(':');
        expect(salt).toHaveLength(32);
        expect(/^[0-9a-f]+$/.test(salt)).toBe(true);
    });

    it('hash tem 128 caracteres hex (64 bytes)', () => {
        const [, hash] = hashPassword('teste').split(':');
        expect(hash).toHaveLength(128);
        expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
    });

    it('gera hashes diferentes para a mesma senha (salt aleatório)', () => {
        const h1 = hashPassword('mesmasenha');
        const h2 = hashPassword('mesmasenha');
        expect(h1).not.toBe(h2);
    });

    it('senhas diferentes produzem hashes diferentes', () => {
        const h1 = hashPassword('senha1');
        const h2 = hashPassword('senha2');
        expect(h1).not.toBe(h2);
    });
});

// =============================================================================
// verifyPassword
// =============================================================================

describe('verifyPassword', () => {
    it('retorna true com senha correta', async () => {
        const hash = hashPassword('senhaCorreta');
        await expect(verifyPassword('senhaCorreta', hash)).resolves.toBe(true);
    });

    it('retorna false com senha errada', async () => {
        const hash = hashPassword('senhaCorreta');
        await expect(verifyPassword('senhaErrada', hash)).resolves.toBe(false);
    });

    it('retorna false para hash malformado (sem ":")', async () => {
        await expect(verifyPassword('qualquersenha', 'hashsemcolons')).resolves.toBe(false);
    });

    it('não lança exceção com string vazia como hash', async () => {
        await expect(verifyPassword('senha', '')).resolves.toBe(false);
    });

    it('não lança exceção com inputs completamente inválidos', async () => {
        await expect(verifyPassword('', 'invalido:hash')).resolves.toBe(false);
    });

    it('diferencia maiúsculas e minúsculas', async () => {
        const hash = hashPassword('SenhaComMaiusculas');
        await expect(verifyPassword('senhacommaiusculas', hash)).resolves.toBe(false);
        await expect(verifyPassword('SenhaComMaiusculas', hash)).resolves.toBe(true);
    });
});
