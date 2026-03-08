import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { DataTable, Column } from './DataTable';

// Mock useLanguage context
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ isRTL: false, language: 'en', setLanguage: vi.fn() }),
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common.noData': 'No data available',
        'common.yes': 'Yes',
        'common.no': 'No',
      };
      return translations[key] || key;
    },
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

interface TestRow {
  id: number;
  name: string;
  email: string;
}

const testColumns: Column<TestRow>[] = [
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
];

const testData: TestRow[] = [
  { id: 1, name: 'Alice', email: 'alice@test.com' },
  { id: 2, name: 'Bob', email: 'bob@test.com' },
];

describe('DataTable', () => {
  it('renders table with column headers', () => {
    renderWithProviders(
      <DataTable data={testData} columns={testColumns} />,
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders rows with data', () => {
    renderWithProviders(
      <DataTable data={testData} columns={testColumns} />,
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('alice@test.com')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('bob@test.com')).toBeInTheDocument();
  });

  it('shows empty state message when no data', () => {
    renderWithProviders(
      <DataTable data={[]} columns={testColumns} emptyMessage="No records found" />,
    );

    expect(screen.getByText('No records found')).toBeInTheDocument();
  });

  it('shows loading skeleton when loading=true', () => {
    const { container } = renderWithProviders(
      <DataTable data={[]} columns={testColumns} loading={true} loadingRows={3} />,
    );

    // Loading skeleton renders animated pulse divs, not a table
    const pulseElements = container.querySelectorAll('.animate-pulse');
    expect(pulseElements.length).toBeGreaterThan(0);

    // Should NOT render actual data rows
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  it('handles row click callback', () => {
    const handleRowClick = vi.fn();

    renderWithProviders(
      <DataTable
        data={testData}
        columns={testColumns}
        onRowClick={handleRowClick}
      />,
    );

    fireEvent.click(screen.getByText('Alice'));

    expect(handleRowClick).toHaveBeenCalledTimes(1);
    expect(handleRowClick).toHaveBeenCalledWith(
      { id: 1, name: 'Alice', email: 'alice@test.com' },
      0,
    );
  });
});
