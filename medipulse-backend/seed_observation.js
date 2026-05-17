require('dotenv').config();
const mongoose = require('mongoose');
const Hospital = require('./models/Hospital');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/medipulse';

const seedObservation = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to Database. Adding Observation Beds to existing hospitals...');

    const hospitals = await Hospital.find();
    
    for (const h of hospitals) {
      if (!h.resources) h.resources = {};
      h.resources.observationBeds = 20;
      h.resources.availableObservationBeds = 20;
      await h.save();
      console.log(`Added 20 observation beds to ${h.name}`);
    }

    console.log('Seed complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

seedObservation();
