import { useEffect, useState } from 'react';
import api from '../lib/api';
import { MdDirectionsCar, MdPeople, MdTrendingUp, MdBuild, MdLocalShipping, MdBarChart } from 'react-icons/md';
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

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon-wrap" style={{ background: `rgba(${color}, 0.12)`, color: `rgb(${color})` }}>
        {icon}
      </div>
      <div className="stat-info">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/analytics/dashboard')
      .then((res) => setData(res.data.data))
      .catch(() => setError('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading"><span className="spinner" style={{ borderColor: 'rgba(99,102,241,0.3)', borderTopColor: 'var(--primary)' }} /></div>;
  if (error) return <div className="page-error">{error}</div>;
  if (!data) return null;

  const { kpis, financials } = data;

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Real-time fleet overview and KPIs</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon={<MdDirectionsCar size={22} />} label="Total Vehicles" value={kpis.totalVehicles} sub="In fleet registry" color="99,102,241" />
        <StatCard icon={<MdLocalShipping size={22} />} label="Active Trips" value={kpis.activeTrips} sub="Currently dispatched" color="59,130,246" />
        <StatCard icon={<MdDirectionsCar size={22} />} label="Available" value={kpis.availableVehicles} sub="Ready to dispatch" color="16,185,129" />
        <StatCard icon={<MdBuild size={22} />} label="In Maintenance" value={kpis.vehiclesInMaintenance} sub="Under repair" color="245,158,11" />
      </div>

      <div className="metrics-row">
        {/* Fleet Utilization */}
        <div className="metric-card">
          <div className="metric-header">
            <MdTrendingUp size={20} style={{ color: 'var(--primary-light)' }} />
            <span>Fleet Utilization</span>
          </div>
          <div className="metric-big">{kpis.fleetUtilizationPercent}%</div>
          <div className="utilization-bar">
            <div className="utilization-fill" style={{ width: `${kpis.fleetUtilizationPercent}%` }} />
          </div>
          <div className="metric-sub">{kpis.activeVehicles} of {kpis.totalVehicles} vehicles on trip</div>
        </div>

        {/* Financial Summary */}
        <div className="metric-card">
          <div className="metric-header">
            <MdBarChart size={20} style={{ color: 'var(--success)' }} />
            <span>Financial Summary</span>
          </div>
          <div className="financial-row">
            <div>
              <div className="fin-label">Total Op. Cost</div>
              <div className="fin-value">₹{financials.totalOperationalCost.toLocaleString('en-IN')}</div>
            </div>
            <div>
              <div className="fin-label">Fuel Efficiency</div>
              <div className="fin-value">{financials.averageFuelEfficiency > 0 ? `${financials.averageFuelEfficiency} km/L` : '—'}</div>
            </div>
          </div>
        </div>

        {/* Vehicle Status Breakdown */}
        <div className="metric-card">
          <div className="metric-header">
            <MdPeople size={20} style={{ color: 'var(--warning)' }} />
            <span>Vehicle Breakdown</span>
          </div>
          <div className="breakdown-list">
            {[
              { label: 'Available', val: kpis.availableVehicles, color: 'var(--success)' },
              { label: 'On Trip', val: kpis.activeVehicles, color: 'var(--info)' },
              { label: 'In Maintenance', val: kpis.vehiclesInMaintenance, color: 'var(--warning)' },
              { label: 'Retired', val: kpis.totalVehicles - kpis.availableVehicles - kpis.activeVehicles - kpis.vehiclesInMaintenance, color: 'var(--text-muted)' },
            ].map((item) => (
              <div key={item.label} className="breakdown-row">
                <span className="breakdown-dot" style={{ background: item.color }} />
                <span className="breakdown-label">{item.label}</span>
                <span className="breakdown-val">{item.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
