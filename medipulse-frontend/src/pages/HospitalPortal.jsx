import React, { useState, useEffect } from 'react';
import { Save, BedDouble, Activity, Users, Calendar, Clock, CheckCircle } from 'lucide-react';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const HospitalPortal = () => {
  const [hospitalId, setHospitalId] = useState(null);
  const [hospitalName, setHospitalName] = useState('Loading...');
  const [resources, setResources] = useState({
    totalBeds: 0,
    availableBeds: 0,
    icuBeds: 0,
    availableIcuBeds: 0,
    observationBeds: 0,
    availableObservationBeds: 0,
    ventilators: 0,
    availableVentilators: 0
  });
  
  const [appointments, setAppointments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // 1. Fetch Hospitals List
    const fetchHospitalsList = async () => {
      try {
        const res = await fetch(`${API_URL}/api/hospitals`);
        const hospitals = await res.json();
        setHospitalsList(hospitals);
        if (hospitals.length > 0) {
          setHospitalId(prev => prev || hospitals[0]._id); // Default to first only if currently null
        }
      } catch (err) {
        console.error('Error fetching hospitals:', err);
      }
    };
    fetchHospitalsList();

    const socket = io(`${API_URL}`);
    socket.on('hospitalUpdated', () => {
      fetchHospitalsList(); // Refresh when any hospital updates resources/doctors
    });
    
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (!hospitalId) return;

    const fetchHospitalData = async () => {
      setLoading(true);
      try {
        const h = hospitalsList.find(h => h._id === hospitalId);
        if (h) {
          setHospitalName(h.name);
          setResources(h.resources);
        }

        // 2. Fetch Appointments for this hospital
        const apptRes = await fetch(`${API_URL}/api/appointments/hospital/${hospitalId}`);
        if (apptRes.ok) {
          const apptData = await apptRes.json();
          setAppointments(apptData);
        }
      } catch (err) {
        console.error('Error fetching hospital data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHospitalData();

    // 3. Socket Connection for Live Appointments
    const socket = io(`${API_URL}`);
    socket.on('newAppointment', (newAppt) => {
      if (newAppt.hospitalId === hospitalId) {
        setAppointments(prev => [...prev, newAppt]);
      }
    });

    socket.on('doctorAssigned', (updatedAppt) => {
      if (updatedAppt.hospitalId === hospitalId) {
        setAppointments(prev => prev.map(a => a._id === updatedAppt._id ? updatedAppt : a));
      }
    });

    socket.on('appointmentUpdated', (updatedAppt) => {
      if (updatedAppt.hospitalId === hospitalId) {
        setAppointments(prev => prev.map(a => a._id === updatedAppt._id ? updatedAppt : a));
      }
    });

    socket.on('hospitalUpdated', (updatedHospital) => {
      if (updatedHospital._id === hospitalId) {
        setResources(updatedHospital.resources);
      }
    });

    return () => socket.disconnect();
  }, [hospitalId, hospitalsList]);

  const handleChange = (e) => {
    setResources({ ...resources, [e.target.name]: parseInt(e.target.value) || 0 });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!hospitalId) return;
    
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/hospitals/${hospitalId}/resources`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resources)
      });
    } catch(err) {
      console.error(err);
    }
    setSaving(false);
  };

  const [expandedApptId, setExpandedApptId] = useState(null);
  const [dischargingApptId, setDischargingApptId] = useState(null);
  const [dischargeData, setDischargeData] = useState({ treatmentNotes: '', prescribedMedicines: '', billAmount: 0 });
  const [assigningDoctorId, setAssigningDoctorId] = useState(null);
  const [doctorName, setDoctorName] = useState('');

  const severityWeight = { 'Severe': 3, 'Moderate': 2, 'Mild': 1 };
  const sortedAppointments = [...appointments]
    .filter(a => a.status !== 'Completed')
    .sort((a, b) => {
      if (a.status === 'Pending' && b.status !== 'Pending') return -1;
      if (b.status === 'Pending' && a.status !== 'Pending') return 1;
      const weightA = severityWeight[a.severity] || 1;
      const weightB = severityWeight[b.severity] || 1;
      if (weightB !== weightA) return weightB - weightA;
      return new Date(a.appointmentDate) - new Date(b.appointmentDate);
    });

  const handleMarkArrived = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/appointments/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Arrived' })
      });
      if (res.ok) {
        const updatedAppt = await res.json();
        setAppointments(prev => prev.map(a => a._id === id ? updatedAppt : a));
      }
    } catch(err) {
      console.error(err);
    }
  };

  const handleAssignDoctor = async (apptId) => {
    if (!doctorName.trim()) {
      alert('Please select a doctor or type a doctor name before saving.');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/appointments/${apptId}/doctor`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorName })
      });
      if (res.ok) {
        const updatedAppt = await res.json();
        setAppointments(prev => prev.map(a => a._id === apptId ? updatedAppt : a));
        setAssigningDoctorId(null);
        setDoctorName('');
        // Also fetch to update local hospital resource / doctors availability
        const hRes = await fetch(`${API_URL}/api/hospitals`);
        if (hRes.ok) {
           const hData = await hRes.json();
           setHospitalsList(hData); // Update the full list to reflect doctor availability
           const h = hData.find(hos => hos._id === hospitalId);
           if (h) setResources(h.resources);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMoveToObservation = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/appointments/${id}/observe`, {
        method: 'PUT',
      });
      if (res.ok) {
        const updatedAppt = await res.json();
        setAppointments(prev => prev.map(a => a._id === id ? updatedAppt : a));
      }
    } catch(err) {
      console.error(err);
    }
  };

  const handleDischarge = async (e, id) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/appointments/${id}/discharge`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dischargeData)
      });
      if (res.ok) {
        const updatedAppt = await res.json();
        setAppointments(prev => prev.map(a => a._id === id ? updatedAppt : a));
        setDischargingApptId(null);
        setDischargeData({ treatmentNotes: '', prescribedMedicines: '', billAmount: 0 });
      }
    } catch(err) {
      console.error(err);
    }
  };

  const pendingCount = appointments.filter(a => a.status === 'Pending').length;

  if (loading && !hospitalId) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading Portal Data...</div>;
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Hospital Staff <span className="heading-gradient">Portal</span></h2>
          <p className="text-muted">Manage {hospitalName} resources and patient intake</p>
        </div>
        <select 
          value={hospitalId || ''} 
          onChange={(e) => setHospitalId(e.target.value)} 
          style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-main)' }}
        >
          {hospitalsList.map(h => (
            <option key={h._id} value={h._id}>{h.name}</option>
          ))}
        </select>
      </header>

      <div className="grid-2" style={{ gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Column: Resource Management */}
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity className="text-primary" size={20} />
            Resource Management
          </h3>

          <form onSubmit={handleSave}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* General Beds */}
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <BedDouble className="text-primary" size={18} />
                  <h4 style={{ margin: 0 }}>General Ward</h4>
                </div>
                <div className="grid-2">
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Total Beds</label>
                    <input type="number" name="totalBeds" value={resources.totalBeds} onChange={handleChange} />
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Available Beds</label>
                    <input type="number" name="availableBeds" value={resources.availableBeds} onChange={handleChange} />
                  </div>
                </div>
              </div>

              {/* ICU & Critical */}
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Activity className="text-danger" size={18} />
                  <h4 style={{ margin: 0 }}>ICU & Critical Care</h4>
                </div>
                <div className="grid-2" style={{ marginBottom: '1rem' }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Total ICU Beds</label>
                    <input type="number" name="icuBeds" value={resources.icuBeds} onChange={handleChange} />
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Available ICU Beds</label>
                    <input type="number" name="availableIcuBeds" value={resources.availableIcuBeds} onChange={handleChange} />
                  </div>
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Available Ventilators</label>
                  <input type="number" name="availableVentilators" value={resources.availableVentilators} onChange={handleChange} />
                </div>
              </div>

              {/* Observation Beds */}
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Users className="text-warning" size={18} />
                  <h4 style={{ margin: 0 }}>Observation Ward</h4>
                </div>
                <div className="grid-2">
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Total Obs. Beds</label>
                    <input type="number" name="observationBeds" value={resources.observationBeds || 0} onChange={handleChange} />
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Available Obs. Beds</label>
                    <input type="number" name="availableObservationBeds" value={resources.availableObservationBeds || 0} onChange={handleChange} />
                  </div>
                </div>
              </div>

            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
              <span className="text-muted" style={{ fontSize: '0.9rem' }}>Live Sync Active</span>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Syncing...' : 'Update Resources'} <Save size={18} style={{ marginLeft: '0.5rem' }} />
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Appointment Queue */}
        <div className="glass-panel">
          <div className="flex-between" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users className="text-success" size={20} />
              Incoming Patient Queue
            </h3>
            <span style={{ background: pendingCount > 0 ? 'var(--danger-color)' : 'var(--success-color)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
              {pendingCount} Pending
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {sortedAppointments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <Calendar size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto' }} />
                <p>No appointments today.</p>
              </div>
            ) : (
              sortedAppointments.map((appt) => {
                const isArrived = appt.status === 'Arrived';
                const isObservation = appt.status === 'Observation';
                const isActive = isArrived || isObservation;
                const isExpanded = expandedApptId === appt._id;
                
                // Colors based on severity
                let borderColor = 'var(--primary-color)';
                let severityBadgeBg = 'rgba(56, 189, 248, 0.1)';
                let severityBadgeColor = 'var(--primary-color)';
                
                if (appt.severity === 'Severe') {
                  borderColor = 'var(--danger-color)';
                  severityBadgeBg = 'rgba(239, 68, 68, 0.1)';
                  severityBadgeColor = 'var(--danger-color)';
                } else if (appt.severity === 'Moderate') {
                  borderColor = 'var(--warning-color)';
                  severityBadgeBg = 'rgba(245, 158, 11, 0.1)';
                  severityBadgeColor = 'var(--warning-color)';
                }
                
                if (isActive) {
                  borderColor = isObservation ? 'var(--warning-color)' : 'var(--success-color)';
                }

                let treatmentDone = false;
                let observationDone = false;
                let timeRemaining = 0;
                
                if (isArrived && appt.treatmentStartTime) {
                  const severityTimes = { 'Mild': 5, 'Moderate': 10, 'Severe': 20 };
                  const targetSeconds = severityTimes[appt.severity] || 10;
                  const elapsedSeconds = (currentTime - new Date(appt.treatmentStartTime).getTime()) / 1000;
                  
                  if (elapsedSeconds >= targetSeconds) {
                    treatmentDone = true;
                  } else {
                    timeRemaining = Math.ceil(targetSeconds - elapsedSeconds);
                  }
                } else if (isArrived) {
                  treatmentDone = true; // Fallback
                }

                if (isObservation && appt.observationStartTime) {
                  const obsTargetSeconds = 10; // Fixed 10 seconds for observation
                  const obsElapsedSeconds = (currentTime - new Date(appt.observationStartTime).getTime()) / 1000;
                  
                  if (obsElapsedSeconds >= obsTargetSeconds) {
                    observationDone = true;
                  } else {
                    timeRemaining = Math.ceil(obsTargetSeconds - obsElapsedSeconds);
                  }
                } else if (isObservation) {
                  observationDone = true;
                }

                return (
                  <div key={appt._id} className="animate-fade-in" style={{ background: isActive ? 'rgba(16, 185, 129, 0.05)' : 'var(--surface-color-hover)', borderLeft: `4px solid ${borderColor}`, padding: '1rem', borderRadius: '8px', opacity: isActive ? 0.7 : 1 }}>
                    <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', textDecoration: isActive ? 'line-through' : 'none' }}>{appt.patientName}</h4>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {/* Severity Badge */}
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', background: severityBadgeBg, color: severityBadgeColor, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                          {appt.severity}
                        </span>
                        {/* Status Badge */}
                        <span style={{ fontSize: '0.75rem', background: isActive ? (isObservation ? 'var(--warning-color)' : 'var(--success-color)') : 'rgba(255,255,255,0.1)', color: isActive ? (isObservation ? 'black' : 'white') : 'inherit', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                          {appt.status}
                        </span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Clock size={14} className="text-primary" /> 
                        <strong>Time:</strong> {new Date(appt.appointmentDate).toLocaleString()}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Activity size={14} className="text-danger" /> 
                        <strong>Reported Symptoms:</strong> {appt.symptoms.length > 30 && !isExpanded ? appt.symptoms.substring(0, 30) + '...' : appt.symptoms}
                      </div>
                      {appt.assignedDoctor && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Users size={14} className="text-warning" /> 
                          <strong className="text-warning">Assigned: {appt.assignedDoctor}</strong>
                        </div>
                      )}
                      {appt.severity === 'Severe' && appt.status === 'Pending' && !appt.assignedDoctor && (
                        <div style={{ marginTop: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '4px', borderLeft: '2px solid var(--danger-color)' }}>
                          <strong className="text-danger" style={{ fontSize: '0.85rem' }}>CRITICAL EMERGENCY: Needs Immediate Doctor Assignment!</strong>
                          
                          {assigningDoctorId === appt._id ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                              <input 
                                type="text" 
                                placeholder="Search emergency specialist" 
                                value={doctorName} 
                                onChange={(e) => setDoctorName(e.target.value)}
                                style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--danger-color)', background: 'white', color: 'var(--text-color)', fontSize: '0.85rem' }}
                              />
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <select
                                  value={doctorName}
                                  onChange={(e) => setDoctorName(e.target.value)}
                                  style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--danger-color)', background: 'white', color: 'var(--text-color)', fontSize: '0.85rem' }}
                                >
                                  <option value="">Select Available Doctor</option>
                                  {(() => {
                                    const currentHospital = hospitalsList.find(h => h._id === hospitalId);
                                    return currentHospital?.doctors?.filter(d => 
                                      d.isAvailable && 
                                      (d.name.toLowerCase().includes(doctorName.toLowerCase()) || 
                                       d.specialty.toLowerCase().includes(doctorName.toLowerCase()))
                                    ).slice(0, 50).map((doc, idx) => (
                                      <option key={idx} value={doc.name}>{doc.name} - {doc.specialty}</option>
                                    ));
                                  })()}
                                </select>
                                <button onClick={() => handleAssignDoctor(appt._id)} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'var(--danger-color)' }}>Save Life</button>
                                <button onClick={() => setAssigningDoctorId(null)} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                              <button onClick={() => setAssigningDoctorId(appt._id)} style={{ flex: 1, background: 'var(--danger-color)', color: 'white', border: 'none', padding: '0.4rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}>
                                EMERGENCY: Assign Now
                              </button>
                              <button onClick={() => alert('Authority has been notified of this severe case and available doctors.')} style={{ flex: 1, background: 'transparent', color: 'var(--danger-color)', border: '1px solid var(--danger-color)', padding: '0.4rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>
                                Escalate to Authority
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {appt.severity === 'Moderate' && appt.status === 'Pending' && !appt.assignedDoctor && (
                        <div style={{ marginTop: '0.5rem', background: 'rgba(245, 158, 11, 0.05)', padding: '0.5rem', borderRadius: '4px', borderLeft: '2px solid var(--warning-color)' }}>
                          <strong className="text-warning" style={{ fontSize: '0.85rem' }}>Moderate Case: Assign Doctor</strong>
                          {assigningDoctorId === appt._id ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                              <input 
                                type="text" 
                                placeholder="Search doctor or specialty" 
                                value={doctorName} 
                                onChange={(e) => setDoctorName(e.target.value)}
                                style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-color)', fontSize: '0.85rem' }}
                              />
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <select
                                  value={doctorName}
                                  onChange={(e) => setDoctorName(e.target.value)}
                                  style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-color)', fontSize: '0.85rem' }}
                                >
                                  <option value="">Select Available Doctor</option>
                                  {(() => {
                                    const currentHospital = hospitalsList.find(h => h._id === hospitalId);
                                    return currentHospital?.doctors?.filter(d => 
                                      d.isAvailable && 
                                      (d.name.toLowerCase().includes(doctorName.toLowerCase()) || 
                                       d.specialty.toLowerCase().includes(doctorName.toLowerCase()))
                                    ).slice(0, 50).map((doc, idx) => (
                                      <option key={idx} value={doc.name}>{doc.name} - {doc.specialty}</option>
                                    ));
                                  })()}
                                </select>
                                <button onClick={() => handleAssignDoctor(appt._id)} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Save</button>
                                <button onClick={() => setAssigningDoctorId(null)} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setAssigningDoctorId(appt._id)} style={{ background: 'white', color: 'var(--warning-color)', border: '1px dashed var(--warning-color)', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', marginTop: '0.5rem', width: '100%' }}>
                              Assign Internal Specialist
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="animate-fade-in" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.9rem' }}>
                        <div style={{ marginBottom: '0.5rem' }}>
                          <strong>Full Case Notes:</strong><br/>
                          <span className="text-muted">{appt.symptoms}</span>
                        </div>
                        <div>
                          <strong>Contact Phone:</strong> {appt.patientPhone}
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                      {appt.status === 'Pending' && (
                        <button onClick={() => handleMarkArrived(appt._id)} className="btn btn-primary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}>
                          <CheckCircle size={14} style={{ marginRight: '0.25rem' }} /> Mark Arrived
                        </button>
                      )}
                      {appt.status === 'Arrived' && (
                        <button 
                          onClick={() => handleMoveToObservation(appt._id)} 
                          className="btn btn-primary" 
                          disabled={!treatmentDone}
                          style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', background: treatmentDone ? 'var(--primary-color)' : 'gray', color: 'white', opacity: treatmentDone ? 1 : 0.6 }}
                        >
                          {!treatmentDone ? `Treating... (${timeRemaining}s)` : 'Move to Observation'}
                        </button>
                      )}
                      {appt.status === 'Observation' && (
                        <button 
                          onClick={() => setDischargingApptId(dischargingApptId === appt._id ? null : appt._id)} 
                          className="btn btn-warning" 
                          disabled={!observationDone}
                          style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', background: observationDone ? 'var(--warning-color)' : 'gray', color: observationDone ? 'black' : 'white', opacity: observationDone ? 1 : 0.6 }}
                        >
                          {!observationDone ? `Observing... (${timeRemaining}s)` : dischargingApptId === appt._id ? 'Cancel Discharge' : 'Discharge Patient'}
                        </button>
                      )}
                      <button onClick={() => setExpandedApptId(isExpanded ? null : appt._id)} className="btn btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}>
                        {isExpanded ? 'Hide Details' : 'View Details'}
                      </button>
                    </div>

                    {dischargingApptId === appt._id && (
                      <form onSubmit={(e) => handleDischarge(e, appt._id)} className="animate-fade-in" style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                        <h5 style={{ margin: '0 0 1rem 0' }}>Patient Discharge Form</h5>
                        <div className="input-group" style={{ marginBottom: '0.8rem' }}>
                          <label>Treatment Provided</label>
                          <textarea 
                            required 
                            placeholder="Details of treatment..." 
                            value={dischargeData.treatmentNotes}
                            onChange={(e) => setDischargeData({...dischargeData, treatmentNotes: e.target.value})}
                            style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', background: 'var(--surface-color)' }}
                          />
                        </div>
                        <div className="input-group" style={{ marginBottom: '0.8rem' }}>
                          <label>Prescribed Medicines</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Amoxicillin, Ibuprofen" 
                            value={dischargeData.prescribedMedicines}
                            onChange={(e) => setDischargeData({...dischargeData, prescribedMedicines: e.target.value})}
                            style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', background: 'var(--surface-color)' }}
                          />
                        </div>
                        <div className="input-group" style={{ marginBottom: '1rem' }}>
                          <label>Total Bill Amount ($)</label>
                          <input 
                            type="number" 
                            required 
                            min="0"
                            value={dischargeData.billAmount}
                            onChange={(e) => setDischargeData({...dischargeData, billAmount: parseInt(e.target.value) || 0})}
                            style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', background: 'var(--surface-color)' }}
                          />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '0.85rem' }}>
                          Complete Consultation & Bill Patient
                        </button>
                      </form>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HospitalPortal;
