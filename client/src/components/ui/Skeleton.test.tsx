import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('renders with default styles', () => {
    const { container } = render(<Skeleton data-testid="skeleton" />);
    const el = screen.getByTestId('skeleton');

    expect(el).toBeInTheDocument();
    // Default variant is 'rectangular' which applies rounded-md
    expect(el.className).toContain('rounded-md');
    // Default animation is 'pulse'
    expect(el.className).toContain('animate-pulse');
  });

  it('applies className prop', () => {
    render(<Skeleton className="custom-class" data-testid="skeleton" />);
    const el = screen.getByTestId('skeleton');

    expect(el.className).toContain('custom-class');
  });

  it('renders with specified width and height via style', () => {
    render(
      <Skeleton
        data-testid="skeleton"
        style={{ width: '200px', height: '40px' }}
      />,
    );
    const el = screen.getByTestId('skeleton');

    expect(el.style.width).toBe('200px');
    expect(el.style.height).toBe('40px');
  });

  it('renders circular variant with rounded-full', () => {
    render(<Skeleton variant="circular" data-testid="skeleton" />);
    const el = screen.getByTestId('skeleton');

    expect(el.className).toContain('rounded-full');
    // Should NOT have rectangular rounding
    expect(el.className).not.toContain('rounded-md');
  });

  it('renders as a div element', () => {
    render(<Skeleton data-testid="skeleton" />);
    const el = screen.getByTestId('skeleton');

    expect(el.tagName).toBe('DIV');
  });
});
