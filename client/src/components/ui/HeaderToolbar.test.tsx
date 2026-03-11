/**
 * HeaderToolbar Component Tests
 *
 * Tests permission-driven visibility, dropdown behavior,
 * branch switching, contextual history-log, and disabled items.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ═══════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════

// Mock useAuth
const mockUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@test.com',
  role: 'admin',
  accessScope: 'tenant',
  tenantId: 'tenant-1',
  businessLineId: null,
  branchId: 'branch-1',
  allowedBranchIds: ['branch-1', 'branch-2'],
  branches: [
    { id: 'branch-1', name: 'Main Branch', code: 'BR01', city: 'Riyadh', country: 'SA' },
    { id: 'branch-2', name: 'North Branch', code: 'BR02', city: 'Jeddah', country: 'SA' },
  ],
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: mockUser })),
}));

// Mock useLanguage
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({ isRTL: false, language: 'en' })),
}));

// Mock usePermissions
const mockCanAccessScreen = vi.fn(() => true);
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(() => ({
    canAccessScreen: mockCanAccessScreen,
    loading: false,
  })),
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'toolbar.title': 'Toolbar',
        'toolbar.switchBranch': 'Switch Branch',
        'toolbar.historyLog': 'History Log',
        'toolbar.journalEntryPreview': 'Journal Entry Preview',
        'toolbar.comingSoon': 'Coming Soon',
        'toolbar.currentBranch': 'Current',
        'toolbar.noRecord': 'No Record',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock useActiveBranch
const mockSetActiveBranch = vi.fn();
vi.mock('@/hooks/useActiveBranch', () => ({
  getActiveBranch: vi.fn(() => ({ branchId: 'branch-1', branchName: 'Main Branch' })),
  setActiveBranch: (...args: unknown[]) => mockSetActiveBranch(...args),
}));

// Mock PageResourceContext
const mockPageResource = vi.fn(() => null as { resourceType: string; resourceId: string; resourceLabel?: string } | null);
vi.mock('@/contexts/PageResourceContext', () => ({
  usePageResource: () => mockPageResource(),
}));

// Mock useAuditTrail
vi.mock('@/hooks/useAuditTrail', () => ({
  useAuditTrail: vi.fn(() => ({ data: [], isLoading: false, isSuccess: true })),
}));

// Mock DocumentHistoryDrawer
vi.mock('@/components/document', () => ({
  DocumentHistoryDrawer: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="history-drawer">History Drawer</div> : null,
}));

import { HeaderToolbar } from './HeaderToolbar';
import { useAuth } from '@/contexts/AuthContext';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function renderToolbar() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HeaderToolbar />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('HeaderToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanAccessScreen.mockReturnValue(true);
    mockPageResource.mockReturnValue(null);
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: mockUser });
    // Mock window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: '' },
    });
  });

  it('does not render when user has no toolbar permissions', () => {
    mockCanAccessScreen.mockReturnValue(false);
    const { container } = renderToolbar();
    expect(container.innerHTML).toBe('');
  });

  it('renders toolbar button when user has any toolbar permission', () => {
    renderToolbar();
    expect(screen.getByRole('button', { name: 'Toolbar' })).toBeInTheDocument();
  });

  it('opens dropdown on click', () => {
    renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: 'Toolbar' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('Switch Branch')).toBeInTheDocument();
  });

  it('closes dropdown on Escape key', () => {
    renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: 'Toolbar' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('hides Switch Branch when user has only 1 branch', () => {
    const singleBranchUser = {
      ...mockUser,
      branches: [mockUser.branches[0]],
      allowedBranchIds: ['branch-1'],
    };
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: singleBranchUser });

    renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: 'Toolbar' }));
    expect(screen.queryByText('Switch Branch')).not.toBeInTheDocument();
  });

  it('shows branch submenu with all branches when Switch Branch is clicked', () => {
    renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: 'Toolbar' }));
    fireEvent.click(screen.getByText('Switch Branch'));

    expect(screen.getByText('Main Branch')).toBeInTheDocument();
    expect(screen.getByText('North Branch')).toBeInTheDocument();
  });

  it('calls setActiveBranch and reloads when a branch is selected', () => {
    renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: 'Toolbar' }));
    fireEvent.click(screen.getByText('Switch Branch'));
    fireEvent.click(screen.getByText('North Branch'));

    expect(mockSetActiveBranch).toHaveBeenCalledWith('branch-2', 'North Branch');
    expect(window.location.href).toBe('/app/dashboard');
  });

  it('shows History Log as disabled with "No Record" when no PageResourceContext', () => {
    renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: 'Toolbar' }));

    const historyBtn = screen.getByText('History Log').closest('button');
    expect(historyBtn).toBeDisabled();
    expect(screen.getByText('No Record')).toBeInTheDocument();
  });

  it('shows History Log as enabled when PageResourceContext is set', () => {
    mockPageResource.mockReturnValue({
      resourceType: 'species',
      resourceId: 'sp-1',
      resourceLabel: 'DOG',
    });

    renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: 'Toolbar' }));

    const historyBtn = screen.getByText('History Log').closest('button');
    expect(historyBtn).not.toBeDisabled();
    expect(screen.queryByText('No Record')).not.toBeInTheDocument();
  });

  it('opens DocumentHistoryDrawer when History Log is clicked with resource context', () => {
    mockPageResource.mockReturnValue({
      resourceType: 'species',
      resourceId: 'sp-1',
      resourceLabel: 'DOG',
    });

    renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: 'Toolbar' }));
    fireEvent.click(screen.getByText('History Log'));

    expect(screen.getByTestId('history-drawer')).toBeInTheDocument();
  });

  it('shows JE Preview as disabled with Coming Soon badge', () => {
    renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: 'Toolbar' }));

    const jeBtn = screen.getByText('Journal Entry Preview').closest('button');
    expect(jeBtn).toBeDisabled();
    expect(screen.getByText('Coming Soon')).toBeInTheDocument();
  });
});
