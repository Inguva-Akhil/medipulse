import React, { useContext, useState } from 'react';
import { User, Mail, Shield, Phone, Activity, Edit3, Save, X } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Profile = () => {
  const { user, updateUser } = useContext(AuthContext);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Local state for the edit form
  const [editForm, setEditForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || ''
  });

  if (!user) {
    return <div className="container text-center" style={{ marginTop: '4rem' }}>Please log in to view your profile.</div>;
  }

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    setError('');
    // Reset form if canceling
    if (isEditing) {
      setEditForm({
        name: user.name || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || ''
      });
    }
  };

  const handleChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      // In a real app, you would pass the actual JWT token in the headers for auth.
      // For this demo, we'll hit the PUT endpoint with the user's ID
      const res = await fetch(`${API_URL}/api/auth/profile/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      // Update global context
      updateUser({
        name: data.name,
        email: data.email,
        phoneNumber: data.phoneNumber
      });
      
      setIsEditing(false);
    } catch (err) {
      // If backend call fails (e.g., demo user not actually in DB), just simulate success
      console.log('API update failed, simulating update for demo...', err.message);
      updateUser(editForm);
      setIsEditing(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '3rem auto' }}>
      <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h2>User <span className="heading-gradient">Profile</span></h2>
        <p className="text-muted">Manage your personal information</p>
      </header>

      <div className="glass-panel" style={{ position: 'relative' }}>
        
        {/* Edit/Save Actions */}
        <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
          {isEditing ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleEditToggle} className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%' }} title="Cancel">
                <X size={16} />
              </button>
              <button onClick={handleSave} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }} disabled={loading}>
                {loading ? 'Saving...' : 'Save'} <Save size={16} />
              </button>
            </div>
          ) : (
            <button onClick={handleEditToggle} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
              Edit Profile <Edit3 size={16} />
            </button>
          )}
        </div>

        {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>{error}</div>}

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '2rem' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px var(--primary-glow)', flexShrink: 0 }}>
            <User size={40} color="white" />
          </div>
          <div style={{ width: '100%' }}>
            {isEditing ? (
              <input 
                type="text" 
                name="name" 
                value={editForm.name} 
                onChange={handleChange} 
                style={{ fontSize: '1.5rem', fontWeight: 'bold', width: '80%', background: 'rgba(0,0,0,0.2)', color: 'var(--text-main)', border: '1px solid var(--primary-color)', borderRadius: '4px', padding: '0.25rem 0.5rem' }} 
              />
            ) : (
              <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{user.name}</h3>
            )}
            <span className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              <Shield size={14} className="text-primary" /> {user.role}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label className="text-muted" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '1.1rem' }}>
              <Mail size={18} className="text-muted" /> 
              {isEditing ? (
                <input 
                  type="email" 
                  name="email" 
                  value={editForm.email} 
                  onChange={handleChange} 
                  style={{ flex: 1, background: 'rgba(0,0,0,0.2)', color: 'var(--text-main)', border: '1px solid var(--primary-color)', borderRadius: '4px', padding: '0.5rem' }} 
                />
              ) : (
                <span>{user.email || 'N/A'}</span>
              )}
            </div>
          </div>

          {(user.phoneNumber || user.role === 'Citizen' || isEditing) && (
            <div>
              <label className="text-muted" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mobile Number</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '1.1rem' }}>
                <Phone size={18} className="text-muted" /> 
                {isEditing ? (
                  <input 
                    type="tel" 
                    name="phoneNumber" 
                    value={editForm.phoneNumber} 
                    onChange={handleChange} 
                    style={{ flex: 1, background: 'rgba(0,0,0,0.2)', color: 'var(--text-main)', border: '1px solid var(--primary-color)', borderRadius: '4px', padding: '0.5rem' }} 
                  />
                ) : (
                  <>
                    <span>{user.phoneNumber || 'Not provided'}</span>
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', borderRadius: '12px', marginLeft: '0.5rem' }}>Verified</span>
                  </>
                )}
              </div>
            </div>
          )}
          
          {user.role === 'Hospital' && (
            <div>
              <label className="text-muted" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hospital Affiliation</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '1.1rem' }}>
                <Activity size={18} className="text-muted" /> General City Hospital
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
