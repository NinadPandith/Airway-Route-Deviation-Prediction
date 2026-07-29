import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Edit, ArrowLeft, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
import { getFlightById, updateFlight } from '../services/api';

export default function EditFlight({ showNotification }) {
  const { id } = useParams();
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

  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchFlight = async () => {
      setLoading(true);
      try {
        const data = await getFlightById(id);
        setFormData({
          flight_number: data.flight_number || '',
          aircraft_name: data.aircraft_name || '',
          latitude: data.latitude !== undefined ? data.latitude : '',
          longitude: data.longitude !== undefined ? data.longitude : '',
          altitude: data.altitude !== undefined ? data.altitude : '',
          speed: data.speed !== undefined ? data.speed : '',
          heading: data.heading !== undefined ? data.heading : '',
          origin: data.origin || '',
          destination: data.destination || '',
          status: data.status || 'In Flight'
        });
      } catch (err) {
        console.error('Fetch flight error:', err);
        if (showNotification) {
          showNotification('error', `Failed to load flight #${id}.`);
        }
        navigate('/flights');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchFlight();
  }, [id, navigate]);

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

      await updateFlight(id, payload);
      if (showNotification) {
        showNotification('success', `Flight #${id} updated successfully!`);
      }
      navigate('/flights');
    } catch (err) {
      console.error('Update flight error:', err);
      if (showNotification) {
        showNotification('error', err.response?.data?.detail || 'Failed to update flight record.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
        <p className="text-slate-400 text-xs font-mono">Loading flight details for #{id}...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-5 border-b border-slate-700/50">
        <div>
          <h2 className="text-2xl font-extrabold font-heading text-white flex items-center gap-3">
            <Edit className="w-7 h-7 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" /> Edit Flight #{id}
          </h2>
          <p className="text-slate-400 text-xs mt-1.5 font-medium tracking-wide">
            Update real-time coordinates, speed, altitude, or route status.
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

      {/* Main Form */}
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
                className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 font-mono shadow-inner transition-all"
              />
              {errors.heading && <p className="text-[10px] text-rose-400 font-mono mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errors.heading}</p>}
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-2 font-bold font-mono">Flight Status</label>
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
            <span>{isSubmitting ? 'Saving...' : 'Update Flight'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
