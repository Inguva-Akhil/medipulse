const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Hospital = require('../models/Hospital');

// Book a new appointment
router.post('/', async (req, res) => {
  try {
    const { hospitalId, userId, patientName, patientPhone, symptoms, severity, appointmentDate } = req.body;
    
    const appointment = new Appointment({
      hospitalId,
      userId,
      patientName,
      patientPhone,
      symptoms,
      severity: severity || 'Mild',
      appointmentDate
    });

    const savedAppointment = await appointment.save();
    
    // BED ALLOCATION LOGIC
    const hospital = await Hospital.findById(hospitalId);
    if (hospital) {
      if (appointment.severity === 'Severe' && hospital.resources.availableIcuBeds > 0) {
        hospital.resources.availableIcuBeds -= 1;
      } else if (hospital.resources.availableBeds > 0) {
        hospital.resources.availableBeds -= 1;
      }
      const updatedHospital = await hospital.save();
      
      const io = req.app.get('io');
      io.emit('hospitalUpdated', updatedHospital);
    }

    // Emit a socket event to the hospital's dashboard
    const io = req.app.get('io');
    io.emit('newAppointment', savedAppointment);

    res.status(201).json(savedAppointment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update appointment status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    
    appointment.status = status;
    const updatedAppointment = await appointment.save();
    
    // Optionally emit a status update event
    // const io = req.app.get('io');
    // io.emit('appointmentUpdated', updatedAppointment);

    res.json(updatedAppointment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Assign doctor
router.put('/:id/doctor', async (req, res) => {
  try {
    const { doctorName } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    
    appointment.assignedDoctor = doctorName;
    appointment.status = 'Arrived'; // Automatically mark patient as arrived when doctor assigned
    appointment.treatmentStartTime = Date.now();
    const updatedAppointment = await appointment.save();
    
    // Mark doctor as unavailable
    const hospital = await Hospital.findById(appointment.hospitalId);
    if (hospital) {
      const doc = hospital.doctors.find(d => d.name === doctorName);
      if (doc) {
        doc.isAvailable = false;
        await hospital.save();
        const io = req.app.get('io');
        io.emit('hospitalUpdated', hospital);
      }
    }

    // Emit a global event to update the hospital queue
    const io = req.app.get('io');
    io.emit('doctorAssigned', updatedAppointment);

    res.json(updatedAppointment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get appointments for a specific hospital (useful for Hospital portal later)
router.get('/hospital/:hospitalId', async (req, res) => {
  try {
    const appointments = await Appointment.find({ hospitalId: req.params.hospitalId }).sort({ appointmentDate: 1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get severe appointments for Authority Dashboard
router.get('/severe', async (req, res) => {
  try {
    const severeAppointments = await Appointment.find({ severity: 'Severe', status: 'Pending' })
      .populate('hospitalId', 'name doctors')
      .sort({ createdAt: -1 });
    res.json(severeAppointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Move patient to observation
router.put('/:id/observe', async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    
    appointment.status = 'Observation';
    appointment.observationStartTime = Date.now();
    const updatedAppointment = await appointment.save();

    const hospital = await Hospital.findById(appointment.hospitalId);
    if (hospital) {
      // Free the ICU/General bed that was used for treatment
      if (appointment.severity === 'Severe') {
        hospital.resources.availableIcuBeds = Math.min(hospital.resources.icuBeds, hospital.resources.availableIcuBeds + 1);
      } else {
        hospital.resources.availableBeds = Math.min(hospital.resources.totalBeds, hospital.resources.availableBeds + 1);
      }
      // Occupy an Observation bed
      if (hospital.resources.availableObservationBeds > 0) {
        hospital.resources.availableObservationBeds -= 1;
      }
      
      const updatedHospital = await hospital.save();
      const io = req.app.get('io');
      io.emit('hospitalUpdated', updatedHospital);
    }

    const io = req.app.get('io');
    io.emit('appointmentUpdated', updatedAppointment);
    res.json(updatedAppointment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Discharge a patient (save medical records and bill)
router.put('/:id/discharge', async (req, res) => {
  try {
    const { treatmentNotes, prescribedMedicines, billAmount } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    
    const oldStatus = appointment.status;
    
    appointment.status = 'Completed';
    appointment.treatmentNotes = treatmentNotes;
    appointment.prescribedMedicines = prescribedMedicines;
    appointment.billAmount = billAmount;
    
    const updatedAppointment = await appointment.save();
    
    // BED DEALLOCATION & DOCTOR AVAILABILITY LOGIC
    const hospital = await Hospital.findById(appointment.hospitalId);
    if (hospital) {
      if (oldStatus === 'Observation') {
        hospital.resources.availableObservationBeds = Math.min(hospital.resources.observationBeds, hospital.resources.availableObservationBeds + 1);
      } else if (appointment.severity === 'Severe') {
        hospital.resources.availableIcuBeds = Math.min(hospital.resources.icuBeds, hospital.resources.availableIcuBeds + 1);
      } else {
        hospital.resources.availableBeds = Math.min(hospital.resources.totalBeds, hospital.resources.availableBeds + 1);
      }

      // Free up assigned doctor
      if (appointment.assignedDoctor) {
        const doc = hospital.doctors.find(d => d.name === appointment.assignedDoctor);
        if (doc) doc.isAvailable = true;
      }

      const updatedHospital = await hospital.save();
      const io = req.app.get('io');
      io.emit('hospitalUpdated', updatedHospital);
    }

    const io = req.app.get('io');
    io.emit('appointmentDischarged', updatedAppointment);

    res.json(updatedAppointment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Pay bill
router.put('/:id/pay', async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    
    appointment.paymentStatus = 'Paid';
    const updatedAppointment = await appointment.save();
    
    res.json(updatedAppointment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get appointments for a specific user (Citizen history)
router.get('/user/:userId', async (req, res) => {
  try {
    const appointments = await Appointment.find({ userId: req.params.userId })
      .populate('hospitalId', 'name')
      .sort({ createdAt: -1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
