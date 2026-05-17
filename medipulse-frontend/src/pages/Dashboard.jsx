import React, { useState, useEffect } from 'react';
import { ShieldAlert, Activity, Users, AlertTriangle, ChevronRight, ActivitySquare, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalHospitals: 0,
    activeAlerts: 0,
    criticalPatients: 0,
    availableICU: 0
  });

  const [alerts, setAlerts] = useState([]);
  const [reports, setReports] = useState([]);
  const [trendsData, setTrendsData] = useState([]);
  const [severeCases, setSevereCases] = useState([]);
  const [assigningDoctorId, setAssigningDoctorId] = useState(null);
  const [doctorName, setDoctorName] = useState('');

  const fetchData = async () => {
    try {
      const [statsRes, alertsRes, reportsRes, trendsRes, severeRes] = await Promise.all([
        fetch(`${API_URL}/api/surveillance/stats`),
        fetch(`${API_URL}/api/surveillance/alerts`),
        fetch(`${API_URL}/api/surveillance/reports`),
        fetch(`${API_URL}/api/surveillance/trends`),
        fetch(`${API_URL}/api/appointments/severe`)
      ]);

      const statsData = await statsRes.json();
      const alertsData = await alertsRes.json();
      const reportsData = await reportsRes.json();
      const trendsD = await trendsRes.json();
      const severeD = await severeRes.json();

      setTrendsData(trendsD);
      setSevereCases(severeD);

      setStats({
        totalHospitals: 1, // Currently only 1 mock hospital seeded
        activeAlerts: statsData.activeAlerts || 0,
        criticalPatients: statsData.criticalPatients || 0,
        availableICU: statsData.availableICU || 0
      });
      setAlerts(alertsData);
      setReports(reportsData);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    }
  };

  const handleAssignDoctor = async (apptId) => {
    if (!doctorName.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/appointments/${apptId}/doctor`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorName })
      });
      if (res.ok) {
        setAssigningDoctorId(null);
        setDoctorName('');
        fetchData(); // refresh severe cases
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();

    // Socket Connection
    const socket = io(`${API_URL}`);

    socket.on('hospitalUpdated', () => {
      // Re-fetch stats when a hospital updates its resources
      fetchData();
    });

    socket.on('newAlert', (alert) => {
      setAlerts((prev) => [alert, ...prev]);
      setStats((prev) => ({ ...prev, activeAlerts: prev.activeAlerts + 1 }));
    });
    
    socket.on('newReport', (report) => {
      setReports((prev) => [report, ...prev].slice(0, 20)); // Keep last 20
      if (report.severity === 'Severe') {
        setStats((prev) => ({ ...prev, criticalPatients: prev.criticalPatients + 1 }));
      }
      fetchData(); // Trigger re-fetch for trends graph
    });

    return () => socket.disconnect();
  }, []);

  return (
    <div className="animate-fade-in" style={{ padding: '2rem 0' }}>
      
      <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2>Health Authority <span className="heading-gradient">Dashboard</span></h2>
          <p className="text-muted">Real-time city surveillance & resource allocation</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="status-indicator" style={{ background: 'var(--success-color)' }}></span>
          <span className="text-muted" style={{ fontSize: '0.9rem' }}>Live Sync Active</span>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid-layout" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '2rem' }}>
        {[
          { label: 'Active Alerts', value: stats.activeAlerts, icon: AlertTriangle, color: 'var(--danger-color)' },
          { label: 'Available ICU Beds', value: stats.availableICU, icon: ActivitySquare, color: 'var(--success-color)' },
          { label: 'Severe Reports (24h)', value: stats.criticalPatients, icon: Users, color: 'var(--warning-color)' },
          { label: 'Monitored Hospitals', value: stats.totalHospitals, icon: ShieldAlert, color: 'var(--primary-color)' }
        ].map((stat, i) => (
          <div key={i} className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
            <div style={{ padding: '1rem', background: `color-mix(in srgb, ${stat.color} 15%, transparent)`, borderRadius: '12px', color: stat.color }}>
              <stat.icon size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{stat.value}</div>
              <div className="text-muted" style={{ fontSize: '0.9rem' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-layout" style={{ gridTemplateColumns: '2fr 1fr' }}>
        
        {/* Left Column: Charts and Reports */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Chart */}
          <div className="glass-panel">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={20} className="text-primary" /> Report Trends (Last 24h)
            </h3>
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer>
                <LineChart data={trendsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="time" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--primary-color)' }}
                  />
                  <Line type="monotone" dataKey="reports" stroke="var(--primary-color)" strokeWidth={3} dot={{ r: 4, fill: 'var(--primary-color)' }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Reports List */}
          <div className="glass-panel">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={20} className="text-primary" /> Recent Citizen Reports
            </h3>
            {reports.length === 0 ? (
              <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>No symptom reports submitted yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {reports.map((report) => (
                  <div key={report._id} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', borderLeft: `4px solid ${report.severity === 'Severe' ? 'var(--danger-color)' : report.severity === 'Moderate' ? 'var(--warning-color)' : 'var(--success-color)'}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <strong>{report.symptoms.join(', ')}</strong>
                        <span style={{ fontSize: '0.8rem' }} className="text-muted"><Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />{new Date(report.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                        Location: {report.location.zipCode || 'Unknown'} | Status: {report.severity}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Alerts & Doctor Assignment */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="glass-panel">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={20} className="text-danger" /> Active Outbreak Alerts
            </h3>
            
            {alerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--success-color)' }}>
                <ShieldAlert size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                <p>No active alerts. City status is nominal.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {alerts.map((alert) => (
                  <div key={alert._id || alert.id} style={{ background: 'linear-gradient(145deg, rgba(239, 68, 68, 0.05) 0%, rgba(255, 255, 255, 0.8) 100%)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '1rem', borderRadius: '12px', animation: 'slideIn 0.3s ease-out', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <span style={{ background: 'var(--danger-color)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <AlertTriangle size={12} /> {alert.severity}
                      </span>
                      <span className="text-muted" style={{ fontSize: '0.8rem', background: 'var(--surface-color)', padding: '0.2rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>{new Date(alert.createdAt || Date.now()).toLocaleTimeString()}</span>
                    </div>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--danger-color)' }}>{alert.type} Warning</h4>
                    <p style={{ fontSize: '0.9rem', margin: 0, lineHeight: 1.5, color: 'var(--text-color)' }}>{alert.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-panel" style={{ alignSelf: 'start', position: 'sticky', top: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={20} className="text-warning" /> Severe Cases (Requires Doctor)
            </h3>
            
            {severeCases.length === 0 ? (
              <p className="text-muted" style={{ textAlign: 'center', padding: '1rem' }}>No severe cases currently pending doctor assignment.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {severeCases.map((caseItem) => (
                  <div key={caseItem._id} style={{ background: 'linear-gradient(145deg, rgba(245, 158, 11, 0.05) 0%, rgba(255, 255, 255, 0.8) 100%)', borderLeft: '4px solid var(--warning-color)', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--danger-color)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Activity size={16} /> {caseItem.patientName}
                      </strong>
                      <span style={{ fontSize: '0.75rem', background: 'var(--surface-color)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', color: 'var(--primary-color)' }}>{caseItem.hospitalId?.name || 'Hospital'}</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-color)' }}><strong>Symptoms:</strong> {caseItem.symptoms}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      <Clock size={12} style={{ display: 'inline', marginRight: '0.2rem' }} /> 
                      Arrived: {new Date(caseItem.appointmentDate).toLocaleTimeString()}
                    </p>
                    
                    {caseItem.assignedDoctor ? (
                      <div style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)', color: 'var(--success-color)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        <CheckCircle size={14} /> Assigned: {caseItem.assignedDoctor}
                      </div>
                    ) : assigningDoctorId === caseItem._id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', background: 'rgba(0,0,0,0.02)', padding: '0.5rem', borderRadius: '6px' }}>
                        <input 
                          type="text" 
                          placeholder="Search doctor or specialty (e.g. Cardiology)" 
                          value={doctorName} 
                          onChange={(e) => setDoctorName(e.target.value)}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-color)', fontSize: '0.85rem' }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <select
                            onChange={(e) => setDoctorName(e.target.value)}
                            style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-color)', fontSize: '0.85rem' }}
                          >
                            <option value="">Select Available Doctor</option>
                            {caseItem.hospitalId?.doctors?.filter(d => 
                              d.isAvailable && 
                              (d.name.toLowerCase().includes(doctorName.toLowerCase()) || 
                               d.specialty.toLowerCase().includes(doctorName.toLowerCase()))
                            ).slice(0, 50).map((doc, idx) => (
                              <option key={idx} value={doc.name}>
                                {doc.name} - {doc.specialty}
                              </option>
                            ))}
                          </select>
                          <button onClick={() => handleAssignDoctor(caseItem._id)} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: 'bold' }}>Save</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setAssigningDoctorId(caseItem._id)} className="btn btn-secondary" style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', marginTop: '0.5rem', background: 'white', border: '1px dashed var(--warning-color)', color: 'var(--warning-color)' }}>
                        Assign Specialist Required
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
