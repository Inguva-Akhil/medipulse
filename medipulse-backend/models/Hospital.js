const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, required: true }
  },
  resources: {
    totalBeds: { type: Number, default: 0 },
    availableBeds: { type: Number, default: 0 },
    icuBeds: { type: Number, default: 0 },
    availableIcuBeds: { type: Number, default: 0 },
    observationBeds: { type: Number, default: 0 },
    availableObservationBeds: { type: Number, default: 0 },
    ventilators: { type: Number, default: 0 },
    availableVentilators: { type: Number, default: 0 },
    bloodBank: {
      'A+': { type: Number, default: 0 },
      'O+': { type: Number, default: 0 },
      'B+': { type: Number, default: 0 },
      'AB+': { type: Number, default: 0 },
      'A-': { type: Number, default: 0 },
      'O-': { type: Number, default: 0 },
      'B-': { type: Number, default: 0 },
      'AB-': { type: Number, default: 0 },
    }
  },
  treatments: { type: [String], default: [] },
  doctors: [{
    name: { type: String, required: true },
    specialty: { type: String, required: true },
    isAvailable: { type: Boolean, default: true }
  }],
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Hospital', hospitalSchema);
