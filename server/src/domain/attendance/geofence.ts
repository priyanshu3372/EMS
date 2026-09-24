/**
 * Is this person at the office?
 *
 * Pure geometry and one decision rule. No request, no database, no GPS — the
 * reading is passed in, which is what lets every borderline case be tested
 * without standing in a car park.
 */

const EARTH_RADIUS_METRES = 6_371_008.8

export interface Coordinates {
  latitude: number
  longitude: number
}

export interface Reading extends Coordinates {
  /**
   * The browser's own estimate of how wrong it might be, in metres.
   *
   * This is the number everybody ignores, and ignoring it is what makes a 20 m
   * geofence unusable. A phone saying "I am here, give or take 60 metres" has
   * not located anybody.
   */
  accuracyMeters: number
}

export interface Fence extends Coordinates {
  radiusMeters: number
  /** A reading vaguer than this decides nothing and is refused as unusable. */
  maxAccuracyMeters: number
}

/**
 * Great-circle distance in metres.
 *
 * Haversine rather than a flat-earth approximation. At these distances the
 * difference is centimetres and either would do — but the flat version needs a
 * cos(latitude) correction that is easy to forget, and forgetting it makes
 * east-west distances wrong by a factor that grows with latitude. The correct
 * formula costs nothing here.
 */
export function distanceMeters(a: Coordinates, b: Coordinates): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180

  const lat1 = toRadians(a.latitude)
  const lat2 = toRadians(b.latitude)
  const deltaLat = toRadians(b.latitude - a.latitude)
  const deltaLon = toRadians(b.longitude - a.longitude)

  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2

  return Math.round(2 * EARTH_RADIUS_METRES * Math.asin(Math.min(1, Math.sqrt(h))))
}

export type GeofenceVerdict =
  /** Inside the fence, and the reading was precise enough to say so. */
  | { result: 'inside'; distanceMeters: number; accuracyMeters: number }
  /** Outside the fence, and the reading was precise enough to say so. */
  | { result: 'outside'; distanceMeters: number; accuracyMeters: number }
  /** The reading is too vague to decide either way. */
  | { result: 'unreliable'; distanceMeters: number; accuracyMeters: number }

/**
 * THREE ANSWERS, NOT TWO.
 *
 * The client wants a 15–30 m fence, which is tighter than a phone can always
 * resolve. Against a 20 m radius, a reading of "25 m away, give or take 40"
 * tells you nothing: the person could be at their desk or across the road.
 *
 * Both of the usual ways to collapse that into a yes/no are wrong:
 *
 *   treat it as inside   anyone can punch in from the car park on a cloudy day
 *   treat it as outside  staff at their own desks are locked out
 *
 * So a reading vaguer than `maxAccuracyMeters` is `unreliable` — neither
 * accepted nor refused. The caller asks the person to move near a window and
 * try again. Saying "I cannot tell" is the only honest answer when the error
 * bar is wider than the thing being measured.
 */
export function checkGeofence(reading: Reading, fence: Fence): GeofenceVerdict {
  const distance = distanceMeters(reading, fence)
  const accuracy = Math.max(0, Math.round(reading.accuracyMeters))

  // Checked BEFORE the distance comparison. A reading that cannot be trusted
  // must not be allowed through just because its centre happens to land inside.
  if (accuracy > fence.maxAccuracyMeters) {
    return { result: 'unreliable', distanceMeters: distance, accuracyMeters: accuracy }
  }

  // The accuracy radius is given to the employee, not taken from them: a
  // reading 25 m out with ±10 m accuracy could genuinely be 15 m out, and a
  // system that refuses people who are probably inside will be switched off.
  // Precision is enforced by the gate above, so this generosity is bounded.
  const effective = Math.max(0, distance - accuracy)

  return effective <= fence.radiusMeters
    ? { result: 'inside', distanceMeters: distance, accuracyMeters: accuracy }
    : { result: 'outside', distanceMeters: distance, accuracyMeters: accuracy }
}

/** What to tell the person, in words they can act on. */
export function geofenceMessage(verdict: GeofenceVerdict, fence: Fence): string {
  switch (verdict.result) {
    case 'inside':
      return 'Location confirmed'
    case 'outside':
      return `You appear to be ${verdict.distanceMeters} m from the office. Check in is allowed within ${fence.radiusMeters} m.`
    case 'unreliable':
      return `Your location could not be confirmed precisely enough (accurate to about ${verdict.accuracyMeters} m). Move near a window or step outside, then try again.`
  }
}
