import { useEffect, useState } from 'react';
import api from '../lib/api';
import { MdAdd, MdAttachMoney, MdSearch } from 'react-icons/md';
import './Fleet.css';
import './Dashboard.css';

interface Expense {
  id: number;
  type: string;
  amount: number;
  date: string;
  description?: string;
  liters?: number;
  vehicle: { id: number; registrationNumber: string; name: string };
  trip?: { id: number; tripId: string; source: string; destination: string } | null;
}

const TYPE_COLORS: Record<string, string> = { FUEL: 'info', TOLL: 'warning', OTHER: 'muted' };
const TYPES = ['', 'FUEL', 'TOLL', 'OTHER'];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    vehicleId: '', type: 'FUEL', amount: '', date: '', description: '', liters: '',
  });

  const fetchExpenses = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (typeFilter) params.type = typeFilter;
    if (vehicleId) params.vehicleId = vehicleId;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    api.get('/finances/expenses', { params })
      .then((res) => {
        setExpenses(res.data.data.data);
        setCount(res.data.data.count);
        setTotalAmount(res.data.data.totalAmount);
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          setError('Access restricted to Financial Analysts.');
        } else {
          setError('Failed to load expenses');
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchExpenses(); }, [typeFilter]);

  const handleFilter = (e: React.FormEvent) => { e.preventDefault(); fetchExpenses(); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await api.post('/finances/expenses', {
        vehicleId: Number(form.vehicleId),
        type: form.type,
        amount: Number(form.amount),
        date: form.date,
        description: form.description || undefined,
        liters: form.liters ? Number(form.liters) : undefined,
      });
      setShowModal(false);
      setForm({ vehicleId: '', type: 'FUEL', amount: '', date: '', description: '', liters: '' });
      fetchExpenses();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to log expense');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fleet-page">
      <div className="page-header">
        <div>
          <h1>Expenses</h1>
          <p>Track and manage operational expenses</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <MdAdd size={18} /> Log Expense
        </button>
      </div>

      {/* Summary cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--primary-light)' }}><MdAttachMoney size={22} /></div>
          <div className="stat-info"><div className="stat-label">Total Amount</div><div className="stat-value">₹{totalAmount.toLocaleString('en-IN')}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--success)' }}><MdAttachMoney size={22} /></div>
          <div className="stat-info"><div className="stat-label">Records</div><div className="stat-value">{count}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--warning)' }}><MdSearch size={22} /></div>
          <div className="stat-info"><div className="stat-label">Avg per Record</div><div className="stat-value">₹{count > 0 ? (totalAmount / count).toFixed(0) : 0}</div></div>
        </div>
      </div>

      {/* Filters */}
      <form onSubmit={handleFilter} className="filters-bar">
        <input
          type="number" placeholder="Vehicle ID"
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', padding: '9px 12px', fontFamily: 'var(--font-sans)', fontSize: 13, outline: 'none', width: 120 }}
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          {TYPES.map((t) => <option key={t} value={t}>{t || 'All Types'}</option>)}
        </select>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', padding: '9px 12px', fontFamily: 'var(--font-sans)', fontSize: 13, outline: 'none' }} />
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>to</span>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', padding: '9px 12px', fontFamily: 'var(--font-sans)', fontSize: 13, outline: 'none' }} />
        <button type="submit" className="btn-secondary">Apply</button>
      </form>

      {loading ? (
        <div className="page-loading"><span className="spinner" style={{ borderColor: 'rgba(99,102,241,0.3)', borderTopColor: 'var(--primary)' }} /></div>
      ) : error ? (
        <div className="page-error">{error}</div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Vehicle</th>
                <th>Amount (₹)</th>
                <th>Liters</th>
                <th>Description</th>
                <th>Trip</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr><td colSpan={7} className="empty-row"><MdAttachMoney size={32} /><br />No expenses found</td></tr>
              ) : expenses.map((e) => (
                <tr key={e.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(e.date).toLocaleDateString('en-IN')}</td>
                  <td><span className={`badge badge-${TYPE_COLORS[e.type] || 'muted'}`}>{e.type}</span></td>
                  <td><code className="reg-number">{e.vehicle.registrationNumber}</code></td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{e.amount.toLocaleString('en-IN')}</td>
                  <td>{e.liters ?? '—'}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.description || '—'}</td>
                  <td>{e.trip ? `${e.trip.source} → ${e.trip.destination}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(ev) => ev.stopPropagation()}>
            <div className="modal-header">
              <h3>Log Expense</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            {formError && <div className="auth-error">{formError}</div>}
            <form onSubmit={handleCreate} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Vehicle ID</label>
                  <input required type="number" placeholder="1" value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {['FUEL', 'TOLL', 'OTHER'].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Amount (₹)</label>
                  <input required type="number" min="0" step="0.01" placeholder="4500" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>
              {form.type === 'FUEL' && (
                <div className="form-group">
                  <label>Liters (optional)</label>
                  <input type="number" min="0" step="0.01" placeholder="50" value={form.liters} onChange={(e) => setForm({ ...form, liters: e.target.value })} />
                </div>
              )}
              <div className="form-group">
                <label>Description (optional)</label>
                <input placeholder="Refuel at highway pump" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : 'Log Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
