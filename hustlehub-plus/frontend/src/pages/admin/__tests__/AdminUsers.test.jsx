import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdminUsers from '../AdminUsers';
import * as adminService from '../../../services/adminService';
import { useAuth } from '../../../context/AuthContext';

vi.mock('../../../services/adminService');
vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// A logged-in admin, so the row-level self-checks don't disable the controls
// on the row we're about to interact with. Its _id must not match any of the
// fixtures below.
const CURRENT_ADMIN = {
  id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  name: 'Current Admin',
  email: 'current@example.com',
  role: 'admin',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/users']}>
      <AdminUsers />
    </MemoryRouter>
  );
}

function mockList(users, extra = {}) {
  adminService.listUsers.mockResolvedValue({
    data: users,
    total: users.length,
    page: 1,
    pages: 1,
    ...extra,
  });
}

const clientUser = {
  _id: '507f1f77bcf86cd799439011',
  name: 'Jane Client',
  email: 'jane@example.com',
  role: 'client',
  status: 'active',
  createdAt: '2026-01-15T00:00:00.000Z',
};

const freelancerUser = {
  _id: '507f1f77bcf86cd799439012',
  name: 'Sam Freelancer',
  email: 'sam@example.com',
  role: 'freelancer',
  status: 'active',
  createdAt: '2026-02-10T00:00:00.000Z',
};

const bannedUser = {
  _id: '507f1f77bcf86cd799439013',
  name: 'Banned Person',
  email: 'banned@example.com',
  role: 'client',
  status: 'banned',
  createdAt: '2026-03-01T00:00:00.000Z',
};

describe('AdminUsers page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      user: CURRENT_ADMIN,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
  });

  it('renders each user row with name, email, role and status controls', async () => {
    mockList([clientUser, freelancerUser]);
    renderPage();

    expect(await screen.findByText('Jane Client')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();

    expect(await screen.findByText('Sam Freelancer')).toBeInTheDocument();
    expect(screen.getByText('sam@example.com')).toBeInTheDocument();

    // One role select and one status select per row.
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(4);
  });

  it('shows the total user count in the header', async () => {
    mockList([clientUser, freelancerUser]);
    renderPage();

    expect(await screen.findByText(/2 users/i)).toBeInTheDocument();
  });

  it('shows an empty state when there are no users', async () => {
    mockList([]);
    renderPage();

    expect(await screen.findByText(/no users yet/i)).toBeInTheDocument();
  });

  it('shows an error state when the request fails', async () => {
    adminService.listUsers.mockRejectedValue({
      response: { data: { message: 'Server down' } },
    });
    renderPage();

    expect(await screen.findByText(/server down/i)).toBeInTheDocument();
  });

  it('refetches with the search parameter when the form is submitted', async () => {
    const user = userEvent.setup();
    mockList([clientUser]);
    renderPage();

    await screen.findByText('Jane Client');

    await user.type(screen.getByLabelText(/search/i), 'jane');
    await user.click(screen.getByRole('button', { name: /^search$/i }));

    await waitFor(() => {
      expect(adminService.listUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'jane', page: 1 })
      );
    });
  });

  it('refetches when the role filter changes', async () => {
    const user = userEvent.setup();
    mockList([clientUser]);
    renderPage();

    await screen.findByText('Jane Client');

    await user.selectOptions(
      screen.getByLabelText(/^role$/i, { selector: '#admin-role-filter' }),
      'freelancer'
    );

    await waitFor(() => {
      expect(adminService.listUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ role: 'freelancer', page: 1 })
      );
    });
  });

  it('updates a user role optimistically and calls the API', async () => {
    const user = userEvent.setup();
    mockList([clientUser]);
    adminService.updateUserRole.mockResolvedValue({
      data: { ...clientUser, role: 'freelancer' },
    });

    renderPage();
    await screen.findByText('Jane Client');

    const roleSelect = screen.getByLabelText(/^role$/i, {
      selector: `#role-${clientUser._id}`,
    });
    await user.selectOptions(roleSelect, 'freelancer');

    await waitFor(() => {
      expect(adminService.updateUserRole).toHaveBeenCalledWith(
        clientUser._id,
        'freelancer'
      );
    });
  });

  it('reverts the role and shows a row error when the update fails', async () => {
    const user = userEvent.setup();
    mockList([clientUser]);
    adminService.updateUserRole.mockRejectedValue({
      response: { data: { message: 'Cannot demote the last active admin' } },
    });

    renderPage();
    await screen.findByText('Jane Client');

    const roleSelect = screen.getByLabelText(/^role$/i, {
      selector: `#role-${clientUser._id}`,
    });
    await user.selectOptions(roleSelect, 'admin');

    expect(
      await screen.findByText(/cannot demote the last active admin/i)
    ).toBeInTheDocument();

    // Select reverts to the original role.
    await waitFor(() => {
      expect(roleSelect).toHaveValue('client');
    });
  });

  it('updates a user status optimistically and calls the API', async () => {
    const user = userEvent.setup();
    mockList([clientUser]);
    adminService.updateUserStatus.mockResolvedValue({
      data: { ...clientUser, status: 'suspended' },
    });

    renderPage();
    await screen.findByText('Jane Client');

    const statusSelect = screen.getByLabelText(/^status$/i, {
      selector: `#status-${clientUser._id}`,
    });
    await user.selectOptions(statusSelect, 'suspended');

    await waitFor(() => {
      expect(adminService.updateUserStatus).toHaveBeenCalledWith(
        clientUser._id,
        'suspended'
      );
    });
  });

  it('renders the Banned badge for banned users', async () => {
    mockList([bannedUser]);
    renderPage();

    expect(await screen.findByText(/^banned$/i)).toBeInTheDocument();
  });

  it('opens the confirm modal and deletes a user on confirm', async () => {
    const user = userEvent.setup();
    mockList([clientUser]);
    adminService.deleteUser.mockResolvedValue({ success: true });

    renderPage();
    await screen.findByText('Jane Client');

    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/jane client/i)).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole('button', { name: /delete user/i })
    );

    await waitFor(() => {
      expect(adminService.deleteUser).toHaveBeenCalledWith(clientUser._id);
    });

    // Row is removed from the list.
    await waitFor(() => {
      expect(screen.queryByText('Jane Client')).not.toBeInTheDocument();
    });
  });

  it('does not delete when the modal is cancelled', async () => {
    const user = userEvent.setup();
    mockList([clientUser]);

    renderPage();
    await screen.findByText('Jane Client');

    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /cancel/i }));

    expect(adminService.deleteUser).not.toHaveBeenCalled();
    expect(screen.getByText('Jane Client')).toBeInTheDocument();
  });

  it('shows a row error when delete is refused (e.g. user has bookings)', async () => {
    const user = userEvent.setup();
    mockList([clientUser]);
    adminService.deleteUser.mockRejectedValue({
      response: {
        data: { message: 'User has 3 booking(s). Ban instead of deleting.' },
      },
    });

    renderPage();
    await screen.findByText('Jane Client');

    await user.click(screen.getByRole('button', { name: /^delete$/i }));
    const dialog = screen.getByRole('dialog');
    await user.click(
      within(dialog).getByRole('button', { name: /delete user/i })
    );

    expect(
      await screen.findByText(/ban instead of deleting/i)
    ).toBeInTheDocument();
    // The row stays on screen.
    expect(screen.getByText('Jane Client')).toBeInTheDocument();
  });
});