/**
 * Location and travel time services for booking system
 */

// Business office location
export const BUSINESS_LOCATION = {
  address: '46 Monmouth Road, Monroe, NJ',
  latitude: 40.4208,
  longitude: -74.1908,
};

export interface Location {
  address: string;
  latitude: number;
  longitude: number;
}

/**
 * Calculate driving distance and time between two locations
 * Uses simple haversine formula + average speed assumption
 * For more accuracy, integrate OpenRouteService API
 */
export const calculateTravelTime = (
  from: Location,
  to: Location
): { distanceMiles: number; timeMinutes: number } => {
  // Haversine formula to calculate distance between two coordinates
  const R = 3959; // Earth's radius in miles
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.latitude * Math.PI) / 180) *
      Math.cos((to.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceMiles = R * c;

  // Average driving speed: 30 mph (accounts for city traffic, turns, stops)
  const averageSpeedMph = 30;
  const timeMinutes = Math.ceil((distanceMiles / averageSpeedMph) * 60);

  return { distanceMiles, timeMinutes };
};

/**
 * Geocode an address to coordinates
 * This uses a simple approach with nominatim (OpenStreetMap)
 * For production, consider using a proper geocoding service
 */
export const geocodeAddress = async (
  address: string
): Promise<Location | null> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
    );
    const data = await response.json();

    if (!data || data.length === 0) {
      return null;
    }

    return {
      address,
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
    };
  } catch (error) {
    console.error('[location] Geocoding error:', error);
    return null;
  }
};

/**
 * Validate address format (basic check)
 */
export const isValidAddress = (address: string): boolean => {
  return address && address.trim().length >= 10;
};

/**
 * Format distance and time for display
 */
export const formatTravelInfo = (
  distanceMiles: number,
  timeMinutes: number
): string => {
  return `${distanceMiles.toFixed(1)} mi, ~${timeMinutes} min`;
};
