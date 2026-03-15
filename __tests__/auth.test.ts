import { describe, it, expect, vi } from 'vitest';

// Mock next-auth and its dependencies before importing auth.ts
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

describe('hashPassword', () => {
  it('returns a string in salt:hash format', () => {
    const hashed = hashPassword('mypassword');
    expect(hashed).toContain(':');
    const parts = hashed.split(':');
    expect(parts).toHaveLength(2);
    expect(parts[0]).toHaveLength(32); // 16 bytes hex = 32 chars
    expect(parts[1]).toHaveLength(128); // 64 bytes hex = 128 chars
  });

  it('produces different hashes for the same password (random salt)', () => {
    const hash1 = hashPassword('samepassword');
    const hash2 = hashPassword('samepassword');
    expect(hash1).not.toBe(hash2);
  });
});

describe('verifyPassword', () => {
  it('returns true for the correct password', async () => {
    const password = 'correctpassword';
    const hashed = hashPassword(password);
    const result = await verifyPassword(password, hashed);
    expect(result).toBe(true);
  });

  it('returns false for an incorrect password', async () => {
    const hashed = hashPassword('correctpassword');
    const result = await verifyPassword('wrongpassword', hashed);
    expect(result).toBe(false);
  });

  it('returns false for a malformed stored hash', async () => {
    const result = await verifyPassword('anypassword', 'not-a-valid-hash');
    expect(result).toBe(false);
  });
});
