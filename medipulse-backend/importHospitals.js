require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const Hospital = require('./models/Hospital');
const Appointment = require('./models/Appointment');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/medipulse';

const importHospitals = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to Database.');

    console.log('Wiping existing Hospitals and Appointments to prepare for migration...');
    await Hospital.deleteMany({});
    await Appointment.deleteMany({});
    console.log('Old data cleared.');

    const hospitalsList = [];

    console.log('Reading hospital_data_bangalore.csv...');
    await new Promise((resolve, reject) => {
      fs.createReadStream('hospital_data_bangalore.csv')
        .pipe(csv())
        .on('data', (row) => {
          if (!row.Hospital_name) return;

          const totalBeds = Math.floor(Math.random() * 500) + 100;
          const icuBeds = Math.floor(totalBeds * 0.1);
          const observationBeds = Math.floor(totalBeds * 0.05);

          hospitalsList.push({
            name: row.Hospital_name.trim(),
            location: {
              address: row.Address ? row.Address.trim() : 'Bangalore',
              lat: 12.9716,
              lng: 77.5946
            },
            resources: {
              totalBeds: totalBeds,
              availableBeds: Math.floor(totalBeds * (0.4 + Math.random() * 0.4)),
              icuBeds: icuBeds,
              availableIcuBeds: Math.floor(icuBeds * (0.2 + Math.random() * 0.6)),
              observationBeds: observationBeds,
              availableObservationBeds: Math.floor(observationBeds * (0.3 + Math.random() * 0.5)),
              ventilators: Math.floor(icuBeds * 0.8),
              availableVentilators: Math.floor(icuBeds * 0.4)
            },
            treatments: ['Emergency Care', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics'],
            doctors: []
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`Parsed ${hospitalsList.length} hospitals. Inserting into database...`);
    await Hospital.insertMany(hospitalsList);

    console.log('Hospital Migration Complete! Please run importDoctors.js next.');
    process.exit(0);

  } catch (error) {
    console.error('Error during hospital migration:', error);
    process.exit(1);
  }
};

importHospitals();
