import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Lock } from 'lucide-react';

const ProtectedAccessRoute = ({ children, type }) => {
  const { user, isAuthenticated, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '5rem' }}>Loading secure portal...</div>;
  }

  // If not authenticated, redirect to login but save the attempted URL
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check Role-Based Access Control (RBAC)
  if (type && user?.role !== type) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="glass-panel" style={{ textAlign: 'center', maxWidth: '400px', padding: '3rem 2rem' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <Lock size={28} />
          </div>
          <h2 style={{ marginBottom: '1rem' }}>Access Denied</h2>
          <p className="text-muted" style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>
            You do not have the required permissions to view this page. 
            <br/><br/>
            Current Role: <strong style={{ color: 'var(--primary-color)' }}>{user?.role || 'None'}</strong><br/>
            Required Role: <strong style={{ color: 'var(--danger-color)' }}>{type}</strong>
          </p>
        </div>
      </div>
    );
  }

  // If authenticated and has the correct role, render the component
  return children;
};

export default ProtectedAccessRoute;
