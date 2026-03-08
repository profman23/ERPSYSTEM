import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { SearchField } from './SearchField';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', isRTL: false, t: (en: string) => en, setLanguage: vi.fn() }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common.clearSearch': 'Clear search',
      };
      return translations[key] || key;
    },
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

describe('SearchField', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders with placeholder text', () => {
    renderWithProviders(
      <SearchField value="" onChange={vi.fn()} placeholder="Search users..." />
    );
    expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument();
  });

  it('displays current value', () => {
    renderWithProviders(
      <SearchField value="hello" onChange={vi.fn()} />
    );
    const input = screen.getByDisplayValue('hello');
    expect(input).toBeInTheDocument();
  });

  it('calls onChange when typing after debounce', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(
      <SearchField value="" onChange={onChange} debounceMs={300} />
    );
    const input = screen.getByRole('textbox');
    await user.type(input, 'test');
    // Advance past the debounce delay and flush React state updates
    await act(async () => {
      vi.advanceTimersByTime(350);
    });
    expect(onChange).toHaveBeenCalled();
  });

  it('shows clear button when value is present', () => {
    renderWithProviders(
      <SearchField value="some text" onChange={vi.fn()} />
    );
    const clearButton = screen.getByRole('button', { name: 'Clear search' });
    expect(clearButton).toBeInTheDocument();
  });

  it('clears value when clicking clear button', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(
      <SearchField value="some text" onChange={onChange} />
    );
    const clearButton = screen.getByRole('button', { name: 'Clear search' });
    await user.click(clearButton);
    expect(onChange).toHaveBeenCalledWith('');
  });
});
