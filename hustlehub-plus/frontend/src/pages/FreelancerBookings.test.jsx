import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import FreelancerBookings from './FreelancerBookings';
import * as gigService from '../services/gigService';

vi.mock('../services/gigService');

function renderPage() {
  return render(
    <BrowserRouter>
      <FreelancerBookings />
    </BrowserRouter>
  );
}

const booking = {
  _id: 'b1',
  gigId: 'g1',
  clientName: 'Jane Client',
  amount: 450,
  status: 'pending',
  bookingDate: '2026-01-15T00:00:00.000Z',
  message: 'Need it by Friday please.',
  gigDetails: { title: 'Logo Design', category: 'Design' },
};

describe('FreelancerBookings page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders each booking with client, amount and message', async () => {
    gigService.getFreelancerBookings.mockResolvedValue({ data: [booking] });

    renderPage();

    expect(await screen.findByText('Logo Design')).toBeInTheDocument();
    expect(screen.getByText('Jane Client')).toBeInTheDocument();
    expect(screen.getByText(/R\s?450/)).toBeInTheDocument();
    expect(
      screen.getByText(/need it by friday please/i)
    ).toBeInTheDocument();
  });

  it('falls back to a placeholder when gigDetails is missing', async () => {
    gigService.getFreelancerBookings.mockResolvedValue({
      data: [{ ...booking, gigDetails: null }],
    });

    renderPage();

    expect(
      await screen.findByText(/gig no longer available/i)
    ).toBeInTheDocument();
  });

  it('shows an empty state when there are no bookings', async () => {
    gigService.getFreelancerBookings.mockResolvedValue({ data: [] });

    renderPage();

    expect(
      await screen.findByText(/no bookings yet/i)
    ).toBeInTheDocument();
  });

  it('shows an error state when the request fails', async () => {
    gigService.getFreelancerBookings.mockRejectedValue({
      response: { data: { message: 'Server down' } },
    });

    renderPage();

    expect(await screen.findByText(/server down/i)).toBeInTheDocument();
  });

  it('updates the status optimistically and calls the API', async () => {
    const user = userEvent.setup();
    gigService.getFreelancerBookings.mockResolvedValue({ data: [booking] });
    gigService.updateBookingStatus.mockResolvedValue({
      data: { ...booking, status: 'confirmed' },
    });

    renderPage();
    await screen.findByText('Logo Design');

    const select = screen.getByLabelText(/status/i);
    await user.selectOptions(select, 'confirmed');

    // The badge is the reliable indicator of the row's status —
    // the <select> also has an option matching /confirmed/i.
    await waitFor(() => {
      const badge = document.querySelector('.status-badge');
      expect(badge).toHaveTextContent(/confirmed/i);
    });

    expect(gigService.updateBookingStatus).toHaveBeenCalledWith(
      'b1',
      'confirmed'
    );
  });

  it('reverts the status and shows a row error when the update fails', async () => {
    const user = userEvent.setup();
    gigService.getFreelancerBookings.mockResolvedValue({ data: [booking] });
    gigService.updateBookingStatus.mockRejectedValue({
      response: { data: { message: 'Not allowed' } },
    });

    renderPage();
    await screen.findByText('Logo Design');

    const select = screen.getByLabelText(/status/i);
    await user.selectOptions(select, 'completed');

    expect(await screen.findByText(/not allowed/i)).toBeInTheDocument();

    // Reverted back to the original status. Scope to the badge — the
    // <select> also contains a "Pending" option.
    await waitFor(() => {
      const badge = document.querySelector('.status-badge');
      expect(badge).toHaveTextContent(/pending/i);
    });
  });
});