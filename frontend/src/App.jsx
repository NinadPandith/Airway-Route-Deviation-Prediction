import React, { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import NotificationToast from './components/NotificationToast';

import Dashboard from './pages/Dashboard';
import ViewFlights from './pages/ViewFlights';
import AddFlight from './pages/AddFlight';
import EditFlight from './pages/EditFlight';
import LiveMonitoring from './pages/LiveMonitoring';
import SimulationMode from './pages/SimulationMode';
import { SimulationProvider } from './context/SimulationContext';


export default function App() {
  const [toast, setToast] = useState({ type: 'success', message: '' });
  const location = useLocation();
  const isLiveMonitoring = location.pathname === '/live-monitoring' || location.pathname === '/simulation';


  const showNotification = (type, message) => {
    setToast({ type, message });
  };

  const closeNotification = () => {
    setToast((prev) => ({ ...prev, message: '' }));
  };

  return (
    <SimulationProvider>
      <div className="min-h-screen text-dark flex flex-col font-sans overflow-hidden bg-bg-primary">
        {/* Top Header */}
        <Navbar />

        {/* Main Container */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Navigation */}
          <Sidebar />

          {/* Dynamic Page Content */}
          <main className={`flex-1 w-full flex flex-col ${isLiveMonitoring ? 'relative' : 'p-6 lg:p-8 max-w-7xl mx-auto overflow-x-hidden'}`}>
            <Routes>
              <Route path="/" element={<Dashboard showNotification={showNotification} />} />
              <Route path="/flights" element={<ViewFlights showNotification={showNotification} />} />
              <Route path="/add-flight" element={<AddFlight showNotification={showNotification} />} />
              <Route path="/edit-flight/:id" element={<EditFlight showNotification={showNotification} />} />
              <Route path="/live-monitoring" element={<LiveMonitoring showNotification={showNotification} />} />
              <Route path="/simulation" element={<SimulationMode showNotification={showNotification} />} />
            </Routes>
          </main>
        </div>

        {/* Global Notification Toast */}
        <NotificationToast
          type={toast.type}
          message={toast.message}
          onClose={closeNotification}
        />
      </div>
    </SimulationProvider>
  );
}
