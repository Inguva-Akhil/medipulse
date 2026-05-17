const mongoose = require('mongoose');
const Hospital = require('./models/Hospital');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/medipulse')
  .then(async () => {
    console.log('Connected to DB');
    await Hospital.deleteMany();
    const hospital = new Hospital({
      name: 'General City Hospital',
      location: { lat: 40.7128, lng: -74.0060, address: '123 Main St' },
      resources: {
        totalBeds: 500,
        availableBeds: 120,
        icuBeds: 50,
        availableIcuBeds: 4,
        ventilators: 30,
        availableVentilators: 12
      }
    });
    await hospital.save();
    console.log('Hospital Seeded with ID:', hospital._id.toString());
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
