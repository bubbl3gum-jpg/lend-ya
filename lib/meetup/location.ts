import official from "../../data/mrt/official-network.json";
export const LOCATION_POLICY = "mrt-location-pilot-1";
export type LocationOutcome =
  | "VERIFIED"
  | "UNAVAILABLE"
  | "INACCURATE"
  | "OUTSIDE";
export const stationCoordinates = official.stations.map((s) => ({
  id: s.id,
  latitude: "latitude" in s ? s.latitude : undefined,
  longitude: "longitude" in s ? s.longitude : undefined,
}));
function bounded(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  const n = value === undefined ? fallback : Number(value);
  if (!Number.isFinite(n) || n < min || n > max)
    throw Error("Invalid meetup location configuration");
  return n;
}
export function locationSettings(canonicalId: string) {
  const station = official.stations.find((s) => s.id === canonicalId);
  // Station-centroid pilot defaults; interchange complexes need a larger area. Exit-specific calibration is still required.
  const interchange = station && Object.keys(station.codes).length > 1;
  const overrides = JSON.parse(
    process.env.MEETUP_STATION_RADII_JSON ?? "{}",
  ) as Record<string, number>;
  if (
    typeof overrides !== "object" ||
    !overrides ||
    Array.isArray(overrides) ||
    Object.entries(overrides).some(
      ([id, n]) =>
        !stationCoordinates.some((s) => s.id === id) ||
        typeof n !== "number" ||
        n < 50 ||
        n > 800,
    )
  )
    throw Error("Invalid station radius overrides");
  const radius =
    overrides[canonicalId] ??
    bounded(
      interchange
        ? process.env.MEETUP_INTERCHANGE_RADIUS_M
        : process.env.MEETUP_STATION_RADIUS_M,
      interchange ? 350 : 200,
      50,
      800,
    );
  return {
    radiusMeters: radius,
    maxAccuracyMeters: bounded(process.env.MEETUP_MAX_ACCURACY_M, 100, 10, 200),
    freshnessMs: 120000,
  };
}
export function distanceMeters(
  lat: number,
  lon: number,
  stationLat: number,
  stationLon: number,
) {
  const rad = (x: number) => (x * Math.PI) / 180;
  const a =
    Math.sin(rad(stationLat - lat) / 2) ** 2 +
    Math.cos(rad(lat)) *
      Math.cos(rad(stationLat)) *
      Math.sin(rad(stationLon - lon) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}
export function evaluateLocation(
  canonicalId: string,
  input: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  },
  now = Date.now(),
  temporaryCentre?: { latitude: number; longitude: number },
) {
  const { latitude, longitude, accuracy, timestamp } = input;
  if (
    ![latitude, longitude, accuracy, timestamp].every(Number.isFinite) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180 ||
    accuracy < 0 ||
    accuracy > 100000 ||
    timestamp > now + 5000 ||
    timestamp < now - 120000
  )
    throw Error("Invalid or stale location sample; request a new reading.");
  const station =
      temporaryCentre ?? stationCoordinates.find((s) => s.id === canonicalId),
    settings = locationSettings(canonicalId);
  if (
    !station ||
    typeof station.latitude !== "number" ||
    typeof station.longitude !== "number"
  )
    return {
      outcome: "UNAVAILABLE" as LocationOutcome,
      reason: "NO_VALIDATED_COORDINATES",
      accuracyMeters: Math.ceil(accuracy),
      distanceBand: null,
    };
  if (accuracy > settings.maxAccuracyMeters)
    return {
      outcome: "INACCURATE" as LocationOutcome,
      reason: "LOW_ACCURACY",
      accuracyMeters: Math.ceil(accuracy),
      distanceBand: null,
    };
  const distance = distanceMeters(
    latitude,
    longitude,
    station.latitude,
    station.longitude,
  );
  // Do not expand the accepted area by an arbitrarily poor accuracy reading.
  return {
    outcome: (distance + accuracy <= settings.radiusMeters
      ? "VERIFIED"
      : "OUTSIDE") as LocationOutcome,
    reason:
      distance + accuracy <= settings.radiusMeters
        ? "WITHIN_PILOT_AREA"
        : "OUTSIDE_PILOT_AREA",
    accuracyMeters: Math.ceil(accuracy),
    distanceBand: Math.ceil(distance / 100) * 100,
  };
}
