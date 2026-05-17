import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, User, Lock } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      // Update global auth state
      login(data.user, data.token);
      
      // Route based on role
      if (data.user.role === 'Authority') {
        navigate('/dashboard');
      } else if (data.user.role === 'Hospital') {
        navigate('/hospital');
      } else {
        navigate('/');
      }
      
    } catch (err) {
      console.error('API Login failed:', err.message);
      setError(err.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <LogIn size={40} className="text-primary" style={{ marginBottom: '1rem' }} />
          <h2>Welcome Back</h2>
          <p className="text-muted">Sign in to MediPulse</p>
        </div>
        
        {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
        
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label><User size={14} style={{ display:'inline', marginRight:'4px' }}/> Email</label>
            <input 
              type="email" 
              placeholder="e.g. admin@medipulse.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          <div className="input-group">
            <label><Lock size={14} style={{ display:'inline', marginRight:'4px' }}/> Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }}>
            Login <LogIn size={18} />
          </button>
        </form>
        
        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
          <span className="text-muted">Don't have an account? </span>
          <Link to="/register" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: '500' }}>
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
