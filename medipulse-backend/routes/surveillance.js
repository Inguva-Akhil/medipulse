const express = require('express');
const router = express.Router();
const SymptomReport = require('../models/SymptomReport');
const Alert = require('../models/Alert');
const Hospital = require('../models/Hospital');

// Get overall stats for dashboard
router.get('/stats', async (req, res) => {
  try {
    const activeAlerts = await Alert.countDocuments();
    const criticalReports = await SymptomReport.countDocuments({ severity: 'Severe' });
    
    const hospitals = await Hospital.find();
    let totalICU = 0;
    hospitals.forEach(h => {
      totalICU += (h.resources.availableIcuBeds || 0);
    });

    res.json({
      activeAlerts,
      availableICU: totalICU,
      criticalPatients: criticalReports
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all alerts
router.get('/alerts', async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ createdAt: -1 });
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all reports
router.get('/reports', async (req, res) => {
  try {
    const reports = await SymptomReport.find().sort({ createdAt: -1 }).limit(20);
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Submit a symptom report
router.post('/report', async (req, res) => {
  const report = new SymptomReport(req.body);
  try {
    const newReport = await report.save();

    // Emit new report to update Dashboard instantly
    const io = req.app.get('io');
    io.emit('newReport', newReport);

    // --- MOCK AI OUTBREAK PREDICTION LOGIC ---
    // For demo purposes, we will trigger an alert if ANY severe report comes in
    if (report.severity === 'Severe') {
      const newAlert = new Alert({
        type: 'Outbreak',
        message: `High-severity symptoms reported (${report.symptoms.join(', ')}) in ${report.location.zipCode || 'City Center'}. Immediate attention recommended.`,
        severity: 'High',
        location: { lat: report.location.lat, lng: report.location.lng, regionName: report.location.zipCode || 'City Center' }
      });
      await newAlert.save();
      
      // Emit new alert via Socket.io
      const io = req.app.get('io');
      io.emit('newAlert', newAlert);
    }
    // --- END MOCK AI LOGIC ---

    res.status(201).json(newReport);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get trends data for the dashboard chart
router.get('/trends', async (req, res) => {
  try {
    const totalReports = await SymptomReport.countDocuments();
    // We mix some realistic base data with the actual real-time count 
    // so the chart looks good but still spikes when new reports are added!
    const trendsData = [
      { time: '08:00', reports: 12 },
      { time: '12:00', reports: 19 },
      { time: '16:00', reports: 35 },
      { time: '20:00', reports: 42 },
      { time: 'Now', reports: 28 + totalReports }, 
    ];
    res.json(trendsData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
