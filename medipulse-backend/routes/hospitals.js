const express = require('express');
const router = express.Router();
const Hospital = require('../models/Hospital');

// Get all hospitals
router.get('/', async (req, res) => {
  try {
    const hospitals = await Hospital.find();
    res.json(hospitals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single hospital
router.get('/:id', async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
    res.json(hospital);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create hospital
router.post('/', async (req, res) => {
  const hospital = new Hospital(req.body);
  try {
    const newHospital = await hospital.save();
    res.status(201).json(newHospital);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update hospital resources
router.put('/:id/resources', async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

    hospital.resources = { ...hospital.resources, ...req.body };
    hospital.lastUpdated = Date.now();
    const updatedHospital = await hospital.save();

    // Emit event via Socket.io
    const io = req.app.get('io');
    io.emit('hospitalUpdated', updatedHospital);

    res.json(updatedHospital);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
