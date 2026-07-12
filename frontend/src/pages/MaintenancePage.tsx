import { useEffect, useState } from 'react';
import api from '../lib/api';
import { MdAdd, MdBuild, MdCheck } from 'react-icons/md';
import './Fleet.css';
import './Trips.css';

interface MaintenanceLog {
  id: number;
  serviceType: string;
  description?: string;
  cost: number;
  startDate: string;
  endDate?: string;
  status: string;
  mechanic?: string;
  vehicle: { id: number; registrationNumber: string; name: string; type: string };
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'info', IN_PROGRESS: 'warning', COMPLETED: 'success', CANCELLED: 'danger',
};
const STATUSES = ['', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export default function MaintenancePage() {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [vehicleIdFilter, setVehicleIdFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ vehicleId: '', serviceType: '', cost: '', date: '', description: '', mechanic: '' });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchLogs = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    if (vehicleIdFilter) params.vehicleId = vehicleIdFilter;
    api.get('/maintenance', { params })
      .then((res) => { setLogs(res.data.data.data); setCount(res.data.data.count); })
      .catch(() => setError('Failed to load maintenance logs'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLogs(); }, [statusFilter, vehicleIdFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      await api.post('/maintenance', {
        vehicleId: Number(createForm.vehicleId),
        serviceType: createForm.serviceType,
        cost: Number(createForm.cost),
        date: createForm.date,
        description: createForm.description || undefined,
        mechanic: createForm.mechanic || undefined,
      });
      setShowCreate(false);
      setCreateForm({ vehicleId: '', serviceType: '', cost: '', date: '', description: '', mechanic: '' });
      fetchLogs();
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Failed to log maintenance');
    } finally { setCreating(false); }
  };

  const handleComplete = async (log: MaintenanceLog) => {
    if (!confirm(`Mark maintenance for ${log.vehicle.registrationNumber} as completed?`)) return;
    setActionLoading(log.id);
    try { await api.patch(`/maintenance/${log.id}/complete`); fetchLogs(); }
    catch (err: any) { alert(err.response?.data?.message || 'Failed to complete'); }
    finally { setActionLoading(null); }
  };

  const inProgressCount = logs.filter(l => l.status === 'IN_PROGRESS').length;
  const scheduledCount = logs.filter(l => l.status === 'SCHEDULED').length;
  const completedCount = logs.filter(l => l.status === 'COMPLETED').length;
  const totalCost = logs.reduce((s, l) => s + l.cost, 0);

  return (
    <div className="fleet-page">
      <div className="page-header">
        <div><h1>Maintenance</h1><p>Track vehicle servicing and workshop time</p></div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}><MdAdd size={18} /> Log Service</button>
      </div>

      <div className="trip-summary-row">
        {[
          { label: 'In Progress', val: inProgressCount, color: 'var(--warning)' },
          { label: 'Scheduled', val: scheduledCount, color: 'var(--info)' },
          { label: 'Completed', val: completedCount, color: 'var(--success)' },
          { label: 'Total Cost', val: `₹${totalCost.toLocaleString('en-IN')}`, color: 'var(--primary-light)' },
        ].map(s => (
          <div key={s.label} className="trip-summary-card">
            <div className="trip-summary-val" style={{ color: s.color, fontSize: typeof s.val === 'string' ? 22 : 32 }}>{s.val}</div>
            <div className="trip-summary-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="filters-bar">
        <input
          type="number" placeholder="Filter by Vehicle ID"
          value={vehicleIdFilter} onChange={(e) => setVehicleIdFilter(e.target.value)}
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', padding: '9px 12px', fontFamily: 'var(--font-sans)', fontSize: 13, outline: 'none', width: 160 }}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="page-loading"><span className="spinner" style={{ borderColor: 'rgba(99,102,241,0.3)', borderTopColor: 'var(--primary)' }} /></div>
      ) : error ? (
        <div className="page-error">{error}</div>
      ) : logs.length === 0 ? (
        <div className="empty-state"><MdBuild size={48} /><div>No maintenance records found</div></div>
      ) : (
        <div className="maint-cards">
          {logs.map((log) => (
            <div key={log.id} className={`maint-card maint-card--${log.status.toLowerCase()}`}>
              <div className="maint-card-header">
                <div className="maint-service-type">{log.serviceType}</div>
                <span className={`badge badge-${STATUS_COLORS[log.status]}`}>{log.status.replace('_', ' ')}</span>
              </div>
              <div className="maint-card-meta">
                <div className="maint-meta-item"><span className="maint-meta-label">Vehicle</span><span>{log.vehicle.registrationNumber}</span></div>
                <div className="maint-meta-item"><span className="maint-meta-label">Type</span><span>{log.vehicle.type}</span></div>
                <div className="maint-meta-item"><span className="maint-meta-label">Cost</span><span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>₹{log.cost.toLocaleString('en-IN')}</span></div>
                <div className="maint-meta-item"><span className="maint-meta-label">Started</span><span>{new Date(log.startDate).toLocaleDateString('en-IN')}</span></div>
                {log.endDate && <div className="maint-meta-item"><span className="maint-meta-label">Completed</span><span>{new Date(log.endDate).toLocaleDateString('en-IN')}</span></div>}
                {log.mechanic && <div className="maint-meta-item"><span className="maint-meta-label">Mechanic</span><span>{log.mechanic}</span></div>}
                {log.description && <div className="maint-meta-item" style={{ gridColumn: '1 / -1' }}><span className="maint-meta-label">Notes</span><span>{log.description}</span></div>}
              </div>
              {(log.status === 'IN_PROGRESS' || log.status === 'SCHEDULED') && (
                <div className="maint-card-actions">
                  <button
                    className="btn-primary"
                    style={{ fontSize: 12, padding: '6px 14px', minHeight: 32, background: 'linear-gradient(135deg,var(--success),#059669)' }}
                    onClick={() => handleComplete(log)}
                    disabled={actionLoading === log.id}
                  >
                    {actionLoading === log.id ? <span className="spinner" /> : <><MdCheck size={14} /> Mark Complete</>}
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
            <div className="modal-header"><h3>Log Maintenance</h3><button className="modal-close" onClick={() => setShowCreate(false)}>×</button></div>
            {createError && <div className="auth-error">{createError}</div>}
            <form onSubmit={handleCreate} className="modal-form">
              <div className="form-row">
                <div className="form-group"><label>Vehicle ID</label><input required type="number" placeholder="1" value={createForm.vehicleId} onChange={(e) => setCreateForm({ ...createForm, vehicleId: e.target.value })} /></div>
                <div className="form-group"><label>Service Type</label><input required placeholder="Oil Change" value={createForm.serviceType} onChange={(e) => setCreateForm({ ...createForm, serviceType: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Cost (₹)</label><input required type="number" min="0" placeholder="5000" value={createForm.cost} onChange={(e) => setCreateForm({ ...createForm, cost: e.target.value })} /></div>
                <div className="form-group"><label>Date</label><input required type="date" value={createForm.date} onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Mechanic (optional)</label><input placeholder="Ramesh Kumar" value={createForm.mechanic} onChange={(e) => setCreateForm({ ...createForm, mechanic: e.target.value })} /></div>
                <div className="form-group"><label>Notes (optional)</label><input placeholder="Brake pads replaced" value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} /></div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={creating}>{creating ? <span className="spinner" /> : 'Log Service'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
