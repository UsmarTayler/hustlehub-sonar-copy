import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import BookingSuccess from './BookingSuccess';
import * as gigService from '../services/gigService';

vi.mock('../services/gigService');

function renderSuccess({ bookingId = 'b1', state } = {}) {
  return render(
    <MemoryRouter
      initialEntries={[
        { pathname: `/booking/success/${bookingId}`, state },
      ]}
    >
      <Routes>
        <Route path="/booking/success/:id" element={<BookingSuccess />} />
      </Routes>
    </MemoryRouter>
  );
}

const transaction = {
  _id: 'txn12345678',
  amount: 450,
  paymentMethod: 'simulated',
  status: 'completed',
};

const booking = {
  _id: 'b1',
  amount: 450,
  status: 'confirmed',
  bookingDate: '2026-01-15T00:00:00.000Z',
};

describe('BookingSuccess page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Payment confirmed: R450" from route state without fetching', () => {
    renderSuccess({ state: { transaction } });

    expect(
      screen.getByText(/payment confirmed: r450/i)
    ).toBeInTheDocument();
    expect(gigService.getBookingById).not.toHaveBeenCalled();
  });

  it('shows the transaction reference and method', () => {
    renderSuccess({ state: { transaction } });

    expect(screen.getByText(/simulated/i)).toBeInTheDocument();
    expect(screen.getByText(/completed/i)).toBeInTheDocument();
    // Reference is derived from the last 8 chars of the _id, uppercased.
    expect(screen.getByText(/TXN-12345678/i)).toBeInTheDocument();
  });

  it('fetches the booking when route state is missing', async () => {
    gigService.getBookingById.mockResolvedValue({
      data: {
        booking,
        transaction,
        gigDetails: { title: 'Logo Design' },
      },
    });

    renderSuccess();

    expect(
      await screen.findByText(/payment confirmed: r450/i)
    ).toBeInTheDocument();
    expect(gigService.getBookingById).toHaveBeenCalledWith('b1');
  });

  it('shows the error state when the fetch fails', async () => {
    gigService.getBookingById.mockRejectedValue({
      response: { data: { message: 'Booking not found' } },
    });

    renderSuccess();

    expect(
      await screen.findByText(/booking not found/i)
    ).toBeInTheDocument();
  });
});