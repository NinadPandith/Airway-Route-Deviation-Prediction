import axios from 'axios';

// Backend base URL (FastAPI default port 8000)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

/**
 * Fetch all flights with optional search string and status filter.
 */
export const getFlights = async (search = '', status = '') => {
  const params = {};
  if (search && search.trim()) params.search = search.trim();
  if (status && status !== 'all') params.status = status;

  const response = await apiClient.get('/flights', { params });
  return response.data;
};

/**
 * Fetch details for a specific flight by ID.
 */
export const getFlightById = async (id) => {
  const response = await apiClient.get(`/flights/${id}`);
  return response.data;
};

/**
 * Create a new flight record.
 */
export const createFlight = async (flightData) => {
  const response = await apiClient.post('/flights', flightData);
  return response.data;
};

/**
 * Update an existing flight record attributes.
 */
export const updateFlight = async (id, flightData) => {
  const response = await apiClient.put(`/flights/${id}`, flightData);
  return response.data;
};

/**
 * Delete a flight record by ID.
 */
export const deleteFlight = async (id) => {
  const response = await apiClient.delete(`/flights/${id}`);
  return response.data;
};

/**
 * Check backend health status.
 */
export const checkApiHealth = async () => {
  const response = await apiClient.get('/health');
  return response.data;
};

/**
 * Fetch the latest live aircraft telemetry snapshot.
 */
export const getLiveAircraft = async (refresh = true, signal) => {
  const response = await apiClient.get('/live-aircraft', { params: { refresh }, signal });
  return response.data;
};

/**
 * Fetch weather for a specific aircraft by ICAO24 code.
 */
export const getLiveWeather = async (icao24, signal) => {
  const response = await apiClient.get(`/live-weather/${encodeURIComponent(icao24)}`, { signal });
  return response.data;
};

/**
 * Fetch the summary statistics used by the live dashboard cards.
 */
export const getLiveDashboard = async (signal) => {
  const response = await apiClient.get('/live-dashboard', { signal });
  return response.data;
};

export const predictRouteDeviation = async (icao24, signal) => {
  const response = await apiClient.post('/predict', { aircraft_id: icao24 }, { signal });
  return response.data;
};

/**
 * Fetch historical aircraft telemetry records.
 */
export const getHistory = async (limit = 100) => {
  const response = await apiClient.get('/history', { params: { limit } });
  return response.data;
};

/**
 * Fetch historical aircraft telemetry records.
 */
export const getLiveRoute = async (callsign, signal) => {
  try {
    const response = await apiClient.get(`/route/${encodeURIComponent(callsign)}`, { signal });
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return { error: 'Route information unavailable' };
    }
    throw error;
  }
};
