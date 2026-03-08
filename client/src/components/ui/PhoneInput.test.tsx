import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PhoneInput, CountryCodeSelect } from './PhoneInput';

describe('PhoneInput', () => {
  it('renders phone input field', () => {
    render(
      <PhoneInput
        countryCode="US"
        value=""
        onChange={vi.fn()}
      />,
    );

    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'tel');
  });

  it('displays selected country dial code', () => {
    render(
      <PhoneInput
        countryCode="EG"
        value=""
        onChange={vi.fn()}
      />,
    );

    // Egypt dial code is +20
    expect(screen.getByText('+20')).toBeInTheDocument();
  });

  it('calls onChange with formatted value including dial code', () => {
    const handleChange = vi.fn();

    render(
      <PhoneInput
        countryCode="US"
        value=""
        onChange={handleChange}
      />,
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '5551234567' } });

    // US dial code is +1, so onChange should be called with "+1 5551234567"
    expect(handleChange).toHaveBeenCalledWith('+1 5551234567');
  });

  it('shows country selector dropdown when CountryCodeSelect is clicked', () => {
    const handleChange = vi.fn();

    render(
      <CountryCodeSelect
        value="US"
        onChange={handleChange}
      />,
    );

    // The trigger button shows the country code
    const trigger = screen.getByRole('button');
    expect(trigger).toBeInTheDocument();

    // Click to open dropdown
    fireEvent.click(trigger);

    // Search input should appear in the dropdown
    expect(screen.getByPlaceholderText('Search country or code...')).toBeInTheDocument();
  });

  it('renders with initial value showing local number', () => {
    render(
      <PhoneInput
        countryCode="GB"
        value="+44 7911123456"
        onChange={vi.fn()}
      />,
    );

    // The dial code +44 is displayed in the prefix section
    expect(screen.getByText('+44')).toBeInTheDocument();

    // The local number portion should be in the input
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('7911123456');
  });
});
