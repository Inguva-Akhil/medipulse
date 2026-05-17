const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null if it's a 1-time guest
  },
  patientName: {
    type: String,
    required: true
  },
  patientPhone: {
    type: String,
    required: true
  },
  symptoms: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['Mild', 'Moderate', 'Severe'],
    default: 'Mild'
  },
  assignedDoctor: {
    type: String,
    default: null
  },
  appointmentDate: {
    type: Date,
    required: true
  },
  treatmentStartTime: {
    type: Date,
    default: null
  },
  observationStartTime: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Arrived', 'Observation', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
  treatmentNotes: {
    type: String,
    default: ''
  },
  prescribedMedicines: {
    type: String,
    default: ''
  },
  billAmount: {
    type: Number,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid'],
    default: 'Pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);
