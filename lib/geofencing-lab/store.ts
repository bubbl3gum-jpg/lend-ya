import { randomUUID } from "node:crypto";
export const LAB_TTL = 3600000;
export type Binding = {
  userId: number;
  sessionHash: string;
  sessionBorn: string;
  deviceHash: string;
};
export type Centre = { latitude: number; longitude: number };
export type Lab = {
  id: string;
  binding: Binding;
  expiresAt: number;
  centreMode: "station" | "map" | "device" | "expired";
  centre?: Centre;
  centreExpiresAt?: number;
  generation: string;
  timer?: ReturnType<typeof setTimeout>;
  centreTimer?: ReturnType<typeof setTimeout>;
};
const labs = new Map<string, Lab>();
const same = (a: Binding, b: Binding) =>
  a.userId === b.userId &&
  a.sessionHash === b.sessionHash &&
  a.sessionBorn === b.sessionBorn &&
  a.deviceHash === b.deviceHash;
function schedule(id: string, generation: string, ms: number, centre = false) {
  const t = setTimeout(() => {
    const lab = labs.get(id);
    if (!lab || lab.generation !== generation) return;
    if (centre) {
      delete lab.centre;
      lab.centreMode = "expired";
    } else closeLab(id);
  }, ms);
  t.unref();
  return t;
}
export function closeLab(id: string) {
  const lab = labs.get(id);
  if (lab) {
    clearTimeout(lab.timer);
    clearTimeout(lab.centreTimer);
    delete lab.centre;
    labs.delete(id);
  }
}
export function createLab(binding: Binding, seconds: number, now = Date.now()) {
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > 3600)
    throw Error("Invalid duration");
  for (const lab of labs.values())
    if (lab.binding.userId === binding.userId) closeLab(lab.id);
  if (labs.size >= 20) throw Error("Lab capacity unavailable");
  const lab: Lab = {
    id: randomUUID(),
    binding,
    expiresAt: now + seconds * 1000,
    centreMode: "station",
    generation: randomUUID(),
  };
  labs.set(lab.id, lab);
  lab.timer = schedule(lab.id, lab.generation, seconds * 1000);
  return lab;
}
export function requireLab(id: string, binding: Binding, now = Date.now()) {
  const lab = labs.get(id);
  if (lab && lab.expiresAt <= now) closeLab(id);
  if (!lab || !labs.has(id) || !same(lab.binding, binding))
    throw Error("Lab unavailable");
  if (
    lab.centreExpiresAt !== undefined &&
    lab.centreExpiresAt <= now &&
    lab.centreMode !== "station"
  ) {
    clearTimeout(lab.centreTimer);
    delete lab.centre;
    lab.centreMode = "expired";
  }
  return lab;
}
export function setLabCentre(
  lab: Lab,
  mode: "station" | "map" | "device",
  centre: Centre | undefined,
  seconds: number,
  now = Date.now(),
) {
  if (
    !Number.isInteger(seconds) ||
    seconds < 1 ||
    seconds > 3600 ||
    lab.expiresAt <= now
  )
    throw Error("Invalid centre duration");
  if (
    mode !== "station" &&
    (!centre ||
      ![centre.latitude, centre.longitude].every(Number.isFinite) ||
      Math.abs(centre.latitude) > 90 ||
      Math.abs(centre.longitude) > 180)
  )
    throw Error("Invalid centre");
  clearTimeout(lab.centreTimer);
  delete lab.centre;
  lab.centreMode = mode;
  lab.centreExpiresAt = undefined;
  if (mode !== "station") {
    lab.centre = { ...centre! };
    lab.centreExpiresAt = Math.min(lab.expiresAt, now + seconds * 1000);
    lab.centreTimer = schedule(
      lab.id,
      lab.generation,
      lab.centreExpiresAt - now,
      true,
    );
  }
}
export function labStatus(lab: Lab) {
  return {
    labId: lab.id,
    expiresAt: new Date(lab.expiresAt).toISOString(),
    centreMode: lab.centreMode,
    centreExpiresAt: lab.centreExpiresAt
      ? new Date(lab.centreExpiresAt).toISOString()
      : null,
    classification: "TEST_LOCATION" as const,
    arrivalVerified: false as const,
  };
}
