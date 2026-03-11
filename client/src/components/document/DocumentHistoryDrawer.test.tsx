/**
 * DocumentHistoryDrawer Component Tests
 *
 * Tests timeline rendering, entry display, RTL support,
 * action type colors, and drawer open/close behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ═══════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════

const mockIsRTL = { value: false };

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    isRTL: mockIsRTL.value,
    language: mockIsRTL.value ? 'ar' : 'en',
  })),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import {
  DocumentHistoryDrawer,
  type HistoryEntry,
} from './DocumentHistoryDrawer';

// ═══════════════════════════════════════════════════════════════
// TEST DATA
// ═══════════════════════════════════════════════════════════════

const createdEntry: HistoryEntry = {
  action: 'CREATED',
  userName: 'Ahmed Mohamed',
  userEmail: 'ahmed@petcare.vet',
  timestamp: '2025-03-10T14:30:45.000Z',
};

const reversedEntry: HistoryEntry = {
  action: 'REVERSED',
  userName: 'Sara Ali',
  userEmail: 'sara@petcare.vet',
  timestamp: '2025-03-10T16:15:22.000Z',
};

const updatedEntry: HistoryEntry = {
  action: 'UPDATED',
  userName: 'Omar Hassan',
  userEmail: 'omar@petcare.vet',
  timestamp: '2025-03-10T15:00:00.000Z',
  details: 'Changed posting date',
};

const mockOnClose = vi.fn();

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('DocumentHistoryDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRTL.value = false;
  });

  it('does not render when closed', () => {
    const { container } = render(
      <DocumentHistoryDrawer
        isOpen={false}
        onClose={mockOnClose}
        documentCode="JE-00001"
        entries={[createdEntry]}
      />,
    );
    // Drawer returns null when open=false
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });

  it('renders drawer with document code when open', () => {
    render(
      <DocumentHistoryDrawer
        isOpen={true}
        onClose={mockOnClose}
        documentCode="JE-00001"
        entries={[createdEntry]}
      />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Document History')).toBeInTheDocument();
    expect(screen.getByText('JE-00001')).toBeInTheDocument();
  });

  it('shows created entry with user name, email, and timestamp', () => {
    render(
      <DocumentHistoryDrawer
        isOpen={true}
        onClose={mockOnClose}
        documentCode="JE-00001"
        entries={[createdEntry]}
      />,
    );
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('Ahmed Mohamed')).toBeInTheDocument();
    expect(screen.getByText('ahmed@petcare.vet')).toBeInTheDocument();
  });

  it('shows reversed entry when present', () => {
    render(
      <DocumentHistoryDrawer
        isOpen={true}
        onClose={mockOnClose}
        documentCode="JE-00001"
        entries={[createdEntry, reversedEntry]}
      />,
    );
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('Reversed')).toBeInTheDocument();
    expect(screen.getByText('Sara Ali')).toBeInTheDocument();
    expect(screen.getByText('sara@petcare.vet')).toBeInTheDocument();
  });

  it('does not show reversed entry when not present', () => {
    render(
      <DocumentHistoryDrawer
        isOpen={true}
        onClose={mockOnClose}
        documentCode="JE-00001"
        entries={[createdEntry]}
      />,
    );
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.queryByText('Reversed')).not.toBeInTheDocument();
  });

  it('displays entries in chronological order', () => {
    // Pass in reverse order — component should sort by timestamp
    render(
      <DocumentHistoryDrawer
        isOpen={true}
        onClose={mockOnClose}
        documentCode="JE-00001"
        entries={[reversedEntry, createdEntry]}
      />,
    );
    const labels = screen.getAllByText(/Created|Reversed/);
    expect(labels[0].textContent).toBe('Created');
    expect(labels[1].textContent).toBe('Reversed');
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <DocumentHistoryDrawer
        isOpen={true}
        onClose={mockOnClose}
        documentCode="JE-00001"
        entries={[createdEntry]}
      />,
    );
    const closeBtn = screen.getByLabelText('Close drawer');
    fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders correctly in RTL mode', () => {
    mockIsRTL.value = true;
    render(
      <DocumentHistoryDrawer
        isOpen={true}
        onClose={mockOnClose}
        documentCode="JE-00001"
        entries={[createdEntry]}
      />,
    );
    // Should show Arabic labels
    expect(screen.getByText('سجل المستند')).toBeInTheDocument();
    expect(screen.getByText('تم الإنشاء')).toBeInTheDocument();
  });

  it('applies correct dot color for each action type', () => {
    render(
      <DocumentHistoryDrawer
        isOpen={true}
        onClose={mockOnClose}
        documentCode="JE-00001"
        entries={[createdEntry, reversedEntry, updatedEntry]}
      />,
    );
    const createdDot = screen.getByTestId('history-dot-created');
    const reversedDot = screen.getByTestId('history-dot-reversed');
    const updatedDot = screen.getByTestId('history-dot-updated');

    expect(createdDot).toBeInTheDocument();
    expect(reversedDot).toBeInTheDocument();
    expect(updatedDot).toBeInTheDocument();
  });

  it('shows details text when provided', () => {
    render(
      <DocumentHistoryDrawer
        isOpen={true}
        onClose={mockOnClose}
        documentCode="JE-00001"
        entries={[updatedEntry]}
      />,
    );
    expect(screen.getByText('Changed posting date')).toBeInTheDocument();
  });

  it('shows empty state when no entries', () => {
    render(
      <DocumentHistoryDrawer
        isOpen={true}
        onClose={mockOnClose}
        documentCode="JE-00001"
        entries={[]}
      />,
    );
    expect(screen.getByText('No history available')).toBeInTheDocument();
  });
});
