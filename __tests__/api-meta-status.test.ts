import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/server before importing the route
vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => ({
      body,
      status: init?.status ?? 200,
      headers: (init as { headers?: Record<string, string> })?.headers ?? {},
    }),
  },
}));

// Mock the auth module
vi.mock('../lib/auth/auth', () => ({
  auth: vi.fn(),
}));

import { GET } from '../app/api/meta-status/route';
import { auth } from '../lib/auth/auth';

const mockAuth = vi.mocked(auth);

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('fetch', vi.fn());
});

describe('GET /api/meta-status', () => {
  it('returns connected: false when there is no session token', async () => {
    mockAuth.mockResolvedValue(null as never);

    const response = await GET();
    expect(response.body).toMatchObject({ connected: false, error: 'NO_TOKEN' });
  });

  it('returns connected: false when session has no accessToken', async () => {
    mockAuth.mockResolvedValue({ user: { name: 'Test' } } as never);

    const response = await GET();
    expect(response.body).toMatchObject({ connected: false, error: 'NO_TOKEN' });
  });

  it('returns connected: true when token is valid and Graph API responds OK', async () => {
    mockAuth.mockResolvedValue({ accessToken: 'valid-token-123' } as never);

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: '123456', name: 'Test User' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const response = await GET();
    expect(response.body).toMatchObject({
      connected: true,
      id: '123456',
      name: 'Test User',
    });
  });

  it('returns connected: false with TOKEN_EXPIRED when Graph API returns 401', async () => {
    mockAuth.mockResolvedValue({ accessToken: 'expired-token' } as never);

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'Invalid OAuth access token.' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const response = await GET();
    expect(response.body).toMatchObject({ connected: false, error: 'TOKEN_EXPIRED' });
  });

  it('returns connected: false with error message on non-auth failure', async () => {
    mockAuth.mockResolvedValue({ accessToken: 'some-token' } as never);

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: 'Internal error' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const response = await GET();
    expect(response.body).toMatchObject({ connected: false });
  });
});
