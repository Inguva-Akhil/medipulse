const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  type: { type: String, enum: ['Outbreak', 'Resource Shortage', 'System'], required: true },
  message: { type: String, required: true },
  severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], required: true },
  location: {
    lat: { type: Number },
    lng: { type: Number },
    regionName: { type: String }
  },
  status: { type: String, enum: ['Active', 'Resolved', 'Dismissed'], default: 'Active' },
}, { timestamps: true });

module.exports = mongoose.model('Alert', alertSchema);
