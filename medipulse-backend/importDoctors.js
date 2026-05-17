require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const Hospital = require('./models/Hospital');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/medipulse';

const importDoctors = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to Database.');

    const doctorsList = [];
    const seenNames = new Set();

    console.log('Reading CSV file...');
    
    // Wrap CSV reading in a Promise
    await new Promise((resolve, reject) => {
      fs.createReadStream('bangalore_doctors_final.csv')
        .pipe(csv())
        .on('data', (row) => {
          // Add 'Dr. ' prefix if not present
          let docName = row.name.trim();
          if (!docName.toLowerCase().startsWith('dr')) {
            docName = 'Dr. ' + docName;
          }

          // Format specialty (e.g. "general-physician" -> "General Physician")
          let specialty = row.specialty 
            ? row.specialty.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
            : 'General';

          // Deduplicate by name
          if (!seenNames.has(docName)) {
            seenNames.add(docName);
            doctorsList.push({
              name: docName,
              specialty: specialty,
              isAvailable: true
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`Successfully parsed ${doctorsList.length} unique doctors from CSV.`);

    // Fetch all hospitals
    const hospitals = await Hospital.find();
    
    if (hospitals.length === 0) {
      console.log('No hospitals found in the database. Please run your server once to seed hospitals before importing doctors.');
      process.exit(1);
    }

    console.log(`Distributing ${doctorsList.length} doctors across ${hospitals.length} hospitals...`);

    // Clear existing doctors to prevent overlap with previous seeded data
    for (let hospital of hospitals) {
      hospital.doctors = []; 
    }

    // Group doctors by specialty
    const doctorsBySpecialty = {};
    doctorsList.forEach(doctor => {
      if (!doctorsBySpecialty[doctor.specialty]) {
        doctorsBySpecialty[doctor.specialty] = [];
      }
      doctorsBySpecialty[doctor.specialty].push(doctor);
    });

    console.log(`Distributing doctors by specialty: ${Object.keys(doctorsBySpecialty).length} unique specialties found.`);

    // Distribute doctors round-robin per specialty
    for (const [specialty, doctors] of Object.entries(doctorsBySpecialty)) {
      doctors.forEach((doctor, index) => {
        const targetHospitalIndex = index % hospitals.length;
        hospitals[targetHospitalIndex].doctors.push(doctor);
      });
    }

    // Save all hospitals
    for (let hospital of hospitals) {
      await hospital.save();
      console.log(`Saved ${hospital.doctors.length} doctors to ${hospital.name}`);
    }

    console.log('Migration Complete! All doctors successfully imported and distributed.');
    process.exit(0);

  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
};

importDoctors();
