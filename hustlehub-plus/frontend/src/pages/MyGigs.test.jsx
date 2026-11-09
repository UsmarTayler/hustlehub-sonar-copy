import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import MyGigs from './MyGigs';
import * as gigService from '../services/gigService';

vi.mock('../services/gigService');

function renderMyGigs() {
  return render(
    <BrowserRouter>
      <MyGigs />
    </BrowserRouter>
  );
}

const activeGig = {
  _id: 'g1',
  title: 'Logo Design',
  description: 'A nice logo',
  price: 450,
  category: 'Design',
  duration: '3–5 days',
  status: 'active',
};

const inactiveGig = {
  _id: 'g2',
  title: 'Old Flyer',
  description: 'Removed listing',
  price: 100,
  category: 'Design',
  status: 'inactive',
};

describe('MyGigs page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the freelancer\u2019s gigs with an edit link', async () => {
    gigService.getMyGigs.mockResolvedValue({ data: [activeGig] });

    renderMyGigs();

    expect(await screen.findByText('Logo Design')).toBeInTheDocument();
    const editLink = screen.getByRole('link', { name: /edit/i });
    expect(editLink).toHaveAttribute('href', '/gigs/g1/edit');
  });

  it('shows an empty state when there are no gigs', async () => {
    gigService.getMyGigs.mockResolvedValue({ data: [] });

    renderMyGigs();

    expect(
      await screen.findByText(/haven\u2019t created any gigs yet/i)
    ).toBeInTheDocument();
  });

  it('shows an error state when the request fails', async () => {
    gigService.getMyGigs.mockRejectedValue({
      response: { data: { message: 'Server down' } },
    });

    renderMyGigs();

    expect(await screen.findByText(/server down/i)).toBeInTheDocument();
  });

  it('hides Edit and Remove on inactive gigs', async () => {
    gigService.getMyGigs.mockResolvedValue({ data: [inactiveGig] });

    renderMyGigs();
    await screen.findByText('Old Flyer');

    expect(
      screen.queryByRole('link', { name: /edit/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /remove/i })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view/i })).toBeInTheDocument();
  });

  it('opens the confirm modal and soft-deletes on confirm', async () => {
    const user = userEvent.setup();
    gigService.getMyGigs.mockResolvedValue({ data: [activeGig] });
    gigService.deleteGig.mockResolvedValue({ success: true });

    renderMyGigs();
    await screen.findByText('Logo Design');

    await user.click(screen.getByRole('button', { name: /^remove$/i }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/logo design/i)).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole('button', { name: /remove gig/i })
    );

    await waitFor(() => {
      expect(gigService.deleteGig).toHaveBeenCalledWith('g1');
    });

    // The row stays but is now inactive — Edit and Remove are gone.
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /^remove$/i })
      ).not.toBeInTheDocument();
    });
  });

  it('does not delete when the modal is cancelled', async () => {
    const user = userEvent.setup();
    gigService.getMyGigs.mockResolvedValue({ data: [activeGig] });

    renderMyGigs();
    await screen.findByText('Logo Design');

    await user.click(screen.getByRole('button', { name: /^remove$/i }));

    const dialog = screen.getByRole('dialog');
    await user.click(
      within(dialog).getByRole('button', { name: /keep it/i })
    );

    expect(gigService.deleteGig).not.toHaveBeenCalled();
  });
});