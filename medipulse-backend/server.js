require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Make io accessible to routers
app.set('io', io);

// Database Connection
const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/medipulse';
    await mongoose.connect(uri);
    console.log(`MongoDB Connected successfully to: ${uri}`);
    
    // Auto-seed real database ONLY if it's completely empty
    const Hospital = require('./models/Hospital');
    const count = await Hospital.countDocuments();
    if(count === 0) {
      console.log('No hospitals found in database. Please run import scripts.');
      // Auto-seeding disabled for new migration
    } else {
      // Migrate existing hospitals to include doctors if they don't have any
      const hospitalsWithoutDoctors = await Hospital.find({ doctors: { $exists: true, $size: 0 } });
      if (hospitalsWithoutDoctors.length > 0) {
        console.log('Migrating existing hospitals to include doctors...');
        for (let h of hospitalsWithoutDoctors) {
          h.doctors = [
            { name: 'Dr. Sarah Connor', specialty: 'Cardiology', isAvailable: true },
            { name: 'Dr. John Smith', specialty: 'Emergency Care', isAvailable: true },
            { name: 'Dr. Emily Chen', specialty: 'Pediatrics', isAvailable: true }
          ];
          await h.save();
        }
        console.log('Doctors migrated successfully.');
      }
    }
  } catch (err) {
    console.error('Failed to connect to MongoDB!');
    console.error('Make sure your local MongoDB server is running (e.g. via MongoDB Compass or mongod).');
    console.error(`Error details: ${err.message}`);
    process.exit(1); // Exit process with failure
  }
};
connectDB();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/hospitals', require('./routes/hospitals'));
app.use('/api/surveillance', require('./routes/surveillance'));
app.use('/api/appointments', require('./routes/appointments'));

// Socket.io Connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Clients can join rooms based on roles or hospital IDs
  socket.on('joinRoom', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
