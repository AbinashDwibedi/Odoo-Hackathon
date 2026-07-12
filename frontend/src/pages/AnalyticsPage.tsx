import { useEffect, useState } from 'react';
import api from '../lib/api';
import { MdBarChart, MdRefresh } from 'react-icons/md';
import './Dashboard.css';

interface DashboardData {
  kpis: {
    totalVehicles: number;
    activeVehicles: number;
    availableVehicles: number;
    vehiclesInMaintenance: number;
    activeTrips: number;
    fleetUtilizationPercent: number;
  };
  financials: {
    totalOperationalCost: number;
    averageFuelEfficiency: number;
  };
}

function GaugeBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 1s ease' }} />
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/analytics/dashboard')
      .then((res) => setData(res.data.data))
      .catch(() => setError('Failed to load analytics'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="page-loading"><span className="spinner" style={{ borderColor: 'rgba(99,102,241,0.3)', borderTopColor: 'var(--primary)' }} /></div>;
  if (error) return <div className="page-error">{error}</div>;
  if (!data) return null;

  const { kpis, financials } = data;
  const retiredVehicles = kpis.totalVehicles - kpis.availableVehicles - kpis.activeVehicles - kpis.vehiclesInMaintenance;

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1>Analytics</h1>
          <p>In-depth fleet performance metrics</p>
        </div>
        <button className="btn-secondary" onClick={load}>
          <MdRefresh size={18} /> Refresh
        </button>
      </div>

      {/* Utilization */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="metric-card">
          <div className="metric-header"><MdBarChart size={20} style={{ color: 'var(--primary-light)' }} /><span>Fleet Utilization</span></div>
          <div className="metric-big">{kpis.fleetUtilizationPercent}%</div>
          <GaugeBar value={kpis.fleetUtilizationPercent} color="linear-gradient(90deg, var(--primary-dark), var(--primary-light))" />
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Total Vehicles', val: kpis.totalVehicles, pct: 100, color: 'var(--text-muted)' },
              { label: 'On Trip (Active)', val: kpis.activeVehicles, pct: kpis.totalVehicles ? (kpis.activeVehicles / kpis.totalVehicles) * 100 : 0, color: 'var(--info)' },
              { label: 'Available', val: kpis.availableVehicles, pct: kpis.totalVehicles ? (kpis.availableVehicles / kpis.totalVehicles) * 100 : 0, color: 'var(--success)' },
              { label: 'In Maintenance', val: kpis.vehiclesInMaintenance, pct: kpis.totalVehicles ? (kpis.vehiclesInMaintenance / kpis.totalVehicles) * 100 : 0, color: 'var(--warning)' },
              { label: 'Retired', val: retiredVehicles, pct: kpis.totalVehicles ? (retiredVehicles / kpis.totalVehicles) * 100 : 0, color: 'var(--text-muted)' },
            ].map((row) => (
              <div key={row.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{row.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{row.val}</span>
                </div>
                <GaugeBar value={row.pct} color={row.color} />
              </div>
            ))}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header"><MdBarChart size={20} style={{ color: 'var(--success)' }} /><span>Financials</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <div className="fin-label">Total Operational Cost</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                ₹{financials.totalOperationalCost.toLocaleString('en-IN')}
              </div>
            </div>
            <div>
              <div className="fin-label">Average Fuel Efficiency</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: financials.averageFuelEfficiency > 0 ? 'var(--success)' : 'var(--text-muted)', marginTop: 4 }}>
                {financials.averageFuelEfficiency > 0 ? `${financials.averageFuelEfficiency} km/L` : 'No data yet'}
              </div>
            </div>
            <div>
              <div className="fin-label">Active Trips</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--info)', marginTop: 4 }}>{kpis.activeTrips}</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI summary table */}
      <div className="metric-card">
        <div className="metric-header" style={{ marginBottom: 16 }}><MdBarChart size={20} /><span>Full KPI Table</span></div>
        <table className="data-table" style={{ fontSize: 14 }}>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            {[
              { metric: 'Total Vehicles', value: kpis.totalVehicles, cat: 'Fleet' },
              { metric: 'Active Vehicles (On Trip)', value: kpis.activeVehicles, cat: 'Fleet' },
              { metric: 'Available Vehicles', value: kpis.availableVehicles, cat: 'Fleet' },
              { metric: 'Vehicles in Maintenance', value: kpis.vehiclesInMaintenance, cat: 'Fleet' },
              { metric: 'Retired Vehicles', value: retiredVehicles, cat: 'Fleet' },
              { metric: 'Active Trips', value: kpis.activeTrips, cat: 'Operations' },
              { metric: 'Fleet Utilization (%)', value: `${kpis.fleetUtilizationPercent}%`, cat: 'Performance' },
              { metric: 'Total Operational Cost (₹)', value: `₹${financials.totalOperationalCost.toLocaleString('en-IN')}`, cat: 'Finance' },
              { metric: 'Avg. Fuel Efficiency (km/L)', value: financials.averageFuelEfficiency > 0 ? `${financials.averageFuelEfficiency}` : '—', cat: 'Finance' },
            ].map((row) => (
              <tr key={row.metric}>
                <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{row.metric}</td>
                <td style={{ fontWeight: 700, color: 'var(--primary-light)' }}>{row.value}</td>
                <td><span className="badge badge-type">{row.cat}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
