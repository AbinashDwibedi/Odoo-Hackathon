import { useEffect, useState } from 'react';
import api from '../lib/api';
import { MdAdd, MdLocalShipping, MdCheck, MdCancel, MdSend } from 'react-icons/md';
import './Fleet.css';
import './Trips.css';

interface Trip {
  id: number;
  tripId: string;
  source: string;
  destination: string;
  cargoWeight: number;
  plannedDistance: number;
  actualDistance?: number;
  status: string;
  createdAt: string;
  vehicle: { id: number; registrationNumber: string; name: string; type: string };
  driver: { id: number; name: string; contactNumber: string };
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'muted', DISPATCHED: 'info', COMPLETED: 'success', CANCELLED: 'danger',
};
const STATUSES = ['', 'DRAFT', 'DISPATCHED', 'COMPLETED', 'CANCELLED'];

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ source: '', destination: '', vehicleId: '', driverId: '', cargoWeight: '', plannedDistance: '' });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [showComplete, setShowComplete] = useState<Trip | null>(null);
  const [completeForm, setCompleteForm] = useState({ finalOdometer: '', tollExpense: '', fuelLiters: '', fuelCost: '' });
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchTrips = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    if (dateRange) params.dateRange = dateRange;
    api.get('/trips', { params })
      .then((res) => { setTrips(res.data.data.data); setCount(res.data.data.count); })
      .catch(() => setError('Failed to load trips'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTrips(); }, [statusFilter, dateRange]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      await api.post('/trips', {
        source: createForm.source, destination: createForm.destination,
        vehicleId: Number(createForm.vehicleId), driverId: Number(createForm.driverId),
        cargoWeight: Number(createForm.cargoWeight), plannedDistance: Number(createForm.plannedDistance),
      });
      setShowCreate(false);
      setCreateForm({ source: '', destination: '', vehicleId: '', driverId: '', cargoWeight: '', plannedDistance: '' });
      fetchTrips();
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Failed to create trip');
    } finally { setCreating(false); }
  };

  const handleDispatch = async (trip: Trip) => {
    setActionLoading(trip.id);
    try { await api.patch(`/trips/${trip.id}/dispatch`); fetchTrips(); }
    catch (err: any) { alert(err.response?.data?.message || 'Failed to dispatch'); }
    finally { setActionLoading(null); }
  };

  const handleCancel = async (trip: Trip) => {
    if (!confirm(`Cancel trip ${trip.tripId.slice(0, 8)}?`)) return;
    setActionLoading(trip.id);
    try { await api.patch(`/trips/${trip.id}/cancel`); fetchTrips(); }
    catch (err: any) { alert(err.response?.data?.message || 'Failed to cancel'); }
    finally { setActionLoading(null); }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showComplete) return;
    setCompleteError('');
    setCompleting(true);
    try {
      const payload: any = { finalOdometer: Number(completeForm.finalOdometer) };
      if (completeForm.tollExpense) payload.tollExpense = Number(completeForm.tollExpense);
      if (completeForm.fuelCost) payload.fuelExpense = { cost: Number(completeForm.fuelCost), liters: completeForm.fuelLiters ? Number(completeForm.fuelLiters) : undefined };
      await api.patch(`/trips/${showComplete.id}/complete`, payload);
      setShowComplete(null);
      setCompleteForm({ finalOdometer: '', tollExpense: '', fuelLiters: '', fuelCost: '' });
      fetchTrips();
    } catch (err: any) {
      setCompleteError(err.response?.data?.message || 'Failed to complete trip');
    } finally { setCompleting(false); }
  };

  return (
    <div className="fleet-page">
      <div className="page-header">
        <div><h1>Trips</h1><p>Manage and track all fleet trips</p></div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}><MdAdd size={18} /> New Trip</button>
      </div>

      <div className="trip-summary-row">
        {[
          { label: 'Draft', val: trips.filter(t => t.status === 'DRAFT').length, color: 'var(--text-muted)' },
          { label: 'Dispatched', val: trips.filter(t => t.status === 'DISPATCHED').length, color: 'var(--info)' },
          { label: 'Completed', val: trips.filter(t => t.status === 'COMPLETED').length, color: 'var(--success)' },
          { label: 'Total', val: count, color: 'var(--primary-light)' },
        ].map(s => (
          <div key={s.label} className="trip-summary-card">
            <div className="trip-summary-val" style={{ color: s.color }}>{s.val}</div>
            <div className="trip-summary-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="filters-bar">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
        <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
          <option value="">All Time</option>
          <option value="today">Today</option>
        </select>
      </div>

      {loading ? (
        <div className="page-loading"><span className="spinner" style={{ borderColor: 'rgba(99,102,241,0.3)', borderTopColor: 'var(--primary)' }} /></div>
      ) : error ? (
        <div className="page-error">{error}</div>
      ) : trips.length === 0 ? (
        <div className="empty-state"><MdLocalShipping size={48} /><div>No trips found</div></div>
      ) : (
        <div className="trip-cards">
          {trips.map((trip) => (
            <div key={trip.id} className={`trip-card trip-card--${trip.status.toLowerCase()}`}>
              <div className="trip-card-header">
                <div className="trip-route">
                  <span className="trip-city">{trip.source}</span>
                  <span className="trip-arrow">→</span>
                  <span className="trip-city">{trip.destination}</span>
                </div>
                <span className={`badge badge-${STATUS_COLORS[trip.status]}`}>{trip.status}</span>
              </div>
              <div className="trip-card-meta">
                <div className="trip-meta-item"><span className="trip-meta-label">Trip ID</span><code className="reg-number" style={{ fontSize: 11 }}>{trip.tripId.slice(0, 8)}…</code></div>
                <div className="trip-meta-item"><span className="trip-meta-label">Vehicle</span><span>{trip.vehicle.registrationNumber}</span></div>
                <div className="trip-meta-item"><span className="trip-meta-label">Driver</span><span>{trip.driver.name}</span></div>
                <div className="trip-meta-item"><span className="trip-meta-label">Cargo</span><span>{trip.cargoWeight} kg</span></div>
                <div className="trip-meta-item"><span className="trip-meta-label">Planned</span><span>{trip.plannedDistance} km</span></div>
                {trip.actualDistance != null && <div className="trip-meta-item"><span className="trip-meta-label">Actual</span><span style={{ color: 'var(--success)' }}>{trip.actualDistance} km</span></div>}
                <div className="trip-meta-item"><span className="trip-meta-label">Date</span><span>{new Date(trip.createdAt).toLocaleDateString('en-IN')}</span></div>
              </div>
              {(trip.status === 'DRAFT' || trip.status === 'DISPATCHED') && (
                <div className="trip-card-actions">
                  {trip.status === 'DRAFT' && (
                    <button className="btn-primary" style={{ fontSize: 12, padding: '6px 12px', minHeight: 32 }} onClick={() => handleDispatch(trip)} disabled={actionLoading === trip.id}>
                      {actionLoading === trip.id ? <span className="spinner" /> : <><MdSend size={14} /> Dispatch</>}
                    </button>
                  )}
                  {trip.status === 'DISPATCHED' && (
                    <button className="btn-primary" style={{ fontSize: 12, padding: '6px 12px', minHeight: 32, background: 'linear-gradient(135deg,var(--success),#059669)' }} onClick={() => setShowComplete(trip)}>
                      <MdCheck size={14} /> Complete
                    </button>
                  )}
                  <button className="btn-danger" onClick={() => handleCancel(trip)} disabled={actionLoading === trip.id}>
                    <MdCancel size={14} /> Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Create New Trip</h3><button className="modal-close" onClick={() => setShowCreate(false)}>×</button></div>
            {createError && <div className="auth-error">{createError}</div>}
            <form onSubmit={handleCreate} className="modal-form">
              <div className="form-row">
                <div className="form-group"><label>Source</label><input required placeholder="Ahmedabad" value={createForm.source} onChange={(e) => setCreateForm({ ...createForm, source: e.target.value })} /></div>
                <div className="form-group"><label>Destination</label><input required placeholder="Mumbai" value={createForm.destination} onChange={(e) => setCreateForm({ ...createForm, destination: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Vehicle ID</label><input required type="number" placeholder="1" value={createForm.vehicleId} onChange={(e) => setCreateForm({ ...createForm, vehicleId: e.target.value })} /></div>
                <div className="form-group"><label>Driver ID</label><input required type="number" placeholder="1" value={createForm.driverId} onChange={(e) => setCreateForm({ ...createForm, driverId: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Cargo Weight (kg)</label><input required type="number" min="0" placeholder="350" value={createForm.cargoWeight} onChange={(e) => setCreateForm({ ...createForm, cargoWeight: e.target.value })} /></div>
                <div className="form-group"><label>Planned Distance (km)</label><input required type="number" min="0" placeholder="540" value={createForm.plannedDistance} onChange={(e) => setCreateForm({ ...createForm, plannedDistance: e.target.value })} /></div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={creating}>{creating ? <span className="spinner" /> : 'Create Trip'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showComplete && (
        <div className="modal-overlay" onClick={() => setShowComplete(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Complete Trip</h3><button className="modal-close" onClick={() => setShowComplete(null)}>×</button></div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              {showComplete.source} → {showComplete.destination} &nbsp;|&nbsp; {showComplete.vehicle.registrationNumber} &nbsp;|&nbsp; {showComplete.driver.name}
            </div>
            {completeError && <div className="auth-error">{completeError}</div>}
            <form onSubmit={handleComplete} className="modal-form">
              <div className="form-group"><label>Final Odometer Reading (km) *</label><input required type="number" min="0" placeholder="15400" value={completeForm.finalOdometer} onChange={(e) => setCompleteForm({ ...completeForm, finalOdometer: e.target.value })} /></div>
              <div className="form-row">
                <div className="form-group"><label>Fuel Cost (₹)</label><input type="number" min="0" placeholder="3200" value={completeForm.fuelCost} onChange={(e) => setCompleteForm({ ...completeForm, fuelCost: e.target.value })} /></div>
                <div className="form-group"><label>Fuel Liters</label><input type="number" min="0" placeholder="45" value={completeForm.fuelLiters} onChange={(e) => setCompleteForm({ ...completeForm, fuelLiters: e.target.value })} /></div>
              </div>
              <div className="form-group"><label>Toll Expense (₹)</label><input type="number" min="0" placeholder="250" value={completeForm.tollExpense} onChange={(e) => setCompleteForm({ ...completeForm, tollExpense: e.target.value })} /></div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowComplete(null)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={completing} style={{ background: 'linear-gradient(135deg,var(--success),#059669)' }}>{completing ? <span className="spinner" /> : 'Mark Completed'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
