const mongoose = require('mongoose');

const symptomReportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    zipCode: { type: String }
  },
  symptoms: [{ type: String }],
  severity: { type: String, enum: ['Mild', 'Moderate', 'Severe'], default: 'Mild' },
  status: { type: String, enum: ['Active', 'Resolved'], default: 'Active' },
}, { timestamps: true });

module.exports = mongoose.model('SymptomReport', symptomReportSchema);
