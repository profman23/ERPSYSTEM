import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { Pagination } from './Pagination';

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
        'pagination.firstPage': 'First page',
        'pagination.previousPage': 'Previous page',
        'pagination.nextPage': 'Next page',
        'pagination.lastPage': 'Last page',
      };
      return translations[key] || key;
    },
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

describe('Pagination', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 5,
    onPageChange: vi.fn(),
  };

  it('renders page numbers including current page', () => {
    renderWithProviders(<Pagination {...defaultProps} />);
    // With 5 total pages and siblingCount=1, all 5 pages should render
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument();
  });

  it('disables previous button on first page', () => {
    renderWithProviders(<Pagination {...defaultProps} currentPage={1} />);
    const prevButton = screen.getByTitle('Previous page');
    expect(prevButton).toBeDisabled();
  });

  it('disables next button on last page', () => {
    renderWithProviders(<Pagination {...defaultProps} currentPage={5} />);
    const nextButton = screen.getByTitle('Next page');
    expect(nextButton).toBeDisabled();
  });

  it('calls onPageChange when clicking next', async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<Pagination {...defaultProps} currentPage={2} onPageChange={onPageChange} />);
    const nextButton = screen.getByTitle('Next page');
    await user.click(nextButton);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('calls onPageChange when clicking previous', async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<Pagination {...defaultProps} currentPage={3} onPageChange={onPageChange} />);
    const prevButton = screen.getByTitle('Previous page');
    await user.click(prevButton);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
