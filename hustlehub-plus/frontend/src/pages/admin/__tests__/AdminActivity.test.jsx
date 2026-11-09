import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdminActivity from '../AdminActivity';
import * as adminService from '../../../services/adminService';

vi.mock('../../../services/adminService');

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/activity']}>
      <AdminActivity />
    </MemoryRouter>
  );
}

function mockList(entries, extra = {}) {
  adminService.listActivity.mockResolvedValue({
    data: entries,
    total: entries.length,
    page: 1,
    pages: 1,
    ...extra,
  });
}

const loginEntry = {
  _id: 'a1',
  actorId: '507f1f77bcf86cd799439011',
  actorName: 'Jane Client',
  actorRole: 'client',
  action: 'user.login',
  targetType: 'User',
  targetId: '507f1f77bcf86cd799439011',
  metadata: { email: 'jane@example.com' },
  ipAddress: '127.0.0.1',
  createdAt: '2026-03-01T10:15:00.000Z',
};

const adminEntry = {
  _id: 'a2',
  actorId: '507f1f77bcf86cd799439033',
  actorName: 'Admin',
  actorRole: 'admin',
  action: 'admin.user.role_changed',
  targetType: 'User',
  targetId: '507f1f77bcf86cd799439012',
  metadata: { from: 'client', to: 'freelancer' },
  ipAddress: '127.0.0.1',
  createdAt: '2026-03-01T11:00:00.000Z',
};

describe('AdminActivity page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders each entry with a humanised action and the raw action', async () => {
    mockList([loginEntry, adminEntry]);
    renderPage();

    // Humanised labels. Case-insensitive because humaniseAction
    // capitalises every word.
    expect(await screen.findByText(/^login$/i)).toBeInTheDocument();
    expect(screen.getByText(/role changed/i)).toBeInTheDocument();

    // Raw action strings are shown alongside for debuggability.
    // Scope to the raw action span — the filter dropdown also
    // contains these strings as <option> values.
    const rawActions = document.querySelectorAll('.admin-activity-action-raw');
    const rawTexts = Array.from(rawActions).map((el) => el.textContent);
    expect(rawTexts).toContain('user.login');
    expect(rawTexts).toContain('admin.user.role_changed');
  });

  it('renders the total entry count in the header', async () => {
    mockList([loginEntry, adminEntry]);
    renderPage();

    expect(await screen.findByText(/2 entries/i)).toBeInTheDocument();
  });

  it('flags admin-originated events with an Admin tag', async () => {
    mockList([adminEntry]);
    renderPage();

    expect(
      await screen.findByText(/^admin$/i, { selector: '.admin-activity-tag' })
    ).toBeInTheDocument();
  });

  it('renders the actor name and role', async () => {
    mockList([loginEntry]);
    renderPage();

    expect(
      await screen.findByText(/jane client · client/i)
    ).toBeInTheDocument();
  });

  it('renders the target type and id when present', async () => {
    mockList([adminEntry]);
    renderPage();

    expect(await screen.findByText(/target:/i)).toBeInTheDocument();
    expect(screen.getByText(/507f1f77bcf86cd799439012/)).toBeInTheDocument();
  });

  it('renders metadata keys and values', async () => {
    mockList([adminEntry]);
    renderPage();

    expect(await screen.findByText('from')).toBeInTheDocument();
    expect(screen.getByText('client')).toBeInTheDocument();
    expect(screen.getByText('to')).toBeInTheDocument();
    expect(screen.getByText('freelancer')).toBeInTheDocument();
  });

  it('shows an empty state when there are no entries', async () => {
    mockList([]);
    renderPage();

    expect(
      await screen.findByText(/no activity recorded yet/i)
    ).toBeInTheDocument();
  });

  it('shows an error state when the request fails', async () => {
    adminService.listActivity.mockRejectedValue({
      response: { data: { message: 'Server down' } },
    });
    renderPage();

    expect(await screen.findByText(/server down/i)).toBeInTheDocument();
  });

  it('refetches when an action filter is chosen', async () => {
    const user = userEvent.setup();
    mockList([loginEntry]);
    renderPage();

    await screen.findByText(/^login$/i);

    await user.selectOptions(
      screen.getByLabelText(/^action$/i, { selector: '#activity-action' }),
      'user.login'
    );

    await waitFor(() => {
      expect(adminService.listActivity).toHaveBeenLastCalledWith(
        expect.objectContaining({ action: 'user.login', page: 1 })
      );
    });
  });

  it('reveals a custom action input when Custom is selected', async () => {
    const user = userEvent.setup();
    mockList([loginEntry]);
    renderPage();

    await screen.findByText(/^login$/i);

    // The custom input is not present until "Custom…" is chosen.
    expect(
      screen.queryByLabelText(/custom action/i)
    ).not.toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText(/^action$/i, { selector: '#activity-action' }),
      '__custom__'
    );

    expect(
      screen.getByLabelText(/custom action/i)
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText(/custom action/i), 'gig.updated');

    await waitFor(() => {
      expect(adminService.listActivity).toHaveBeenLastCalledWith(
        expect.objectContaining({ action: 'gig.updated' })
      );
    });
  });

  it('refetches when a target type filter is chosen', async () => {
    const user = userEvent.setup();
    mockList([adminEntry]);
    renderPage();

    await screen.findByText(/role changed/i);

    await user.selectOptions(
      screen.getByLabelText(/^target$/i, { selector: '#activity-target' }),
      'User'
    );

    await waitFor(() => {
      expect(adminService.listActivity).toHaveBeenLastCalledWith(
        expect.objectContaining({ targetType: 'User' })
      );
    });
  });

  it('refetches when an actor id is typed', async () => {
    const user = userEvent.setup();
    mockList([loginEntry]);
    renderPage();

    await screen.findByText(/^login$/i);

    await user.type(
      screen.getByLabelText(/actor id/i, { selector: '#activity-actor' }),
      '507f1f77bcf86cd799439011'
    );

    await waitFor(() => {
      expect(adminService.listActivity).toHaveBeenLastCalledWith(
        expect.objectContaining({ actorId: '507f1f77bcf86cd799439011' })
      );
    });
  });

  it('clears all filters when Clear is clicked', async () => {
    const user = userEvent.setup();
    mockList([loginEntry]);
    renderPage();

    await screen.findByText(/^login$/i);

    await user.selectOptions(
      screen.getByLabelText(/^action$/i, { selector: '#activity-action' }),
      'user.login'
    );

    // Clear button only appears once a filter is set.
    const clearBtn = await screen.findByRole('button', { name: /clear/i });
    await user.click(clearBtn);

    await waitFor(() => {
      const lastCall =
        adminService.listActivity.mock.calls[
          adminService.listActivity.mock.calls.length - 1
        ][0];
      expect(lastCall.action).toBeUndefined();
    });
  });

  it('shows the filtered empty state when filters match nothing', async () => {
    const user = userEvent.setup();
    // First call returns one entry so the page renders, second call returns
    // nothing so the filtered empty state shows.
    adminService.listActivity
      .mockResolvedValueOnce({
        data: [loginEntry],
        total: 1,
        page: 1,
        pages: 1,
      })
      .mockResolvedValueOnce({
        data: [],
        total: 0,
        page: 1,
        pages: 1,
      });

    renderPage();
    await screen.findByText(/^login$/i);

    await user.selectOptions(
      screen.getByLabelText(/^action$/i, { selector: '#activity-action' }),
      'gig.deleted'
    );

    expect(
      await screen.findByText(/no activity matches those filters/i)
    ).toBeInTheDocument();
  });
});