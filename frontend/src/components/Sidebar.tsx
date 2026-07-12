import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  MdDashboard, MdDirectionsCar, MdPeople, MdAttachMoney,
  MdBarChart, MdLogout, MdMenu, MdClose, MdLocalShipping, MdBuild
} from 'react-icons/md';
import { useState } from 'react';
import './Sidebar.css';

const navItems = [
  { to: '/dashboard',   icon: <MdDashboard />,     label: 'Dashboard' },
  { to: '/vehicles',    icon: <MdDirectionsCar />,  label: 'Vehicles' },
  { to: '/drivers',     icon: <MdPeople />,         label: 'Drivers' },
  { to: '/trips',       icon: <MdLocalShipping />,  label: 'Trips' },
  { to: '/maintenance', icon: <MdBuild />,          label: 'Maintenance' },
  { to: '/expenses',    icon: <MdAttachMoney />,    label: 'Expenses' },
  { to: '/analytics',   icon: <MdBarChart />,       label: 'Analytics' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}

      {/* Mobile toggle */}
      <button className="sidebar-toggle" onClick={() => setOpen(!open)}>
        {open ? <MdClose size={22} /> : <MdMenu size={22} />}
      </button>

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon">🚛</div>
          <div>
            <div className="logo-title">FleetOps</div>
            <div className="logo-sub">Management System</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.email?.[0]?.toUpperCase()}</div>
            <div className="user-details">
              <div className="user-email truncate">{user?.email}</div>
              <div className="user-role">{user?.role?.replace('_', ' ')}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <MdLogout size={18} />
          </button>
        </div>
      </aside>
    </>
  );
}
