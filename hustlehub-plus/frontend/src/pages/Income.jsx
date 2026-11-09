import { useState, useEffect } from 'react';
import {
  getIncomeSummary,
  getTransactionHistory,
  getIncomeByPeriod,
  getTaxEstimation,
} from '../services/incomeService';
import './Income.css';

const PERIODS = ['monthly', 'quarterly', 'yearly'];

function formatZar(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'R0';
  return `R${n.toLocaleString('en-ZA', { maximumFractionDigits: 2 })}`;
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function Income() {
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [tax, setTax] = useState(null);

  const [period, setPeriod] = useState('monthly');
  const [periodData, setPeriodData] = useState([]);

  const [loading, setLoading] = useState(true);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [error, setError] = useState('');
  const [periodError, setPeriodError] = useState('');

  // Load everything except the period breakdown on mount.
  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      try {
        const [summaryRes, txRes, taxRes] = await Promise.all([
          getIncomeSummary(),
          getTransactionHistory(),
          getTaxEstimation(),
        ]);
        if (cancelled) return;
        setSummary(summaryRes.data);
        setTransactions(txRes.data || []);
        setTax(taxRes.data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              'Unable to load your income right now.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadAll();
    return () => {
      cancelled = true;
    };
  }, []);

  // Period breakdown reloads whenever the tab changes.
  useEffect(() => {
    let cancelled = false;
    async function loadPeriod() {
      setPeriodLoading(true);
      setPeriodError('');
      try {
        const res = await getIncomeByPeriod(period);
        if (!cancelled) setPeriodData(res.data || []);
      } catch (err) {
        if (!cancelled) {
          setPeriodError(
            err.response?.data?.message ||
              'Unable to load the period breakdown.'
          );
        }
      } finally {
        if (!cancelled) setPeriodLoading(false);
      }
    }
    loadPeriod();
    return () => {
      cancelled = true;
    };
  }, [period]);

  if (loading) {
    return <p className="income-loading">Loading your income…</p>;
  }

  if (error) {
    return (
      <div className="income-page">
        <p className="error-text">{error}</p>
      </div>
    );
  }

  return (
    <div className="income-page">
      <header className="income-header">
        <h1>Income</h1>
        <p className="income-subtext">
          A summary of everything you’ve earned through HustleHub+.
        </p>
      </header>

      {/* Summary cards */}
      {summary && (
        <section className="income-summary-grid">
          <div className="income-card highlight">
            <span className="income-card-label">Total income</span>
            <span className="income-card-value">
              {formatZar(summary.totalIncome)}
            </span>
          </div>
          <div className="income-card">
            <span className="income-card-label">Completed</span>
            <span className="income-card-value">
              {summary.completedTransactions}
            </span>
          </div>
          <div className="income-card">
            <span className="income-card-label">Pending</span>
            <span className="income-card-value">
              {summary.pendingTransactions}
            </span>
          </div>
          <div className="income-card">
            <span className="income-card-label">Average per transaction</span>
            <span className="income-card-value">
              {formatZar(summary.averageTransactionAmount)}
            </span>
          </div>
        </section>
      )}

      {/* Tax estimation */}
      {tax && (
        <section className="income-tax">
          <div className="income-tax-header">
            <h2>Estimated tax ({tax.year})</h2>
            <span className="income-tax-rate">{tax.taxRate}%</span>
          </div>

          <div className="income-tax-figures">
            <div>
              <span className="income-card-label">Total income</span>
              <span className="income-card-value">
                {formatZar(tax.totalIncome)}
              </span>
            </div>
            <div>
              <span className="income-card-label">Estimated tax</span>
              <span className="income-card-value warning">
                {formatZar(tax.estimatedTax)}
              </span>
            </div>
            <div>
              <span className="income-card-label">Net income</span>
              <span className="income-card-value success">
                {formatZar(tax.netIncome)}
              </span>
            </div>
          </div>

          {tax.taxBrackets?.length > 0 && (
            <table className="income-tax-table">
              <thead>
                <tr>
                  <th>Bracket ({tax.currency})</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {tax.taxBrackets.map((b) => (
                  <tr key={b.bracket}>
                    <td>{b.bracket}</td>
                    <td>{b.rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tax.disclaimer && (
            <p className="income-tax-disclaimer">{tax.disclaimer}</p>
          )}
        </section>
      )}

      {/* Period breakdown */}
      <section className="income-period">
        <div className="income-period-header">
          <h2>Income by period</h2>
          <div className="income-tabs" role="tablist">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={period === p}
                className={`income-tab ${period === p ? 'active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {periodLoading && (
          <p className="income-period-loading">Loading {period}…</p>
        )}
        {periodError && <p className="error-text">{periodError}</p>}

        {!periodLoading && !periodError && periodData.length === 0 && (
          <p className="empty-state">No income recorded yet.</p>
        )}

        {!periodLoading && !periodError && periodData.length > 0 && (
          <table className="income-period-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Transactions</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {periodData.map((row) => (
                <tr key={row.period}>
                  <td className="mono">{row.period}</td>
                  <td>{row.transactionCount}</td>
                  <td className="mono accent">
                    {formatZar(row.totalAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Transaction history */}
      <section className="income-transactions">
        <h2>Transaction history</h2>

        {transactions.length === 0 ? (
          <p className="empty-state">No transactions yet.</p>
        ) : (
          <ul className="income-transactions-list">
            {transactions.map((tx) => (
              <li key={tx._id} className="income-transaction-row">
                <div className="income-transaction-main">
                  <span className="income-transaction-client">
                    {tx.bookingDetails?.clientName || 'Client'}
                  </span>
                  <span className="income-transaction-date">
                    {formatDate(tx.transactionDate)}
                  </span>
                  {tx.bookingDetails?.message && (
                    <span className="income-transaction-message">
                      “{tx.bookingDetails.message}”
                    </span>
                  )}
                </div>
                <div className="income-transaction-right">
                  <span className="income-transaction-amount">
                    {formatZar(tx.amount)}
                  </span>
                  <span className={`income-transaction-status status-${tx.status}`}>
                    {tx.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default Income;