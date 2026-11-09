import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Bookings from './Bookings';
import * as gigService from '../services/gigService';

vi.mock('../services/gigService');

function renderBookings() {
  return render(
    <MemoryRouter>
      <Bookings />
    </MemoryRouter>
  );
}

describe('Bookings page (client view)', () => {
  it('shows the client heading and empty state when there are no bookings', async () => {
    gigService.getMyBookings.mockResolvedValue({ data: [] });

    renderBookings();

    expect(
      screen.getByRole('heading', { name: /my bookings/i })
    ).toBeInTheDocument();
    expect(await screen.findByText(/haven't booked/i)).toBeInTheDocument();
  });

  it('renders each booking with its gig title and amount', async () => {
    gigService.getMyBookings.mockResolvedValue({
      data: [
        {
          _id: 'b1',
          gigDetails: { title: 'Logo Design' },
          clientName: 'Jane',
          freelancerName: 'Sam',
          amount: 500,
          status: 'confirmed',
        },
      ],
    });

    renderBookings();

    expect(await screen.findByText('Logo Design')).toBeInTheDocument();
    expect(screen.getByText(/R500/)).toBeInTheDocument();
    expect(screen.getByText(/confirmed/i)).toBeInTheDocument();
  });

  it('shows an error message when the request fails', async () => {
    gigService.getMyBookings.mockRejectedValue(new Error('Network error'));

    renderBookings();

    expect(
      await screen.findByText(/unable to load bookings/i)
    ).toBeInTheDocument();
  });
});