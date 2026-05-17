import React, { useState, useEffect, useContext } from 'react';
import { ShieldPlus, MapPin, Send, AlertCircle, ChevronDown, ChevronUp, Activity, Cross, HeartPulse, CalendarPlus } from 'lucide-react';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CitizenView = () => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  // Step 1: Symptoms
  const [symptom, setSymptom] = useState('');
  const [severity, setSeverity] = useState('Mild');
  const [submitted, setSubmitted] = useState(false);
  
  // Data
  const [hospitals, setHospitals] = useState([]);
  const [recommendedHospitals, setRecommendedHospitals] = useState([]);
  
  // UI State
  const [step, setStep] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [activeTreatments, setActiveTreatments] = useState([]);

  // Booking State
  const [bookingName, setBookingName] = useState(user ? user.name : '');
  const [bookingPhone, setBookingPhone] = useState(user ? user.phoneNumber : '');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingStatus, setBookingStatus] = useState({}); // { hospitalId: 'success' | 'error' }
  const [activeAppt, setActiveAppt] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (isAuthenticated && user && user._id) {
      fetch(`${API_URL}/api/appointments/user/${user._id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setHistory(data);
          } else {
            console.error('Expected array for history, got:', data);
            setHistory([]);
          }
        })
        .catch(err => {
          console.error(err);
          setHistory([]);
        });
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const res = await fetch(`${API_URL}/api/hospitals`);
        const data = await res.json();
        setHospitals(data);
      } catch (err) {
        console.error('Failed to fetch hospitals:', err);
      }
    };

    fetchHospitals();

    // Socket Connection for live updates on Hospital availability
    const socket = io(`${API_URL}`);
    socket.on('hospitalUpdated', (updatedHospital) => {
      setHospitals(prev => prev.map(h => h._id === updatedHospital._id ? updatedHospital : h));
      setRecommendedHospitals(prev => prev.map(h => h._id === updatedHospital._id ? updatedHospital : h));
    });

    return () => socket.disconnect();
  }, []);

  // Enhanced Triage Engine
  const getNeededTreatments = (symptomsInput, severityInput) => {
    const s = symptomsInput.toLowerCase();
    let needed = [];

    if (severityInput === 'Severe' || s.includes('accident') || s.includes('bleeding') || s.includes('emergency')) needed.push('Emergency Care');
    if (s.includes('heart') || s.includes('chest') || s.includes('breath')) needed.push('Cardiologist');
    if (s.includes('bone') || s.includes('break') || s.includes('fracture') || s.includes('joint') || s.includes('back')) needed.push('Orthopedist');
    if (s.includes('baby') || s.includes('child') || s.includes('infant')) needed.push('Pediatrician');
    if (s.includes('headache') || s.includes('dizzy') || s.includes('faint') || s.includes('brain')) needed.push('Neurologist');
    if (s.includes('skin') || s.includes('rash') || s.includes('itch') || s.includes('acne')) needed.push('Dermatologist');
    if (s.includes('stomach') || s.includes('vomit') || s.includes('nausea') || s.includes('digest')) needed.push('Gastroenterologist');
    if (s.includes('eye') || s.includes('vision') || s.includes('blur')) needed.push('Ophthalmologist');
    if (s.includes('tooth') || s.includes('teeth') || s.includes('gum') || s.includes('dental')) needed.push('Dentist');
    if (s.includes('cancer') || s.includes('tumor')) needed.push('Oncologist');
    if (s.includes('pregnant') || s.includes('maternity')) needed.push('Gynecologist');

    if (s.includes('fever') || s.includes('cough') || s.includes('cold') || s.includes('pain') || s.includes('weak') || s.includes('tired')) {
        needed.push('General Physician'); 
    }

    if (needed.length === 0) {
        needed.push('General Physician');
    }
    
    return [...new Set(needed)];
  };

  const performTriage = (symptomsInput, allHospitals) => {
    const neededTreatments = getNeededTreatments(symptomsInput, severity);
    setActiveTreatments(neededTreatments);

    const scoredHospitals = allHospitals.map(h => {
      let matchCount = 0;
      
      neededTreatments.forEach(t => {
         if (t === 'Emergency Care' && h.treatments?.includes(t)) {
             matchCount += 1;
         }
         if (h.doctors?.some(d => d.specialty === t)) {
             matchCount += 1;
         }
      });
      
      // Resource-based priority scoring
      if (severity === 'Severe') {
        if (h.resources?.availableIcuBeds > 0) {
          matchCount += 100; // Massive boost for Severe patients if ICU is available
        } else {
          matchCount -= 50; // Penalty if no ICU beds for Severe patient
        }
      } else {
        if (h.resources?.availableBeds > 0) {
          matchCount += 10; // Boost for General availability
        }
      }

      return { ...h, matchCount };
    });

    const filtered = scoredHospitals.filter(h => h.matchCount > 0).sort((a, b) => b.matchCount - a.matchCount);
    
    if (filtered.length === 0) {
      return allHospitals.sort((a, b) => (b.resources?.availableBeds || 0) - (a.resources?.availableBeds || 0));
    }
    return filtered;
  };

  const handleTriageSubmit = async (e) => {
    e.preventDefault();
    
    // 1. Submit report to Authority Dashboard silently
    try {
      await fetch(`${API_URL}/api/surveillance/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: { lat: 40.7128, lng: -74.0060, zipCode: '10001' },
          symptoms: symptom.split(',').map(s => s.trim()),
          severity: severity
        })
      });
    } catch(err) {
      console.error("Failed to ping surveillance:", err);
    }

    // 2. Perform Triage and Show Recommendations
    const recommendations = performTriage(symptom, hospitals);
    setRecommendedHospitals(recommendations);
    setStep(2);
    setExpandedId(recommendations[0]?._id); // Auto-expand the best match
  };

  const handleBookAppointment = async (hospitalId) => {
    // Guest Limit Check
    if (!isAuthenticated) {
      const hasGuestBooked = localStorage.getItem('hasBookedGuest');
      if (hasGuestBooked) {
        alert("You have already used your 1-time emergency guest booking. Please log in to book further appointments.");
        navigate('/login');
        return;
      }
    }

    if (!bookingName || !bookingPhone || !bookingDate) {
      alert("Please fill in all booking details.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospitalId,
          userId: user ? user._id : null,
          patientName: bookingName,
          patientPhone: bookingPhone,
          symptoms: symptom,
          severity: severity,
          appointmentDate: bookingDate
        })
      });

      if (res.ok) {
        const savedAppt = await res.json();
        setBookingStatus({ [hospitalId]: 'success' });
        setActiveAppt(savedAppt);
        if (!isAuthenticated) {
          localStorage.setItem('hasBookedGuest', 'true');
        }
      } else {
        setBookingStatus({ [hospitalId]: 'error' });
      }
    } catch (err) {
      console.error(err);
      setBookingStatus({ [hospitalId]: 'error' });
    }
  };

  const handleImHere = async () => {
    if (!activeAppt) return;
    try {
      const res = await fetch(`${API_URL}/api/appointments/${activeAppt._id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Arrived' })
      });
      if (res.ok) {
        const updated = await res.json();
        setActiveAppt(updated);
      }
    } catch(err) {
      console.error(err);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handlePayBill = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/appointments/${id}/pay`, {
        method: 'PUT'
      });
      if (res.ok) {
        const updatedAppt = await res.json();
        setHistory(prev => prev.map(a => a._id === id ? updatedAppt : a));
        alert('Payment Successful!');
      }
    } catch(err) {
      console.error(err);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      
      {activeAppt && (
        <div className="glass-panel" style={{ marginBottom: '2rem', border: '2px solid var(--primary-color)', background: 'rgba(56, 189, 248, 0.05)' }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldPlus size={20} /> Active Appointment
            </h3>
            <span style={{ background: activeAppt.status === 'Arrived' ? 'var(--success-color)' : 'rgba(255,255,255,0.1)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
              {activeAppt.status}
            </span>
          </div>
          <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
            Your appointment for <strong>{activeAppt.patientName}</strong> is confirmed for {new Date(activeAppt.appointmentDate).toLocaleString()}. Please proceed to the hospital.
          </p>
          {activeAppt.status !== 'Arrived' && (
            <button onClick={handleImHere} className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', fontWeight: 'bold' }}>
              <MapPin size={18} style={{ display: 'inline', marginRight: '0.5rem' }} /> I'm Here (Notify Hospital)
            </button>
          )}
        </div>
      )}

      {isAuthenticated && Array.isArray(history) && history.filter(a => a.status === 'Completed').length > 0 && (
        <div className="glass-panel" style={{ marginBottom: '2rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={20} className="text-primary" /> My Medical Records & Bills
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {history.filter(a => a.status === 'Completed').map(appt => (
              <div key={appt._id} style={{ background: 'var(--surface-color-hover)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--primary-color)' }}>
                <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0 }}>{appt.hospitalId?.name || 'Hospital'}</h4>
                  <span className="text-muted" style={{ fontSize: '0.8rem' }}>{new Date(appt.createdAt).toLocaleDateString()}</span>
                </div>
                {appt.assignedDoctor && <p style={{ fontSize: '0.85rem', margin: '0 0 0.5rem 0' }}><strong>Doctor:</strong> {appt.assignedDoctor}</p>}
                
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '4px', marginBottom: '1rem' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}><strong>Treatment Notes:</strong> {appt.treatmentNotes || 'N/A'}</p>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}><strong>Medicines:</strong> {appt.prescribedMedicines || 'N/A'}</p>
                </div>

                <div className="flex-between" style={{ alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Total Bill:</span>
                    <h3 style={{ margin: 0, color: appt.paymentStatus === 'Paid' ? 'var(--success-color)' : 'var(--danger-color)' }}>
                      ${" "}{appt.billAmount}
                    </h3>
                  </div>
                  {appt.paymentStatus === 'Paid' ? (
                    <span style={{ background: 'var(--success-color)', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                      PAID ✓
                    </span>
                  ) : (
                    <button onClick={() => handlePayBill(appt._id)} className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                      Pay Now
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h2>Citizen <span className="heading-gradient">Care Finder</span></h2>
        <p className="text-muted">Tell us your symptoms, and we will find the right hospital for you.</p>
      </header>

      {/* STEP 1: Triage Form */}
      {step === 1 && (
        <div className="glass-panel animate-fade-in" style={{ marginTop: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <Activity size={48} className="text-primary" style={{ margin: '0 auto', marginBottom: '1rem' }} />
            <h3>What are you experiencing?</h3>
          </div>
          
          <form onSubmit={handleTriageSubmit}>
            <div className="input-group">
              <label>Describe your symptoms</label>
              <input 
                type="text" 
                placeholder="e.g., Severe chest pain, or broken bone..." 
                value={symptom}
                onChange={(e) => setSymptom(e.target.value)}
                required
                style={{ fontSize: '1.1rem', padding: '1rem' }}
              />
            </div>
            <div className="input-group">
              <label>Severity</label>
              <select value={severity} onChange={(e) => setSeverity(e.target.value)} style={{ fontSize: '1.1rem', padding: '1rem' }}>
                <option value="Mild">Mild - Manageable at home</option>
                <option value="Moderate">Moderate - Seeking medical advice</option>
                <option value="Severe">Severe - Need urgent care</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '1rem', fontSize: '1.1rem' }}>
              Find Recommended Care <Send size={18} style={{ marginLeft: '0.5rem' }} />
            </button>
          </form>
        </div>
      )}

      {/* STEP 2: Recommendations & Booking */}
      {step === 2 && (
        <div className="animate-fade-in">
          <button onClick={() => setStep(1)} className="btn btn-secondary" style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            ← Back to Symptoms
          </button>
          
          <div className="glass-panel">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldPlus className="text-primary" size={24} />
              Recommended Facilities
            </h3>
            
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
              Based on your symptoms (<strong>{symptom}</strong>), we recommend the following hospitals equipped with the right specialists:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {recommendedHospitals.map((hospital, index) => {
                const isExpanded = expandedId === hospital._id;
                const isIcuAvailable = hospital.resources?.availableIcuBeds > 0;
                const isBestMatch = index === 0;
                
                return (
                  <div key={hospital._id} style={{ padding: '1rem', background: isBestMatch ? 'rgba(56, 189, 248, 0.05)' : 'var(--surface-color-hover)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease', border: isExpanded ? '1px solid var(--primary-color)' : (isBestMatch ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent') }}>
                    
                    <div onClick={() => toggleExpand(hospital._id)}>
                      {isBestMatch && <div style={{ fontSize: '0.75rem', color: 'var(--primary-color)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>⭐ Top Match</div>}
                      <div className="flex-between">
                        <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {hospital.name}
                        </h4>
                        {isExpanded ? <ChevronUp size={18} className="text-muted" /> : <ChevronDown size={18} className="text-muted" />}
                      </div>
                      
                      <p className="text-muted" style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}>
                        <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }}/> {hospital.location?.address || 'City Center'}
                      </p>
                      
                      {/* Compact View */}
                      {!isExpanded && (
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', flexWrap: 'wrap' }}>
                          <span>🛏️ General Beds: <strong>{hospital.resources?.availableBeds || 0}</strong></span>
                          <span>🩸 Services: <strong>{hospital.treatments?.length || 0} Active</strong></span>
                        </div>
                      )}
                    </div>

                    {/* Expanded Detailed View & Booking */}
                    {isExpanded && (
                      <div className="animate-fade-in" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        
                        {/* Specialists Available */}
                        {((hospital.doctors && hospital.doctors.length > 0) || (hospital.treatments && hospital.treatments.includes('Emergency Care'))) && (
                          <div>
                            <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <HeartPulse size={14} className="text-primary" /> Specialists Available
                            </h5>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                              {['Emergency Care', ...new Set((hospital.doctors || []).map(d => d.specialty))].map((specialty, idx) => {
                                if (specialty === 'Emergency Care' && !hospital.treatments?.includes('Emergency Care')) return null;
                                const isMatchedTreatment = activeTreatments.includes(specialty);
                                return (
                                  <span key={idx} style={{ background: isMatchedTreatment ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)', color: isMatchedTreatment ? 'white' : 'var(--text-main)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    {specialty}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Booking Section */}
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                          <h5 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CalendarPlus size={16} className="text-success" /> Fast-Track Appointment
                          </h5>

                          {bookingStatus[hospital._id] === 'success' ? (
                            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                              <strong>Appointment Confirmed!</strong><br />
                              <span style={{ fontSize: '0.9rem' }}>The hospital has been notified of your symptoms.</span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                              {!isAuthenticated && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--warning-color)', marginBottom: '0.5rem' }}>
                                  ⚠️ Booking as Guest. You may only make 1 emergency booking without an account.
                                </div>
                              )}
                              <input 
                                type="text" 
                                placeholder="Patient Name" 
                                value={bookingName}
                                onChange={(e) => setBookingName(e.target.value)}
                                style={{ width: '100%' }}
                              />
                              <input 
                                type="text" 
                                placeholder="Phone Number" 
                                value={bookingPhone}
                                onChange={(e) => setBookingPhone(e.target.value)}
                                style={{ width: '100%' }}
                              />
                              <input 
                                type="datetime-local" 
                                value={bookingDate}
                                onChange={(e) => setBookingDate(e.target.value)}
                                style={{ width: '100%' }}
                              />
                              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <button onClick={() => handleBookAppointment(hospital._id)} className="btn btn-primary" style={{ flex: 1 }}>
                                  Confirm Booking
                                </button>
                                <a 
                                  href={`https://www.google.com/maps/search/?api=1&query=${hospital.location?.lat},${hospital.location?.lng}`}
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="btn btn-secondary" 
                                >
                                  Directions
                                </a>
                              </div>
                            </div>
                          )}
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CitizenView;
