import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Edit, ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react';
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
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold font-heading text-white flex items-center gap-2">
            <Edit className="w-6 h-6 text-cyan-400" /> Edit Flight #{id}
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Update real-time coordinates, speed, altitude, or route status.
          </p>
        </div>

        <Link
          to="/flights"
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to List</span>
        </Link>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-6">
        {/* Section 1: Identification */}
        <div className="space-y-4">
          <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-cyan-400 border-b border-slate-800 pb-2">
            1. Flight Identification
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-300 mb-1.5 font-medium">Flight Number *</label>
              <input
                type="text"
                name="flight_number"
                value={formData.flight_number}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
              {errors.flight_number && <p className="text-[11px] text-rose-400 mt-1">{errors.flight_number}</p>}
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1.5 font-medium">Aircraft Model / Name *</label>
              <input
                type="text"
                name="aircraft_name"
                value={formData.aircraft_name}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
              {errors.aircraft_name && <p className="text-[11px] text-rose-400 mt-1">{errors.aircraft_name}</p>}
            </div>
          </div>
        </div>

        {/* Section 2: Route Terminals */}
        <div className="space-y-4">
          <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-cyan-400 border-b border-slate-800 pb-2">
            2. Route Terminals
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-300 mb-1.5 font-medium">Origin Airport *</label>
              <input
                type="text"
                name="origin"
                value={formData.origin}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
              {errors.origin && <p className="text-[11px] text-rose-400 mt-1">{errors.origin}</p>}
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1.5 font-medium">Destination Airport *</label>
              <input
                type="text"
                name="destination"
                value={formData.destination}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
              {errors.destination && <p className="text-[11px] text-rose-400 mt-1">{errors.destination}</p>}
            </div>
          </div>
        </div>

        {/* Section 3: Telemetry Coordinates & Metrics */}
        <div className="space-y-4">
          <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-cyan-400 border-b border-slate-800 pb-2">
            3. Telemetry Coordinates & Performance Metrics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-300 mb-1.5 font-medium">Latitude (-90 to 90) *</label>
              <input
                type="number"
                step="any"
                name="latitude"
                value={formData.latitude}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
              {errors.latitude && <p className="text-[11px] text-rose-400 mt-1">{errors.latitude}</p>}
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1.5 font-medium">Longitude (-180 to 180) *</label>
              <input
                type="number"
                step="any"
                name="longitude"
                value={formData.longitude}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
              {errors.longitude && <p className="text-[11px] text-rose-400 mt-1">{errors.longitude}</p>}
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1.5 font-medium">Altitude (Feet) *</label>
              <input
                type="number"
                name="altitude"
                value={formData.altitude}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
              {errors.altitude && <p className="text-[11px] text-rose-400 mt-1">{errors.altitude}</p>}
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1.5 font-medium">Speed (Knots) *</label>
              <input
                type="number"
                step="any"
                name="speed"
                value={formData.speed}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
              {errors.speed && <p className="text-[11px] text-rose-400 mt-1">{errors.speed}</p>}
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1.5 font-medium">Heading (0 - 360°) *</label>
              <input
                type="number"
                step="any"
                name="heading"
                value={formData.heading}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
              {errors.heading && <p className="text-[11px] text-rose-400 mt-1">{errors.heading}</p>}
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1.5 font-medium">Flight Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
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
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <Link
            to="/flights"
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving...' : 'Update Flight'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
