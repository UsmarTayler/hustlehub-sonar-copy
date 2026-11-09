import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MemoryRouter,
  Routes,
  Route,
  useLocation,
} from 'react-router-dom';
import GigDetail from './GigDetail';
import * as gigService from '../services/gigService';
import { useAuth } from '../context/AuthContext';

vi.mock('../services/gigService');
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Small helper route so we can assert the success navigation target.
function SuccessProbe() {
  const location = useLocation();
  return <div data-testid="success-probe">{location.pathname}</div>;
}

function renderGigDetail(gigId = 'g1') {
  return render(
    <MemoryRouter initialEntries={[`/gigs/${gigId}`]}>
      <Routes>
        <Route path="/gigs/:id" element={<GigDetail />} />
        <Route path="/booking/success/:id" element={<SuccessProbe />} />
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/my-gigs" element={<div>My gigs page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

const baseGig = {
  _id: 'g1',
  title: 'Logo Design',
  description: 'A nice logo',
  price: 450,
  category: 'Design',
  duration: '3–5 days',
  freelancerId: 'f1',
  freelancerName: 'Sam',
  status: 'active',
};

describe('GigDetail page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the gig once loaded', async () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    gigService.getGigById.mockResolvedValue({ data: baseGig });

    renderGigDetail();

    expect(await screen.findByRole('heading', { name: 'Logo Design' })).toBeInTheDocument();
    expect(screen.getByText(/R\s?450/)).toBeInTheDocument();
    expect(screen.getByText('A nice logo')).toBeInTheDocument();
  });

  it('shows a log-in prompt and no booking form when logged out', async () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    gigService.getGigById.mockResolvedValue({ data: baseGig });

    renderGigDetail();
    await screen.findByRole('heading', { name: 'Logo Design' });

    expect(screen.getByText(/log in to book/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /book for/i })
    ).not.toBeInTheDocument();
  });

  it('shows the booking form for a logged-in client', async () => {
    useAuth.mockReturnValue({
      user: { id: 'c1', name: 'Jane', role: 'client' },
      loading: false,
    });
    gigService.getGigById.mockResolvedValue({ data: baseGig });

    renderGigDetail();
    await screen.findByRole('heading', { name: 'Logo Design' });

    expect(
      screen.getByRole('button', { name: /book for r450/i })
    ).toBeInTheDocument();
  });

  it('shows "Your gig" instead of the booking form for the owner', async () => {
    useAuth.mockReturnValue({
      user: { id: 'f1', name: 'Sam', role: 'freelancer' },
      loading: false,
    });
    gigService.getGigById.mockResolvedValue({ data: baseGig });

    renderGigDetail();
    await screen.findByRole('heading', { name: 'Logo Design' });

    expect(screen.getByText(/your gig/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /book for/i })
    ).not.toBeInTheDocument();
  });

  it('opens the confirm modal with the required wording', async () => {
    const user = userEvent.setup();
    useAuth.mockReturnValue({
      user: { id: 'c1', name: 'Jane', role: 'client' },
      loading: false,
    });
    gigService.getGigById.mockResolvedValue({ data: baseGig });

    renderGigDetail();
    await screen.findByRole('heading', { name: 'Logo Design' });

    await user.click(screen.getByRole('button', { name: /book for r450/i }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    // The rubric requires "Confirm R450 for [Gig]".
    // R450 and the gig title also appear in the page behind the modal,
    // so scope to the modal's message paragraph specifically.
    const modalMessage = dialog.querySelector('.modal-message');
    expect(modalMessage).toBeTruthy();
    expect(modalMessage).toHaveTextContent(/R\s?450/);
    expect(modalMessage).toHaveTextContent(/Logo Design/);

    // The confirm button also has its own accessible name.
    expect(
      within(dialog).getByRole('button', { name: /pay r450/i })
    ).toBeInTheDocument();
  });

  it('calls createBooking and navigates to the success route on confirm', async () => {
    const user = userEvent.setup();
    useAuth.mockReturnValue({
      user: { id: 'c1', name: 'Jane', role: 'client' },
      loading: false,
    });
    gigService.getGigById.mockResolvedValue({ data: baseGig });
    gigService.createBooking.mockResolvedValue({
      data: {
        booking: { _id: 'b1', amount: 450, status: 'confirmed' },
        transaction: { _id: 't1', amount: 450, status: 'completed' },
      },
    });

    renderGigDetail();
    await screen.findByRole('heading', { name: 'Logo Design' });

    await user.click(screen.getByRole('button', { name: /book for r450/i }));
    await user.click(screen.getByRole('button', { name: /pay r450/i }));

    await waitFor(() => {
      expect(gigService.createBooking).toHaveBeenCalledWith({ gigId: 'g1' });
    });

    expect(await screen.findByTestId('success-probe')).toHaveTextContent(
      '/booking/success/b1'
    );
  });

  it('does not call createBooking when the modal is cancelled', async () => {
    const user = userEvent.setup();
    useAuth.mockReturnValue({
      user: { id: 'c1', name: 'Jane', role: 'client' },
      loading: false,
    });
    gigService.getGigById.mockResolvedValue({ data: baseGig });

    renderGigDetail();
    await screen.findByRole('heading', { name: 'Logo Design' });

    await user.click(screen.getByRole('button', { name: /book for r450/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(gigService.createBooking).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows a dedicated "Gig not found" state on 404', async () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    gigService.getGigById.mockRejectedValue({
      response: { status: 404, data: { message: 'Gig not found' } },
    });

    renderGigDetail();

    expect(await screen.findByText(/gig not found/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /back to marketplace/i })
    ).toBeInTheDocument();
  });

  it('shows a generic error state on non-404 failures', async () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    gigService.getGigById.mockRejectedValue({
      response: { status: 500, data: { message: 'Server exploded' } },
    });

    renderGigDetail();

    expect(
      await screen.findByText(/something went wrong/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/server exploded/i)).toBeInTheDocument();
  });
});