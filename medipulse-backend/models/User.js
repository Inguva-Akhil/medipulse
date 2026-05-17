const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['Citizen', 'Hospital', 'Authority'], 
    default: 'Citizen' 
  },
  phoneNumber: { type: String },
  isPhoneVerified: { type: Boolean, default: false },
  isAuthorityVerified: { type: Boolean, default: false },
  hospitalId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Hospital',
    required: function() { return this.role === 'Hospital'; }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
