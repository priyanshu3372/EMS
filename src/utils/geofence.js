// ─── Geofence & Location Utility ─────────────────────────────────────────────

const COMPANY_LOCATION_KEY = 'ems_company_location'

// Default Company Location (BKC, Mumbai)
export const DEFAULT_COMPANY_LOCATION = {
  name: 'BKC Main Office',
  address: '5th Floor, Infinity Tower, BKC, Mumbai, Maharashtra 400051',
  latitude: 19.0657,
  longitude: 72.8686,
  radiusKm: 1.0,
}

/**
 * Get current saved company location or default
 */
export function getCompanyLocation() {
  try {
    const saved = localStorage.getItem(COMPANY_LOCATION_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return {
        name: parsed.name || DEFAULT_COMPANY_LOCATION.name,
        address: parsed.address || DEFAULT_COMPANY_LOCATION.address,
        latitude: Number(parsed.latitude) || DEFAULT_COMPANY_LOCATION.latitude,
        longitude: Number(parsed.longitude) || DEFAULT_COMPANY_LOCATION.longitude,
        radiusKm: Number(parsed.radiusKm) || DEFAULT_COMPANY_LOCATION.radiusKm,
      }
    }
  } catch (err) {
    console.warn('Failed to load company location:', err)
  }
  return DEFAULT_COMPANY_LOCATION
}

/**
 * Save company location settings (Admin)
 */
export function saveCompanyLocation(config) {
  const updated = {
    name: config.name || DEFAULT_COMPANY_LOCATION.name,
    address: config.address || DEFAULT_COMPANY_LOCATION.address,
    latitude: Number(config.latitude),
    longitude: Number(config.longitude),
    radiusKm: Number(config.radiusKm) || 1.0,
    updatedAt: new Date().toISOString(),
  }
  localStorage.setItem(COMPANY_LOCATION_KEY, JSON.stringify(updated))
  return updated
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0

  const R = 6371 // Earth radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  return Math.round(distance * 1000) / 1000 // rounded to 3 decimal places (meters precision)
}

/**
 * Format distance in meters or kilometers for display
 */
export function formatDistance(distanceKm) {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000)
    return `${meters} meters`
  }
  return `${distanceKm.toFixed(2)} km`
}

/**
 * Evaluate if given GPS coordinates are within company geofence radius
 */
export function verifyGeofence(userLat, userLon, companyLocation = getCompanyLocation()) {
  const distanceKm = calculateDistance(
    userLat,
    userLon,
    companyLocation.latitude,
    companyLocation.longitude
  )
  const isInside = distanceKm <= companyLocation.radiusKm

  return {
    isInside,
    distanceKm,
    distanceMeters: Math.round(distanceKm * 1000),
    radiusKm: companyLocation.radiusKm,
    companyLocation,
    userCoords: { latitude: userLat, longitude: userLon },
  }
}
