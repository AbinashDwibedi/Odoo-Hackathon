import { useEffect, useState } from 'react';
import api from '../lib/api';
import { MdAdd, MdDirectionsCar, MdSearch } from 'react-icons/md';
import './Fleet.css';

interface Vehicle {
  id: number;
  registrationNumber: string;
  nameModel: string;
  type: string;
  capacity: number;
  status: string;
  odometer: number;
}

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'success', ON_TRIP: 'info', IN_SHOP: 'warning', RETIRED: 'muted',
};

const VEHICLE_TYPES = ['', 'VAN', 'TRUCK', 'MINI', 'PICKUP', 'BIKE', 'BUS', 'OTHER'];
const STATUSES = ['', 'AVAILABLE', 'ON_TRIP', 'IN_SHOP', 'RETIRED'];

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    registrationNumber: '', nameModel: '', type: 'VAN',
    maxLoadCapacity: '', acquisitionCost: '', odometer: '0',
  });

  const fetchVehicles = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    if (typeFilter) params.type = typeFilter;
    if (search) params.search = search;
    api.get('/fleet/vehicles', { params })
      .then((res) => setVehicles(res.data.data.data))
      .catch(() => setError('Failed to load vehicles'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchVehicles(); }, [statusFilter, typeFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVehicles();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await api.post('/fleet/vehicles', {
        ...form,
        maxLoadCapacity: Number(form.maxLoadCapacity),
        acquisitionCost: Number(form.acquisitionCost),
        odometer: Number(form.odometer),
      });
      setShowModal(false);
      setForm({ registrationNumber: '', nameModel: '', type: 'VAN', maxLoadCapacity: '', acquisitionCost: '', odometer: '0' });
      fetchVehicles();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fleet-page">
      <div className="page-header">
        <div>
          <h1>Vehicles</h1>
          <p>Manage your fleet of vehicles</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <MdAdd size={18} /> Add Vehicle
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-wrap">
            <MdSearch size={18} className="search-icon" />
            <input
              id="vehicle-search"
              type="text"
              placeholder="Search registration or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-secondary">Search</button>
        </form>
        <select id="vehicle-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
        <select id="vehicle-type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t || 'All Types'}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="page-loading"><span className="spinner" style={{ borderColor: 'rgba(99,102,241,0.3)', borderTopColor: 'var(--primary)' }} /></div>
      ) : error ? (
        <div className="page-error">{error}</div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Registration</th>
                <th>Name / Model</th>
                <th>Type</th>
                <th>Capacity (kg)</th>
                <th>Odometer (km)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.length === 0 ? (
                <tr><td colSpan={6} className="empty-row"><MdDirectionsCar size={32} /><br />No vehicles found</td></tr>
              ) : vehicles.map((v) => (
                <tr key={v.id}>
                  <td><code className="reg-number">{v.registrationNumber}</code></td>
                  <td>{v.nameModel}</td>
                  <td><span className="badge badge-type">{v.type}</span></td>
                  <td>{v.capacity.toLocaleString()}</td>
                  <td>{v.odometer.toLocaleString()}</td>
                  <td><span className={`badge badge-${STATUS_COLORS[v.status] || 'muted'}`}>{v.status.replace('_', ' ')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Vehicle</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            {formError && <div className="auth-error">{formError}</div>}
            <form onSubmit={handleCreate} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Registration Number</label>
                  <input required placeholder="GJ01AB4521" value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Name / Model</label>
                  <input required placeholder="VAN-05" value={form.nameModel} onChange={(e) => setForm({ ...form, nameModel: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {['VAN','TRUCK','MINI','PICKUP','BIKE','BUS','OTHER'].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Max Load Capacity (kg)</label>
                  <input required type="number" min="0" placeholder="500" value={form.maxLoadCapacity} onChange={(e) => setForm({ ...form, maxLoadCapacity: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Acquisition Cost (₹)</label>
                  <input required type="number" min="0" placeholder="800000" value={form.acquisitionCost} onChange={(e) => setForm({ ...form, acquisitionCost: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Current Odometer (km)</label>
                  <input type="number" min="0" placeholder="0" value={form.odometer} onChange={(e) => setForm({ ...form, odometer: e.target.value })} />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : 'Create Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
