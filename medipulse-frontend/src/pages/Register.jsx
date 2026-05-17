import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, User, Lock, Mail, Shield, Phone, Key, CheckCircle } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Citizen',
    phoneNumber: '',
    authorityCode: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // OTP Mock State
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);

  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSendOtp = (e) => {
    e.preventDefault();
    if (!formData.phoneNumber) {
      setError('Please enter a mobile number first.');
      return;
    }
    setError('');
    setOtpSent(true);
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (otpValue.length === 4) {
      setOtpVerified(true);
      setError('');
    } else {
      setError('Invalid OTP. Use any 4 digits for demo.');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    
    // Prevent Citizen registration if OTP not verified
    if (formData.role === 'Citizen' && !otpVerified) {
      setError('Please verify your mobile number with OTP first.');
      return;
    }

    setLoading(true);
    
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
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
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem', marginBottom: '3rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '450px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <UserPlus size={40} className="text-primary" style={{ marginBottom: '1rem' }} />
          <h2>Create Account</h2>
          <p className="text-muted">Join the MediPulse Network</p>
        </div>
        
        {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', textAlign: 'center', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>{error}</div>}
        
        <form onSubmit={handleRegister}>
          
          <div className="input-group">
            <label><Shield size={14} style={{ display:'inline', marginRight:'4px' }}/> Account Role</label>
            <select name="role" value={formData.role} onChange={handleChange} required>
              <option value="Citizen">Citizen (Public Access)</option>
              <option value="Hospital">Hospital Staff (Resource Manager)</option>
              <option value="Authority">Health Authority (Dashboard Admin)</option>
            </select>
          </div>

          {/* CITIZEN SPECIFIC FLOW (OTP) */}
          {formData.role === 'Citizen' && (
            <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginBottom: '1rem' }}>
              <div className="input-group" style={{ marginBottom: otpSent ? '1rem' : '0' }}>
                <label><Phone size={14} style={{ display:'inline', marginRight:'4px' }}/> Mobile Number</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="tel" 
                    name="phoneNumber"
                    placeholder="+1 234 567 8900" 
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    disabled={otpVerified}
                    style={{ flex: 1 }}
                    required={formData.role === 'Citizen'} 
                  />
                  {!otpVerified && (
                    <button onClick={handleSendOtp} className="btn btn-secondary" style={{ padding: '0 1rem' }} type="button">
                      {otpSent ? 'Resend' : 'Get OTP'}
                    </button>
                  )}
                </div>
              </div>

              {otpSent && !otpVerified && (
                <div className="input-group" style={{ marginBottom: '0' }}>
                  <label>Enter 4-Digit OTP</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      maxLength="4"
                      placeholder="e.g. 1234" 
                      value={otpValue}
                      onChange={(e) => setOtpValue(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button onClick={handleVerifyOtp} className="btn btn-primary" style={{ padding: '0 1rem' }} type="button">
                      Verify
                    </button>
                  </div>
                </div>
              )}

              {otpVerified && (
                <div style={{ color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <CheckCircle size={16} /> Number Verified!
                </div>
              )}
            </div>
          )}

          {/* HOSPITAL SPECIFIC FLOW */}
          {formData.role === 'Hospital' && (
            <div className="input-group" style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--primary-color)', borderRadius: '8px' }}>
              <label style={{ color: 'var(--primary-color)' }}><Key size={14} style={{ display:'inline', marginRight:'4px' }}/> Authority Verification Code</label>
              <input 
                type="text" 
                name="authorityCode"
                placeholder="Enter AUTH-2026 for demo" 
                value={formData.authorityCode}
                onChange={handleChange}
                required={formData.role === 'Hospital'} 
              />
            </div>
          )}

          {/* GENERAL INFO (Hide until OTP verified if Citizen) */}
          {(formData.role !== 'Citizen' || otpVerified) && (
            <>
              <div className="input-group" style={{ marginTop: '1rem' }}>
                <label><User size={14} style={{ display:'inline', marginRight:'4px' }}/> Full Name</label>
                <input 
                  type="text" 
                  name="name"
                  placeholder="John Doe" 
                  value={formData.name}
                  onChange={handleChange}
                  required 
                />
              </div>
              
              <div className="input-group">
                <label><Mail size={14} style={{ display:'inline', marginRight:'4px' }}/> Email Address</label>
                <input 
                  type="email" 
                  name="email"
                  placeholder="name@example.com" 
                  value={formData.email}
                  onChange={handleChange}
                  required 
                />
              </div>
              
              <div className="input-group">
                <label><Lock size={14} style={{ display:'inline', marginRight:'4px' }}/> Password</label>
                <input 
                  type="password" 
                  name="password"
                  placeholder="••••••••" 
                  value={formData.password}
                  onChange={handleChange}
                  required 
                />
              </div>
              
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Account & Login'} <UserPlus size={18} />
              </button>
            </>
          )}

        </form>
        
        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
          <span className="text-muted">Already have an account? </span>
          <Link to="/login" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: '500' }}>
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
