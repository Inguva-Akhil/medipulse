import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, ShieldAlert, Building2, Users, LogOut, User as UserIcon } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useContext(AuthContext);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar glass-panel">
      <div className="navbar-brand">
        <Activity className="brand-icon" size={28} />
        <span className="brand-name heading-gradient">MediPulse</span>
      </div>
      
      <div className="navbar-links">
        <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
          <Users size={18} /> Citizen
        </Link>
        <Link to="/hospital" className={`nav-link ${location.pathname === '/hospital' ? 'active' : ''}`}>
          <Building2 size={18} /> Hospital Staff
        </Link>
        <Link to="/dashboard" className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>
          <ShieldAlert size={18} /> Authority
        </Link>
      </div>
      
      <div className="navbar-actions">
        {isAuthenticated ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', textDecoration: 'none' }}>
              <UserIcon size={16} className="text-primary" />
              <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>{user?.name || 'User'}</span>
            </Link>
            <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        ) : (
          <Link to="/login" className="btn btn-secondary">Login</Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
