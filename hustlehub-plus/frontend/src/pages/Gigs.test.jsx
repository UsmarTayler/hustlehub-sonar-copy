import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Gigs from './Gigs';
import * as gigService from '../services/gigService';

vi.mock('../services/gigService');

function renderGigs() {
  render(
    <BrowserRouter>
      <Gigs />
    </BrowserRouter>
  );
}

describe('Gigs page', () => {
  it('shows a loading state, then renders returned gigs', async () => {
    gigService.getAllGigs.mockResolvedValue({
      data: [
        {
          _id: '1',
          title: 'Logo Design',
          description: 'A nice logo',
          price: 500,
          freelancerName: 'Sam',
          category: 'Design',
        },
      ],
    });

    renderGigs();
    expect(screen.getByText(/loading gigs/i)).toBeInTheDocument();

    expect(await screen.findByText('Logo Design')).toBeInTheDocument();
  });

  it('shows an empty state when there are no gigs', async () => {
    gigService.getAllGigs.mockResolvedValue({ data: [] });

    renderGigs();
    expect(
      await screen.findByText(/no gigs available yet/i)
    ).toBeInTheDocument();
  });

  it('shows an error message when the request fails', async () => {
    gigService.getAllGigs.mockRejectedValue(new Error('Network error'));

    renderGigs();
    expect(
      await screen.findByText(/unable to load gigs/i)
    ).toBeInTheDocument();
  });

  it('links each gig card to its detail page', async () => {
    gigService.getAllGigs.mockResolvedValue({
      data: [
        {
          _id: 'abc123',
          title: 'Logo Design',
          description: 'desc',
          price: 500,
          freelancerName: 'Sam',
          category: 'Design',
        },
      ],
    });

    renderGigs();
    const title = await screen.findByText('Logo Design');
    // The whole card is a Link to /gigs/:id.
    const link = title.closest('a');
    expect(link).toHaveAttribute('href', '/gigs/abc123');
  });
});