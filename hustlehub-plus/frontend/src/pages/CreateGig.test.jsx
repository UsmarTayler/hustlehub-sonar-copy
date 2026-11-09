import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MemoryRouter,
  Routes,
  Route,
  useLocation,
} from 'react-router-dom';
import CreateGig from './CreateGig';
import * as gigService from '../services/gigService';

vi.mock('../services/gigService');

function MyGigsProbe() {
  const location = useLocation();
  return <div data-testid="my-gigs-probe">{location.pathname}</div>;
}

function renderCreateGig() {
  return render(
    <MemoryRouter initialEntries={['/gigs/create']}>
      <Routes>
        <Route path="/gigs/create" element={<CreateGig />} />
        <Route path="/my-gigs" element={<MyGigsProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

async function fillValidForm(user) {
  await user.type(screen.getByLabelText(/title/i), 'Logo Design');
  await user.type(
    screen.getByLabelText(/description/i),
    'A clean, modern logo that scales well.'
  );
  await user.type(screen.getByLabelText(/price/i), '450');
  await user.type(screen.getByLabelText(/category/i), 'Design');
}

describe('CreateGig page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form with all fields', () => {
    renderCreateGig();

    expect(
      screen.getByRole('heading', { name: /create a gig/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/duration/i)).toBeInTheDocument();
  });

  it('blocks submit and shows errors when required fields are empty', async () => {
    const user = userEvent.setup();
    renderCreateGig();

    await user.click(screen.getByRole('button', { name: /publish gig/i }));

    expect(await screen.findByText(/title is required/i)).toBeInTheDocument();
    expect(screen.getByText(/description is required/i)).toBeInTheDocument();
    expect(screen.getByText(/price is required/i)).toBeInTheDocument();
    expect(screen.getByText(/category is required/i)).toBeInTheDocument();
    expect(gigService.createGig).not.toHaveBeenCalled();
  });

  it('rejects a description that is too short without hitting the API', async () => {
    const user = userEvent.setup();
    renderCreateGig();

    await user.type(screen.getByLabelText(/title/i), 'Logo Design');
    await user.type(screen.getByLabelText(/description/i), 'Too short');
    await user.type(screen.getByLabelText(/price/i), '450');
    await user.type(screen.getByLabelText(/category/i), 'Design');
    await user.click(screen.getByRole('button', { name: /publish gig/i }));

    expect(
      await screen.findByText(/at least 10 characters/i)
    ).toBeInTheDocument();
    expect(gigService.createGig).not.toHaveBeenCalled();
  });

  it('rejects a non-positive price without hitting the API', async () => {
    const user = userEvent.setup();
    renderCreateGig();

    await user.type(screen.getByLabelText(/title/i), 'Logo Design');
    await user.type(
      screen.getByLabelText(/description/i),
      'A clean, modern logo.'
    );
    await user.type(screen.getByLabelText(/price/i), '0');
    await user.type(screen.getByLabelText(/category/i), 'Design');
    await user.click(screen.getByRole('button', { name: /publish gig/i }));

    expect(
      await screen.findByText(/price must be greater than 0/i)
    ).toBeInTheDocument();
    expect(gigService.createGig).not.toHaveBeenCalled();
  });

  it('submits the correct payload and navigates to /my-gigs', async () => {
    const user = userEvent.setup();
    gigService.createGig.mockResolvedValue({ success: true });

    renderCreateGig();
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /publish gig/i }));

    await waitFor(() => {
      expect(gigService.createGig).toHaveBeenCalledWith({
        title: 'Logo Design',
        description: 'A clean, modern logo that scales well.',
        price: 450,
        category: 'Design',
      });
    });

    expect(await screen.findByTestId('my-gigs-probe')).toHaveTextContent(
      '/my-gigs'
    );
  });

  it('includes duration in the payload when provided', async () => {
    const user = userEvent.setup();
    gigService.createGig.mockResolvedValue({ success: true });

    renderCreateGig();
    await fillValidForm(user);
    await user.type(screen.getByLabelText(/duration/i), '3\u20135 days');
    await user.click(screen.getByRole('button', { name: /publish gig/i }));

    await waitFor(() => {
      expect(gigService.createGig).toHaveBeenCalledWith(
        expect.objectContaining({ duration: '3\u20135 days' })
      );
    });
  });

  it('renders server-side field errors inline', async () => {
    const user = userEvent.setup();
    gigService.createGig.mockRejectedValue({
      response: {
        data: {
          success: false,
          message: 'Validation failed',
          errors: [
            { field: 'title', message: 'Title must be unique.' },
          ],
        },
      },
    });

    renderCreateGig();
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /publish gig/i }));

    expect(
      await screen.findByText(/title must be unique/i)
    ).toBeInTheDocument();
  });
});