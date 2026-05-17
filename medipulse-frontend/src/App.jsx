import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import CitizenView from './pages/CitizenView';
import HospitalPortal from './pages/HospitalPortal';

import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import { AuthProvider } from './context/AuthContext';

import ProtectedAccessRoute from './components/ProtectedAccessRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Navbar />
          <main className="container">
            <Routes>
              <Route path="/" element={<CitizenView />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/dashboard" element={
                <ProtectedAccessRoute type="Authority">
                  <Dashboard />
                </ProtectedAccessRoute>
              } />
              <Route path="/hospital" element={
                <ProtectedAccessRoute type="Hospital">
                  <HospitalPortal />
                </ProtectedAccessRoute>
              } />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
