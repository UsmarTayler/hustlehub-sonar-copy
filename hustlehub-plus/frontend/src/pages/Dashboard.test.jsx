import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from './Dashboard';
import * as gigService from '../services/gigService';

vi.mock('../services/gigService');

describe('Dashboard page', () => {
  it('renders the create gig form and existing gigs', async () => {
    gigService.getMyGigs.mockResolvedValue({ data: [{ id: 1, title: 'Logo Design', price: 500 }] });

    render(<Dashboard />);
    expect(screen.getByRole('heading', { name: /create a gig/i })).toBeInTheDocument();
    expect(await screen.findByText('Logo Design')).toBeInTheDocument();
  });

  it('shows an empty state when the freelancer has no gigs yet', async () => {
    gigService.getMyGigs.mockResolvedValue({ data: [] });

    render(<Dashboard />);
    expect(await screen.findByText(/no gigs listed yet/i)).toBeInTheDocument();
  });

  it('lets the user fill in and submit the create gig form', async () => {
    const user = userEvent.setup();
    gigService.getMyGigs.mockResolvedValue({ data: [] });
    gigService.createGig.mockResolvedValue({ success: true });

    render(<Dashboard />);
    await screen.findByText(/no gigs listed yet/i);

    await user.type(screen.getByLabelText(/title/i), 'Logo Design');
    await user.type(screen.getByLabelText(/description/i), 'A clean, modern logo');
    await user.type(screen.getByLabelText(/price/i), '500');
    await user.click(screen.getByRole('button', { name: /publish gig/i }));

    expect(gigService.createGig).toHaveBeenCalledWith({
      title: 'Logo Design',
      description: 'A clean, modern logo',
      price: 500,
    });
  });
});