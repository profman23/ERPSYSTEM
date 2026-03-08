import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { PageHeader } from './PageHeader';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', isRTL: false, t: (en: string) => en, setLanguage: vi.fn() }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

describe('PageHeader', () => {
  it('renders title text', () => {
    renderWithProviders(<PageHeader title="Users" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Users' })).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    renderWithProviders(<PageHeader title="Users" subtitle="Manage system users" />);
    expect(screen.getByText('Manage system users')).toBeInTheDocument();
  });

  it('renders action buttons when provided', () => {
    renderWithProviders(
      <PageHeader title="Users" actions={<button>Add User</button>} />
    );
    expect(screen.getByRole('button', { name: 'Add User' })).toBeInTheDocument();
  });

  it('renders breadcrumbs when provided', () => {
    const breadcrumbs = [
      { label: 'Settings', href: '/settings' },
      { label: 'Users' },
    ];
    renderWithProviders(<PageHeader title="Users" breadcrumbs={breadcrumbs} />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    // "Users" appears in both the breadcrumb and the h1 heading
    expect(screen.getAllByText('Users').length).toBeGreaterThanOrEqual(2);
  });

  it('applies className when passed', () => {
    const { container } = renderWithProviders(
      <PageHeader title="Users" className="custom-class" />
    );
    const headerDiv = container.firstElementChild;
    expect(headerDiv).toHaveClass('custom-class');
  });
});
