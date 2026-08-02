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
  X,
  AlertTriangle
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-bg-secondary">
        <div>
          <h2 className="text-2xl font-extrabold font-heading text-dark flex items-center gap-3">
            <Compass className="w-7 h-7 text-primary" />
            Active Route Database
          </h2>
          <p className="text-dark/80 text-sm mt-1.5 font-light tracking-wide">
            Browse, search, edit, and manage all registered airway flights.
          </p>
        </div>

        <Link
          to="/add-flight"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:brightness-90 text-white text-xs font-bold tracking-wide shadow-md transition-all self-start sm:self-auto hover:scale-105"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add New Flight</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl glass-panel border border-bg-secondary flex flex-col md:flex-row gap-5 justify-between items-center shadow-lg">
        {/* Search Input Form */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-3 w-full md:w-auto flex-1 max-w-lg">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-4 top-3 text-dark/60" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by flight number, aircraft, origin, or destination..."
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-bg-primary border border-bg-secondary text-xs text-dark placeholder-dark/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all shadow-inner"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-primary hover:brightness-90 text-white text-xs font-bold tracking-wide transition-colors shadow-md hover:shadow-lg"
          >
            Search
          </button>
        </form>

        {/* Filter Dropdown & Refresh */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2.5 text-xs text-dark/80 font-bold uppercase tracking-widest font-mono">
            <Filter className="w-4 h-4 text-primary" />
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-bg-primary border border-bg-secondary text-xs font-mono font-medium text-dark focus:outline-none focus:border-primary cursor-pointer shadow-inner"
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
            className="p-3 rounded-xl glass-panel text-dark/70 hover:text-primary hover:border-primary/30 transition-all tooltip-trigger shadow-lg hover:shadow-lg disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      {/* Flight Table */}
      <div className="rounded-2xl glass-panel shadow-lg overflow-hidden">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4">
            <Compass className="w-12 h-12 text-primary animate-spin-slow" />
            <div className="text-primary text-xs font-mono font-bold tracking-widest animate-pulse">FETCHING TELEMETRY RECORDS...</div>
          </div>
        ) : flights.length === 0 ? (
          <div className="py-24 text-center space-y-4">
            <Compass className="w-12 h-12 text-dark/40 mx-auto" />
            <p className="text-dark font-bold text-sm">No matching flights found.</p>
            <p className="text-dark/70 text-xs font-mono">Try adjusting your search keywords or status filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs text-dark">
              <thead className="bg-bg-secondary/50 text-dark/80 uppercase font-mono font-bold text-[10px] tracking-widest border-b border-bg-secondary backdrop-blur-md">
                <tr>
                  <th className="py-4 px-5">Flight #</th>
                  <th className="py-4 px-5">Aircraft</th>
                  <th className="py-4 px-5">Coordinates (Lat / Lon)</th>
                  <th className="py-4 px-5">Altitude / Speed</th>
                  <th className="py-4 px-5">Heading</th>
                  <th className="py-4 px-5">Route</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bg-secondary font-mono">
                {flights.map((flight) => (
                  <tr key={flight.id} className="hover:bg-bg-secondary/30 transition-colors group">
                    <td className="py-4 px-5 font-bold text-dark tracking-wide">
                      {flight.flight_number}
                    </td>
                    <td className="py-4 px-5 font-sans font-medium text-dark/80">
                      {flight.aircraft_name}
                    </td>
                    <td className="py-4 px-5 text-dark">
                      {flight.latitude.toFixed(4)}°, {flight.longitude.toFixed(4)}°
                    </td>
                    <td className="py-4 px-5 text-dark">
                      <div><span className="text-dark font-bold">{flight.altitude.toLocaleString()}</span> ft</div>
                      <div className="text-[11px] text-dark/60 mt-0.5">{flight.speed} kts</div>
                    </td>
                    <td className="py-4 px-5 text-dark font-medium">
                      {flight.heading}°
                    </td>
                    <td className="py-4 px-5 font-sans">
                      <div className="text-primary font-bold">{flight.origin}</div>
                      <div className="text-secondary text-[11px] font-mono mt-0.5 font-bold">→ {flight.destination}</div>
                    </td>
                    <td className="py-4 px-5">
                      <StatusBadge status={flight.status} />
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        {/* Inspect Button */}
                        <button
                          onClick={() => setSelectedFlight(flight)}
                          title="Inspect Details"
                          className="p-2 rounded-xl bg-bg-primary hover:bg-bg-secondary text-dark/60 hover:text-primary border border-bg-secondary hover:border-primary/30 transition-all hover:scale-105"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => navigate(`/edit-flight/${flight.id}`)}
                          title="Edit Flight"
                          className="p-2 rounded-xl bg-bg-primary hover:bg-secondary/20 text-dark/60 hover:text-dark border border-bg-secondary hover:border-secondary/50 transition-all hover:scale-105"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => setDeleteConfirmId(flight.id)}
                          title="Delete Flight"
                          className="p-2 rounded-xl bg-bg-primary hover:bg-red-500/10 text-dark/60 hover:text-red-600 border border-bg-secondary hover:border-red-500/30 transition-all hover:scale-105"
                        >
                          <Trash2 className="w-4 h-4" />
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
      {/* Flight Inspector Modal */}
      {selectedFlight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-3xl glass-panel border border-primary/30 p-8 space-y-6 animate-scale-up shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none"></div>
            
            <div className="relative z-10 flex items-center justify-between pb-5 border-b border-bg-secondary">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/30 shadow-inner">
                  <Compass className="w-6 h-6 animate-spin-slow" />
                </div>
                <div>
                  <div className="text-[10px] text-dark/60 font-mono font-bold tracking-widest uppercase mb-1">Flight Telemetry</div>
                  <h3 className="text-2xl font-extrabold font-heading text-dark tracking-wide">
                    {selectedFlight.flight_number}
                  </h3>
                  <p className="text-xs text-dark/80 font-medium">{selectedFlight.aircraft_name}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedFlight(null)}
                className="p-2.5 rounded-full text-dark/60 hover:text-dark hover:bg-black/5 transition-all hover:rotate-90"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative z-10 grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-4 rounded-2xl bg-bg-primary border border-bg-secondary shadow-inner flex flex-col justify-center">
                <span className="text-dark/60 block mb-2 font-bold tracking-widest uppercase text-[10px]">Current Status</span>
                <div><StatusBadge status={selectedFlight.status} /></div>
              </div>
              <div className="p-4 rounded-2xl bg-bg-primary border border-bg-secondary shadow-inner flex flex-col justify-center">
                <span className="text-dark/60 block mb-2 font-bold tracking-widest uppercase text-[10px]">Heading</span>
                <span className="text-primary font-extrabold text-lg drop-shadow-sm">{selectedFlight.heading}°</span>
              </div>
              <div className="p-4 rounded-2xl bg-bg-primary border border-bg-secondary shadow-inner flex flex-col justify-center">
                <span className="text-dark/60 block mb-2 font-bold tracking-widest uppercase text-[10px]">Altitude</span>
                <span className="text-dark font-extrabold text-lg">{selectedFlight.altitude.toLocaleString()} <span className="text-dark/60 text-xs">ft</span></span>
              </div>
              <div className="p-4 rounded-2xl bg-bg-primary border border-bg-secondary shadow-inner flex flex-col justify-center">
                <span className="text-dark/60 block mb-2 font-bold tracking-widest uppercase text-[10px]">Velocity</span>
                <span className="text-dark font-extrabold text-lg">{selectedFlight.speed} <span className="text-dark/60 text-xs">kts</span></span>
              </div>
              <div className="p-4 rounded-2xl bg-bg-primary border border-bg-secondary shadow-inner col-span-2 flex flex-col justify-center">
                <span className="text-dark/60 block mb-2 font-bold tracking-widest uppercase text-[10px]">GPS Coordinates</span>
                <span className="text-primary font-extrabold text-base tracking-wide">
                  {selectedFlight.latitude} <span className="text-dark/40 mx-2">|</span> {selectedFlight.longitude}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-bg-primary border border-bg-secondary shadow-inner col-span-2 flex flex-col justify-center">
                <span className="text-dark/60 block mb-2 font-bold tracking-widest uppercase text-[10px]">Flight Route</span>
                <span className="text-dark font-bold text-base tracking-wide flex items-center gap-3">
                  {selectedFlight.origin} <span className="text-dark/50">→</span> {selectedFlight.destination}
                </span>
              </div>
            </div>

            <div className="relative z-10 flex justify-end gap-4 pt-5 border-t border-bg-secondary">
              <button
                onClick={() => {
                  const id = selectedFlight.id;
                  setSelectedFlight(null);
                  navigate(`/edit-flight/${id}`);
                }}
                className="px-6 py-2.5 rounded-xl bg-primary hover:brightness-90 text-white text-xs font-bold tracking-wide transition-all shadow-lg hover:scale-105"
              >
                Edit Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl glass-panel border border-red-500/30 p-8 space-y-5 animate-scale-up shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none"></div>
            
            <h3 className="relative z-10 text-xl font-extrabold font-heading text-dark flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500" /> Confirm Deletion
            </h3>
            <p className="relative z-10 text-sm text-dark/80 leading-relaxed">
              Are you sure you want to permanently delete flight <span className="text-dark font-bold font-mono">#{deleteConfirmId}</span>? This action cannot be undone.
            </p>
            <div className="relative z-10 flex justify-end gap-3 pt-5 border-t border-bg-secondary">
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-bg-secondary hover:brightness-90 text-dark text-xs font-bold tracking-wide transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold tracking-wide shadow-lg transition-all flex items-center gap-2"
              >
                {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {isDeleting ? 'Deleting...' : 'Delete Flight'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
