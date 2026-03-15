/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import { useSession } from 'next-auth/react';
import MetaStatusBadge from '../../app/components/MetaStatusBadge';

const mockUseSession = vi.mocked(useSession);

beforeEach(() => {
  vi.resetAllMocks();
});

describe('MetaStatusBadge', () => {
  it('renders the connect link when there is no session', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: vi.fn(),
    });

    render(<MetaStatusBadge />);

    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/connect');
    expect(link.textContent).toContain('CONECTAR META');
  });

  it('renders the connect link when session has no accessToken', () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: 'Test User' }, expires: '' },
      status: 'authenticated',
      update: vi.fn(),
    });

    render(<MetaStatusBadge />);

    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
    expect(link.textContent).toContain('CONECTAR META');
  });

  it('renders the META ATIVO badge when session has an accessToken', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { name: 'Test User' },
        expires: '',
        accessToken: 'valid-token-123',
      } as { user: { name: string }; expires: string; accessToken: string },
      status: 'authenticated',
      update: vi.fn(),
    });

    render(<MetaStatusBadge />);

    expect(screen.queryByRole('link')).toBeNull();
    const badge = screen.getByText(/META ATIVO/i);
    expect(badge).toBeInTheDocument();
  });
});
