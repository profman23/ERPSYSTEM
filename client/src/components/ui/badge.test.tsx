import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './badge';

describe('Badge', () => {
  it('renders with default variant', () => {
    render(<Badge data-testid="badge">Default</Badge>);
    const el = screen.getByTestId('badge');

    expect(el).toBeInTheDocument();
    // Default variant applies inline styles with var(--badge-default-bg)
    expect(el.style.backgroundColor).toBe('var(--badge-default-bg)');
  });

  it('renders text content', () => {
    render(<Badge>Active</Badge>);

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('applies variant styles (success, outline, secondary)', () => {
    const { rerender } = render(
      <Badge variant="success" data-testid="badge">
        Success
      </Badge>,
    );
    let el = screen.getByTestId('badge');
    expect(el.style.backgroundColor).toBe('var(--badge-success-bg)');
    expect(el.style.color).toBe('var(--badge-success-text)');

    rerender(
      <Badge variant="outline" data-testid="badge">
        Outline
      </Badge>,
    );
    el = screen.getByTestId('badge');
    expect(el.style.backgroundColor).toBe('transparent');
    expect(el.style.color).toBe('var(--color-text-secondary)');

    rerender(
      <Badge variant="secondary" data-testid="badge">
        Secondary
      </Badge>,
    );
    el = screen.getByTestId('badge');
    expect(el.style.backgroundColor).toBe('var(--color-surface-hover)');
  });

  it('supports custom className', () => {
    render(
      <Badge className="my-custom-class" data-testid="badge">
        Custom
      </Badge>,
    );
    const el = screen.getByTestId('badge');

    expect(el.className).toContain('my-custom-class');
  });

  it('renders as a span element', () => {
    render(<Badge data-testid="badge">Tag</Badge>);
    const el = screen.getByTestId('badge');

    expect(el.tagName).toBe('SPAN');
  });
});
