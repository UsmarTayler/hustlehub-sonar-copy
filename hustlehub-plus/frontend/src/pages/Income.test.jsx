import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Income from './Income';
import * as incomeService from '../services/incomeService';

vi.mock('../services/incomeService');

function renderIncome() {
  return render(
    <BrowserRouter>
      <Income />
    </BrowserRouter>
  );
}

const summary = {
  totalIncome: 4500,
  totalTransactions: 12,
  completedTransactions: 10,
  pendingTransactions: 2,
  averageTransactionAmount: 450,
};

const tax = {
  totalIncome: 4500,
  taxRate: 15,
  estimatedTax: 675,
  netIncome: 3825,
  taxBrackets: [{ bracket: '0 - 5,000', rate: 15 }],
  currency: 'ZAR',
  year: 2026,
  disclaimer: 'This is a simplified tax estimation.',
};

const transactions = [
  {
    _id: 't1',
    amount: 450,
    status: 'completed',
    transactionDate: '2026-01-15T00:00:00.000Z',
    bookingDetails: {
      clientName: 'Jane Client',
      message: 'Thanks!',
    },
  },
];

function mockAll({
  summaryRes = summary,
  taxRes = tax,
  txRes = transactions,
  periodRes = [
    { period: '2026-01', totalAmount: 900, transactionCount: 2 },
  ],
} = {}) {
  incomeService.getIncomeSummary.mockResolvedValue({ data: summaryRes });
  incomeService.getTaxEstimation.mockResolvedValue({ data: taxRes });
  incomeService.getTransactionHistory.mockResolvedValue({ data: txRes });
  incomeService.getIncomeByPeriod.mockResolvedValue({ data: periodRes });
}

describe('Income page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders summary cards with formatted amounts', async () => {
    mockAll();
    renderIncome();

    // Wait for the loading state to clear. The page renders only a
    // loading message until all three initial fetches resolve.
    await screen.findByRole('heading', { name: /^income$/i });

    const summaryGrid = document.querySelector('.income-summary-grid');
    expect(summaryGrid).toBeTruthy();

    expect(within(summaryGrid).getByText(/total income/i)).toBeInTheDocument();
    expect(
      within(summaryGrid).getByText(/R4[\s,.]?500/)
    ).toBeInTheDocument();
    expect(within(summaryGrid).getByText('10')).toBeInTheDocument();
    expect(within(summaryGrid).getByText('2')).toBeInTheDocument();
  });

  it('renders the tax panel', async () => {
    mockAll();
    renderIncome();

    expect(
      await screen.findByRole('heading', { name: /estimated tax/i })
    ).toBeInTheDocument();

    const taxHeader = document.querySelector('.income-tax-header');
    expect(taxHeader).toBeTruthy();
    expect(within(taxHeader).getByText('15%')).toBeInTheDocument();

    const taxFigures = document.querySelector('.income-tax-figures');
    expect(taxFigures).toBeTruthy();

    expect(within(taxFigures).getByText(/R675/)).toBeInTheDocument();
    expect(within(taxFigures).getByText(/R3[\s,.]?825/)).toBeInTheDocument();
  });

  it('renders the transaction history with the client name', async () => {
    mockAll();
    renderIncome();

    expect(await screen.findByText('Jane Client')).toBeInTheDocument();
    expect(screen.getByText(/thanks!/i)).toBeInTheDocument();
  });

  it('loads the default period (monthly) on mount', async () => {
    mockAll();
    renderIncome();

    await waitFor(() => {
      expect(incomeService.getIncomeByPeriod).toHaveBeenCalledWith('monthly');
    });
  });

  it('refetches when a different period tab is selected', async () => {
    const user = userEvent.setup();
    mockAll();
    renderIncome();

    await screen.findByText(/income by period/i);

    await user.click(screen.getByRole('tab', { name: /quarterly/i }));

    await waitFor(() => {
      expect(incomeService.getIncomeByPeriod).toHaveBeenCalledWith(
        'quarterly'
      );
    });
  });

  it('shows an error state when the initial fetch fails', async () => {
    incomeService.getIncomeSummary.mockRejectedValue({
      response: { data: { message: 'Server down' } },
    });
    incomeService.getTaxEstimation.mockResolvedValue({ data: tax });
    incomeService.getTransactionHistory.mockResolvedValue({ data: [] });
    incomeService.getIncomeByPeriod.mockResolvedValue({ data: [] });

    renderIncome();

    expect(await screen.findByText(/server down/i)).toBeInTheDocument();
  });
});