import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  PlusCircle,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Plane,
  MapPin,
  Gauge,
  Navigation,
  Sparkles
} from 'lucide-react';
import { createFlight } from '../services/api';

const PRESET_ROUTES = [
  {
    name: 'DEL → LHR (Dreamliner)',
    data: {
      flight_number: 'AI-202',
      aircraft_name: 'Boeing 787-9 Dreamliner',
      latitude: 28.5562,
      longitude: 77.1000,
      altitude: 35000,
      speed: 485,
      heading: 120,
      origin: 'DEL (Delhi)',
      destination: 'LHR (London Heathrow)',
      status: 'In Flight'
    }
  },
  {
    name: 'JFK → LAX (Transcontinental)',
    data: {
      flight_number: 'AA-300',
      aircraft_name: 'Airbus A321neo',
      latitude: 40.6413,
      longitude: -73.7781,
      altitude: 32000,
      speed: 460,
      heading: 260,
      origin: 'JFK (New York)',
      destination: 'LAX (Los Angeles)',
      status: 'In Flight'
    }
  },
  {
    name: 'DXB → BOM (Emirates)',
    data: {
      flight_number: 'EK-505',
      aircraft_name: 'Airbus A380-800',
      latitude: 25.2532,
      longitude: 55.3657,
      altitude: 38000,
      speed: 510,
      heading: 95,
      origin: 'DXB (Dubai)',
      destination: 'BOM (Mumbai)',
      status: 'Deviated'
    }
  }
];

export default function AddFlight({ showNotification }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    flight_number: '',
    aircraft_name: '',
    latitude: '',
    longitude: '',
    altitude: '',
    speed: '',
    heading: '',
    origin: '',
    destination: '',
    status: 'In Flight'
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const errs = {};
    if (!formData.flight_number.trim()) errs.flight_number = 'Flight number is required.';
    if (!formData.aircraft_name.trim()) errs.aircraft_name = 'Aircraft name is required.';
    if (!formData.origin.trim()) errs.origin = 'Origin airport is required.';
    if (!formData.destination.trim()) errs.destination = 'Destination airport is required.';

    const lat = parseFloat(formData.latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) errs.latitude = 'Latitude must be between -90 and 90.';

    const lon = parseFloat(formData.longitude);
    if (isNaN(lon) || lon < -180 || lon > 180) errs.longitude = 'Longitude must be between -180 and 180.';

    const alt = parseFloat(formData.altitude);
    if (isNaN(alt) || alt < 0) errs.altitude = 'Altitude must be >= 0.';

    const spd = parseFloat(formData.speed);
    if (isNaN(spd) || spd < 0) errs.speed = 'Speed must be >= 0.';

    const hdg = parseFloat(formData.heading);
    if (isNaN(hdg) || hdg < 0 || hdg > 360) errs.heading = 'Heading must be between 0 and 360.';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleApplyPreset = (presetData) => {
    setFormData(presetData);
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        altitude: parseFloat(formData.altitude),
        speed: parseFloat(formData.speed),
        heading: parseFloat(formData.heading)
      };

      await createFlight(payload);
      if (showNotification) {
        showNotification('success', `Flight ${formData.flight_number} created successfully!`);
      }
      navigate('/flights');
    } catch (err) {
      console.error('Create flight error:', err);
      if (showNotification) {
        showNotification('error', err.response?.data?.detail || 'Failed to create flight record.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-5 border-b border-slate-700/50">
        <div>
          <h2 className="text-2xl font-extrabold font-heading text-white flex items-center gap-3">
            <PlusCircle className="w-7 h-7 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" /> Add New Flight
          </h2>
          <p className="text-slate-400 text-xs mt-1.5 font-medium tracking-wide">
            Register a new airway route telemetry record in airway.db.
          </p>
        </div>

        <Link
          to="/flights"
          className="flex items-center gap-2 text-xs font-bold tracking-wide text-slate-400 hover:text-cyan-400 px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-cyan-500/10 border border-slate-700/50 hover:border-cyan-500/30 transition-all shadow-lg hover:shadow-cyan-500/20"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to List</span>
        </Link>
      </div>

      {/* Preset Buttons Bar */}
      <div className="p-5 rounded-2xl glass-panel border border-slate-700/50 space-y-3 shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent pointer-events-none"></div>
        <div className="flex items-center gap-2.5 text-[10px] font-bold text-cyan-400 uppercase font-mono tracking-widest relative z-10">
          <Sparkles className="w-4 h-4 drop-shadow-[0_0_5px_rgba(34,211,238,0.6)]" /> Quick Route Presets
        </div>
        <div className="flex flex-wrap gap-3 relative z-10">
          {PRESET_ROUTES.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(p.data)}
              className="px-4 py-2 rounded-xl bg-slate-900/80 hover:bg-cyan-500/20 border border-slate-700/50 hover:border-cyan-400/50 text-xs font-bold text-slate-300 hover:text-cyan-300 transition-all font-mono tracking-wide shadow-inner hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:scale-105"
            >
              + {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Form Card */}
      <form onSubmit={handleSubmit} className="p-8 rounded-2xl glass-panel border border-slate-700/50 space-y-8 shadow-2xl relative">
        {/* Section 1: Identification */}
        <div className="space-y-5">
          <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400 border-b border-slate-700/50 pb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-cyan-500/20 flex items-center justify-center text-cyan-300">1</span> Flight Identification
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-2 font-bold font-mono">Flight Number *</label>
              <input
                type="text"
                name="flight_number"
                value={formData.flight_number}
                onChange={handleChange}
                placeholder="e.g. AI-202"
                className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 font-mono shadow-inner transition-all"
              />
              {errors.flight_number && <p className="text-[10px] text-rose-400 font-mono mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.flight_number}</p>}
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-2 font-bold font-mono">Aircraft Model / Name *</label>
              <input
                type="text"
                name="aircraft_name"
                value={formData.aircraft_name}
                onChange={handleChange}
                placeholder="e.g. Boeing 787-9 Dreamliner"
                className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 shadow-inner transition-all"
              />
              {errors.aircraft_name && <p className="text-[10px] text-rose-400 font-mono mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.aircraft_name}</p>}
            </div>
          </div>
        </div>

        {/* Section 2: Route Terminals */}
        <div className="space-y-5">
          <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400 border-b border-slate-700/50 pb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-cyan-500/20 flex items-center justify-center text-cyan-300">2</span> Route Terminals
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-2 font-bold font-mono">Origin Airport *</label>
              <input
                type="text"
                name="origin"
                value={formData.origin}
                onChange={handleChange}
                placeholder="e.g. DEL (Indira Gandhi Intl)"
                className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 shadow-inner transition-all"
              />
              {errors.origin && <p className="text-[10px] text-rose-400 font-mono mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.origin}</p>}
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-2 font-bold font-mono">Destination Airport *</label>
              <input
                type="text"
                name="destination"
                value={formData.destination}
                onChange={handleChange}
                placeholder="e.g. LHR (London Heathrow)"
                className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 shadow-inner transition-all"
              />
              {errors.destination && <p className="text-[10px] text-rose-400 font-mono mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.destination}</p>}
            </div>
          </div>
        </div>

        {/* Section 3: Telemetry Coordinates & Metrics */}
        <div className="space-y-5">
          <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400 border-b border-slate-700/50 pb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-cyan-500/20 flex items-center justify-center text-cyan-300">3</span> Telemetry Coordinates & Performance Metrics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-2 font-bold font-mono">Latitude (-90 to 90) *</label>
              <input
                type="number"
                step="any"
                name="latitude"
                value={formData.latitude}
                onChange={handleChange}
                placeholder="28.5562"
                className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 font-mono shadow-inner transition-all"
              />
              {errors.latitude && <p className="text-[10px] text-rose-400 font-mono mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.latitude}</p>}
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-2 font-bold font-mono">Longitude (-180 to 180) *</label>
              <input
                type="number"
                step="any"
                name="longitude"
                value={formData.longitude}
                onChange={handleChange}
                placeholder="77.1000"
                className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 font-mono shadow-inner transition-all"
              />
              {errors.longitude && <p className="text-[10px] text-rose-400 font-mono mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.longitude}</p>}
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-2 font-bold font-mono">Altitude (Feet) *</label>
              <input
                type="number"
                name="altitude"
                value={formData.altitude}
                onChange={handleChange}
                placeholder="35000"
                className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 font-mono shadow-inner transition-all"
              />
              {errors.altitude && <p className="text-[10px] text-rose-400 font-mono mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.altitude}</p>}
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-2 font-bold font-mono">Speed (Knots) *</label>
              <input
                type="number"
                step="any"
                name="speed"
                value={formData.speed}
                onChange={handleChange}
                placeholder="485"
                className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 font-mono shadow-inner transition-all"
              />
              {errors.speed && <p className="text-[10px] text-rose-400 font-mono mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.speed}</p>}
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-2 font-bold font-mono">Heading (0 - 360°) *</label>
              <input
                type="number"
                step="any"
                name="heading"
                value={formData.heading}
                onChange={handleChange}
                placeholder="120"
                className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 font-mono shadow-inner transition-all"
              />
              {errors.heading && <p className="text-[10px] text-rose-400 font-mono mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.heading}</p>}
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-2 font-bold font-mono">Initial Flight Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-xs text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 font-mono cursor-pointer shadow-inner transition-all"
              >
                <option value="In Flight">In Flight</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Delayed">Delayed</option>
                <option value="Deviated">Deviated</option>
                <option value="Landed">Landed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end gap-4 pt-6 border-t border-slate-700/50">
          <Link
            to="/flights"
            className="px-6 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/50 text-xs font-bold text-slate-300 transition-all shadow-lg"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold tracking-wide shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all disabled:opacity-50 hover:scale-105"
          >
            {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{isSubmitting ? 'Creating Record...' : 'Save Flight Record'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
