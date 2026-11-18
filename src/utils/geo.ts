import { Store } from '../types';
import { PHYSICAL_STORES } from '../data/stores';

/**
 * Calculates great-circle distance between two points using the Haversine formula
 * Returns distance in kilometers (km) rounded to 1 decimal place.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export interface StoreDistanceResult {
  store: Store;
  distanceKm: number;
  isWithinRadius: boolean;
}

/**
 * Evaluates all physical retail stores against user coordinates,
 * identifies the closest store, and determines if it qualifies under the 4km delivery radius.
 */
export function findNearestStore(
  userLat: number,
  userLon: number,
  maxRadiusKm = 4.0
): {
  nearestStore: Store | null;
  distanceKm: number | null;
  isWithinRange: boolean;
  rankedStores: StoreDistanceResult[];
} {
  if (!PHYSICAL_STORES.length) {
    return { nearestStore: null, distanceKm: null, isWithinRange: false, rankedStores: [] };
  }

  const rankedStores: StoreDistanceResult[] = PHYSICAL_STORES.map((store) => {
    const dist = calculateHaversineDistanceKm(userLat, userLon, store.latitude, store.longitude);
    return {
      store,
      distanceKm: dist,
      isWithinRadius: dist <= maxRadiusKm,
    };
  }).sort((a, b) => a.distanceKm - b.distanceKm);

  const closest = rankedStores[0];

  return {
    nearestStore: closest.store,
    distanceKm: closest.distanceKm,
    isWithinRange: closest.distanceKm <= maxRadiusKm,
    rankedStores,
  };
}
