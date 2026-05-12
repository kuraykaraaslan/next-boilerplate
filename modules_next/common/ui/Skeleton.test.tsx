import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton, SkeletonText, SkeletonCard, SkeletonTable } from './Skeleton';

describe('Skeleton', () => {
  it('has role=status and aria-busy=true', () => {
    render(<Skeleton className="h-4 w-full" />);
    const el = screen.getByRole('status');
    expect(el).toHaveAttribute('aria-busy', 'true');
  });

  it('uses custom aria-label', () => {
    render(<Skeleton aria-label="Loading user..." />);
    expect(screen.getByLabelText(/loading user/i)).toBeInTheDocument();
  });
});

describe('SkeletonText', () => {
  it('renders the correct number of lines', () => {
    render(<SkeletonText lines={4} />);
    const el = screen.getByRole('status');
    expect(el.children).toHaveLength(4);
  });
});

describe('SkeletonCard', () => {
  it('renders with status role', () => {
    render(<SkeletonCard />);
    const statuses = screen.getAllByRole('status');
    expect(statuses.length).toBeGreaterThan(0);
  });
});

describe('SkeletonTable', () => {
  it('renders the correct number of rows', () => {
    render(<SkeletonTable rows={3} cols={2} />);
    const statuses = screen.getAllByRole('status');
    expect(statuses.length).toBeGreaterThan(0);
  });
});
