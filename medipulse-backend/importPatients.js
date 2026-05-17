require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const Appointment = require('./models/Appointment');
const Hospital = require('./models/Hospital');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/medipulse';

const importPatients = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to Database.');

    const hospitals = await Hospital.find();
    if (hospitals.length === 0) {
      console.log('No hospitals found! Please run the server to seed hospitals first.');
      process.exit(1);
    }

    const patients = [];
    console.log('Reading hospital data analysis.csv...');

    await new Promise((resolve, reject) => {
      fs.createReadStream('hospital data analysis.csv')
        .pipe(csv())
        .on('data', (row) => {
          if (!row.Patient_ID) return;

          // Determine severity based on condition or random
          let severity = 'Moderate';
          const condition = row.Condition ? row.Condition.toLowerCase() : '';
          if (condition.includes('attack') || condition.includes('stroke') || condition.includes('cancer')) {
            severity = 'Severe';
          } else if (condition.includes('infection') || condition.includes('fracture') || condition.includes('allergic')) {
            severity = 'Moderate';
          } else {
            severity = 'Mild';
          }

          // Distribute randomly across hospitals
          const hospital = hospitals[Math.floor(Math.random() * hospitals.length)];

          // Some patients don't have doctors in CSV, so we can pick a random doctor from the hospital
          let assignedDoctor = null;
          if (hospital.doctors && hospital.doctors.length > 0) {
            assignedDoctor = hospital.doctors[Math.floor(Math.random() * hospital.doctors.length)].name;
          }

          patients.push({
            patientName: `Patient #${row.Patient_ID}`,
            patientPhone: `555-01${Math.floor(Math.random() * 90) + 10}`,
            age: parseInt(row.Age) || 45,
            symptoms: row.Condition || 'Unknown',
            severity: severity,
            status: 'Completed', // Marked as completed to not clog the live queue
            hospitalId: hospital._id,
            assignedDoctor: assignedDoctor,
            billAmount: parseInt(row.Cost) || 0,
            treatmentNotes: row.Procedure || 'General treatment',
            prescribedMedicines: 'Standard discharge medication',
            appointmentDate: new Date(), // Just using current date as completion date
            treatmentStartTime: new Date(Date.now() - 3600000) // 1 hour ago
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`Parsed ${patients.length} patient records. Inserting into database...`);

    // Insert all at once
    await Appointment.insertMany(patients);

    console.log('Migration Complete! All historical patients successfully imported.');
    process.exit(0);

  } catch (error) {
    console.error('Error during patient migration:', error);
    process.exit(1);
  }
};

importPatients();
