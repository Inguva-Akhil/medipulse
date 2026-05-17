require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');
const Hospital = require('./models/Hospital');
const Appointment = require('./models/Appointment');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/medipulse';
const API_URL = 'http://127.0.0.1:5000/api/appointments';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const simulateLiveTraffic = async () => {
  try {
    console.log('Connecting to MongoDB to get Hospitals...');
    await mongoose.connect(MONGO_URI);
    
    // Clear existing appointments so we start fresh
    console.log('Clearing old appointments for a fresh start...');
    await Appointment.deleteMany({});
    
    const hospitals = await Hospital.find({}, '_id name');
    if (hospitals.length === 0) {
      console.log('No hospitals found. Run importHospitals.js first.');
      process.exit(1);
    }
    console.log(`Found ${hospitals.length} hospitals.`);

    const patients = [];
    console.log('Loading hospital data analysis.csv into memory...');
    
    await new Promise((resolve, reject) => {
      fs.createReadStream('hospital data analysis.csv')
        .pipe(csv())
        .on('data', (row) => {
          if (row.Patient_ID) patients.push(row);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`Loaded ${patients.length} historical patients. Starting Live Simulation...`);
    console.log('Press Ctrl+C to stop the simulator.');
    console.log('----------------------------------------------------');

    let patientIndex = 0;
    
    // Loop infinitely, simulating a slow drip of patients
    while (true) {
      if (patientIndex >= patients.length) patientIndex = 0; // loop back if we run out
      
      const row = patients[patientIndex];
      const randomHospital = hospitals[Math.floor(Math.random() * hospitals.length)];
      
      let severity = 'Moderate';
      const condition = row.Condition ? row.Condition.toLowerCase() : '';
      if (condition.includes('attack') || condition.includes('stroke') || condition.includes('cancer')) {
        severity = 'Severe';
      } else if (condition.includes('infection') || condition.includes('fracture') || condition.includes('allergic')) {
        severity = 'Moderate';
      } else {
        severity = 'Mild';
      }

      const payload = {
        hospitalId: randomHospital._id.toString(),
        patientName: `Patient #${row.Patient_ID} (${row.Age}y)`,
        patientPhone: `555-01${Math.floor(Math.random() * 90) + 10}`,
        symptoms: row.Condition || 'Unknown',
        severity: severity,
        appointmentDate: new Date()
      };

      try {
        const response = await axios.post(API_URL, payload);
        console.log(`[LIVE] Dispatched ${payload.patientName} (${payload.severity}) to ${randomHospital.name}`);
      } catch (err) {
        console.error(`Failed to dispatch patient: ${err.message}`);
      }

      patientIndex++;
      
      // Wait between 5 to 10 seconds before the next patient arrives
      const waitTime = Math.floor(Math.random() * 5000) + 5000; 
      await sleep(waitTime);
    }

  } catch (error) {
    console.error('Simulator crashed:', error);
    process.exit(1);
  }
};

simulateLiveTraffic();
