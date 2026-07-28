import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Search,
  Filter,
  Trash2,
  Edit,
  Eye,
  PlusCircle,
  RefreshCw,
  Compass,
  MapPin,
  Gauge,
  Navigation,
  X
} from 'lucide-react';
import { getFlights, deleteFlight } from '../services/api';
import { StatusBadge } from './Dashboard';

export default function ViewFlights({ showNotification }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal inspection state
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchFlightsData = async () => {
    setLoading(true);
    try {
      const data = await getFlights(search, statusFilter);
      setFlights(data);
    } catch (err) {
      console.error('Failed to fetch flights:', err);
      if (showNotification) {
        showNotification('error', 'Error loading flights from server.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlightsData();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchParams({ search });
    fetchFlightsData();
  };

  const handleDelete = async (id) => {
    setIsDeleting(true);
    try {
      await deleteFlight(id);
      if (showNotification) {
        showNotification('success', `Flight #${id} deleted successfully.`);
      }
      setDeleteConfirmId(null);
      fetchFlightsData();
    } catch (err) {
      console.error('Delete flight error:', err);
      if (showNotification) {
        showNotification('error', 'Failed to delete flight.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold font-heading text-white flex items-center gap-2">
            <Compass className="w-6 h-6 text-cyan-400" /> Flight Telemetry Registry
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Browse, search, edit, and manage all registered airway flights.
          </p>
        </div>

        <Link
          to="/add-flight"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add New Flight</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl glass-card border border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search Input Form */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-auto flex-1 max-w-lg">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by flight number, aircraft, origin, or destination..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors"
          >
            Search
          </button>
        </form>

        {/* Filter Dropdown & Refresh */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="all">All Statuses</option>
              <option value="In Flight">In Flight</option>
              <option value="Deviated">Deviated</option>
              <option value="Delayed">Delayed</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Landed">Landed</option>
            </select>
          </div>

          <button
            onClick={fetchFlightsData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Flight Table */}
      <div className="rounded-2xl glass-card border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-500 text-xs font-mono animate-pulse">
            Fetching flight records from database...
          </div>
        ) : flights.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <Compass className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-slate-300 font-medium text-sm">No matching flights found.</p>
            <p className="text-slate-500 text-xs">Try adjusting your search keywords or status filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Flight #</th>
                  <th className="py-3 px-4">Aircraft</th>
                  <th className="py-3 px-4">Coordinates (Lat / Lon)</th>
                  <th className="py-3 px-4">Altitude / Speed</th>
                  <th className="py-3 px-4">Heading</th>
                  <th className="py-3 px-4">Route</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {flights.map((flight) => (
                  <tr key={flight.id} className="hover:bg-slate-900/50 transition-colors group">
                    <td className="py-3.5 px-4 font-bold text-white">
                      {flight.flight_number}
                    </td>
                    <td className="py-3.5 px-4 font-sans text-slate-300">
                      {flight.aircraft_name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {flight.latitude.toFixed(4)}°, {flight.longitude.toFixed(4)}°
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div><span className="text-cyan-400">{flight.altitude.toLocaleString()}</span> ft</div>
                      <div className="text-[11px] text-slate-400">{flight.speed} kts</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {flight.heading}°
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      <div className="text-cyan-400 font-medium">{flight.origin}</div>
                      <div className="text-slate-400 text-[11px]">→ {flight.destination}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={flight.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Inspect Button */}
                        <button
                          onClick={() => setSelectedFlight(flight)}
                          title="Inspect Details"
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-cyan-950 text-slate-400 hover:text-cyan-400 border border-slate-800 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => navigate(`/edit-flight/${flight.id}`)}
                          title="Edit Flight"
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-blue-950 text-slate-400 hover:text-blue-400 border border-slate-800 transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => setDeleteConfirmId(flight.id)}
                          title="Delete Flight"
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Flight Inspector Modal */}
      {selectedFlight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl glass-panel border border-cyan-500/30 p-6 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-heading text-white">
                    Flight #{selectedFlight.flight_number}
                  </h3>
                  <p className="text-xs text-slate-400">{selectedFlight.aircraft_name}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedFlight(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-slate-500 block mb-1">Status</span>
                <StatusBadge status={selectedFlight.status} />
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-slate-500 block mb-1">Heading</span>
                <span className="text-cyan-400 font-bold text-sm">{selectedFlight.heading}°</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-slate-500 block mb-1">Altitude</span>
                <span className="text-white font-bold text-sm">{selectedFlight.altitude.toLocaleString()} ft</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-slate-500 block mb-1">Speed</span>
                <span className="text-white font-bold text-sm">{selectedFlight.speed} kts</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 col-span-2">
                <span className="text-slate-500 block mb-1">Coordinates</span>
                <span className="text-emerald-400 font-bold">
                  Latitude: {selectedFlight.latitude} | Longitude: {selectedFlight.longitude}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 col-span-2">
                <span className="text-slate-500 block mb-1">Route</span>
                <span className="text-slate-200">
                  {selectedFlight.origin} → {selectedFlight.destination}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  const id = selectedFlight.id;
                  setSelectedFlight(null);
                  navigate(`/edit-flight/${id}`);
                }}
                className="px-4 py-2 rounded-xl bg-cyan-600 text-white text-xs font-semibold"
              >
                Edit Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl glass-panel border border-rose-500/30 p-6 space-y-4">
            <h3 className="text-base font-bold font-heading text-white">Confirm Delete</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete flight #{deleteConfirmId}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                {isDeleting ? 'Deleting...' : 'Delete Flight'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
