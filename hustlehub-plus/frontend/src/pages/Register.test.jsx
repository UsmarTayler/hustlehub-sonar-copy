// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Register from './Register';
import { AuthProvider } from '../context/AuthContext';
import * as authService from '../services/authService';

vi.mock('../services/authService');

function renderRegister() {
  render(
    <BrowserRouter>
      <AuthProvider>
        <Register />
      </AuthProvider>
    </BrowserRouter>
  );
}

describe('Register page', () => {
  it('renders the registration form', () => {
    renderRegister();
    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('lets a user type into the form fields', async () => {
    const user = userEvent.setup();
    renderRegister();

    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'Jane Freelancer');

    expect(nameInput).toHaveValue('Jane Freelancer');
  });

  it('shows a loading state when the form is submitted', async () => {
    // The request never finishes, so the loading state stays on screen. Without
    // this the page sent a real request that failed instantly and the state
    // disappeared before the check, which made the test fail at random.
    authService.registerUser.mockImplementation(() => new Promise(() => {}));
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByLabelText(/name/i), 'Jane Freelancer');
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    expect(screen.getByRole('button', { name: /creating account/i })).toBeInTheDocument();
  });
});