import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Navbar from './Navbar';
import { useAuth } from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

function renderNavbar() {
  render(
    <BrowserRouter>
      <Navbar />
    </BrowserRouter>
  );
}

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Log in, Sign up and Browse Gigs when no user is logged in', () => {
    useAuth.mockReturnValue({ user: null, logout: vi.fn() });
    renderNavbar();

    expect(screen.getByText(/browse gigs/i)).toBeInTheDocument();
    expect(screen.getByText(/log in/i)).toBeInTheDocument();
    expect(screen.getByText(/sign up/i)).toBeInTheDocument();
    expect(screen.queryByText(/log out/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/admin/i, { selector: '.navbar-admin-link' })
    ).not.toBeInTheDocument();
  });

  it('shows Browse Gigs and My Bookings for a client', () => {
    useAuth.mockReturnValue({
      user: { name: 'Jane', role: 'client' },
      logout: vi.fn(),
    });
    renderNavbar();

    expect(screen.getByText('Jane')).toBeInTheDocument();
    expect(screen.getByText(/browse gigs/i)).toBeInTheDocument();
    expect(screen.getByText(/my bookings/i)).toBeInTheDocument();

    // Freelancer tools hidden.
    expect(screen.queryByText(/my gigs/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/bookings received/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/income/i)).not.toBeInTheDocument();

    // Admin link hidden.
    expect(
      screen.queryByText(/admin/i, { selector: '.navbar-admin-link' })
    ).not.toBeInTheDocument();
  });

  it('shows freelancer tools and hides Browse Gigs and My Bookings for a freelancer', () => {
    useAuth.mockReturnValue({
      user: { name: 'Sam', role: 'freelancer' },
      logout: vi.fn(),
    });
    renderNavbar();

    expect(screen.getByText('Sam')).toBeInTheDocument();
    expect(screen.getByText(/my gigs/i)).toBeInTheDocument();
    expect(screen.getByText(/bookings received/i)).toBeInTheDocument();
    expect(screen.getByText(/income/i)).toBeInTheDocument();

    // Client and public links hidden.
    expect(screen.queryByText(/browse gigs/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/my bookings/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/admin/i, { selector: '.navbar-admin-link' })
    ).not.toBeInTheDocument();
  });

  it('shows only the Admin link for an admin', () => {
    useAuth.mockReturnValue({
      user: { name: 'Admin', role: 'admin' },
      logout: vi.fn(),
    });
    renderNavbar();

    expect(screen.getByText('Admin', { selector: '.navbar-user' }))
      .toBeInTheDocument();
    expect(
      screen.getByText(/admin/i, { selector: '.navbar-admin-link' })
    ).toBeInTheDocument();

    // Client, freelancer and public tools all hidden.
    expect(screen.queryByText(/browse gigs/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/my bookings/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/my gigs/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/bookings received/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/income/i)).not.toBeInTheDocument();
  });

  it('calls logout when the Log out button is clicked', async () => {
    const user = userEvent.setup();
    const mockLogout = vi.fn();
    useAuth.mockReturnValue({
      user: { name: 'Jane', role: 'client' },
      logout: mockLogout,
    });
    renderNavbar();

    await user.click(screen.getByText(/log out/i));
    expect(mockLogout).toHaveBeenCalled();
  });
});