import { useEffect, useState } from 'react';
import api from '../lib/api';
import { MdAdd, MdPeople, MdSearch } from 'react-icons/md';
import './Fleet.css';

interface Driver {
  id: number;
  name: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiry: string;
  contactNumber: string;
  status: string;
  safetyScore: number;
  tripCompletionRate: number;
}

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'success', ON_TRIP: 'info', OFF_DUTY: 'warning', SUSPENDED: 'danger',
};

const STATUSES = ['', 'AVAILABLE', 'ON_TRIP', 'OFF_DUTY', 'SUSPENDED'];
const CATEGORIES = ['', 'LMV', 'HMV', 'MOTORCYCLE'];

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    name: '', licenseNumber: '', licenseCategory: 'LMV',
    licenseExpiry: '', contactNumber: '',
  });

  const fetchDrivers = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    if (categoryFilter) params.category = categoryFilter;
    api.get('/fleet/drivers', { params })
      .then((res) => setDrivers(res.data.data.data))
      .catch(() => setError('Failed to load drivers'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDrivers(); }, [statusFilter, categoryFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await api.post('/fleet/drivers', form);
      setShowModal(false);
      setForm({ name: '', licenseNumber: '', licenseCategory: 'LMV', licenseExpiry: '', contactNumber: '' });
      fetchDrivers();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create driver');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fleet-page">
      <div className="page-header">
        <div>
          <h1>Drivers</h1>
          <p>Manage driver profiles and assignments</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <MdAdd size={18} /> Add Driver
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <select id="driver-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
        <select id="driver-category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c || 'All Categories'}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="page-loading"><span className="spinner" style={{ borderColor: 'rgba(99,102,241,0.3)', borderTopColor: 'var(--primary)' }} /></div>
      ) : error ? (
        <div className="page-error">{error}</div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>License No.</th>
                <th>Category</th>
                <th>Expiry</th>
                <th>Contact</th>
                <th>Safety Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {drivers.length === 0 ? (
                <tr><td colSpan={7} className="empty-row"><MdPeople size={32} /><br />No drivers found</td></tr>
              ) : drivers.map((d) => (
                <tr key={d.id}>
                  <td><span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{d.name}</span></td>
                  <td><code className="reg-number">{d.licenseNumber}</code></td>
                  <td><span className="badge badge-type">{d.licenseCategory}</span></td>
                  <td>{new Date(d.licenseExpiry).toLocaleDateString('en-IN')}</td>
                  <td>{d.contactNumber}</td>
                  <td>
                    <div className="score-wrap">
                      <div className="score-bar"><div className="score-fill" style={{ width: `${d.safetyScore}%`, background: d.safetyScore >= 80 ? 'var(--success)' : d.safetyScore >= 50 ? 'var(--warning)' : 'var(--danger)' }} /></div>
                      <span style={{ fontSize: 12 }}>{d.safetyScore}</span>
                    </div>
                  </td>
                  <td><span className={`badge badge-${STATUS_COLORS[d.status] || 'muted'}`}>{d.status.replace('_', ' ')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Driver</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            {formError && <div className="auth-error">{formError}</div>}
            <form onSubmit={handleCreate} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input required placeholder="Rajan Mehta" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>License Number</label>
                  <input required placeholder="GJ0120230012345" value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>License Category</label>
                  <select value={form.licenseCategory} onChange={(e) => setForm({ ...form, licenseCategory: e.target.value })}>
                    {['LMV', 'HMV', 'MOTORCYCLE'].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>License Expiry</label>
                  <input required type="date" value={form.licenseExpiry} onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Contact Number</label>
                <input required placeholder="9876543210" value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : 'Create Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
