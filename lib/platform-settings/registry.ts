export const POLICY = "owned-display-10b-v1";
export const KEYS = [
  "dev.announcements.visible",
  "dev.announcements.maxVisible",
] as const;
export type SettingKey = (typeof KEYS)[number];
export const REGISTRY = {
  "dev.announcements.visible": {
    label: "Show development notices",
    type: "boolean",
    defaultValue: true,
    description:
      "Show or hide the eligible-notice section of the owned demonstration page. Authorization and warnings remain visible.",
  },
  "dev.announcements.maxVisible": {
    label: "Maximum development notices",
    type: "integer",
    defaultValue: 100,
    description:
      "Display 1–100 already eligible notices. Never changes publication eligibility or the server query hard cap.",
  },
} as const;
export function keyOf(v: unknown): SettingKey {
  if (typeof v !== "string" || !KEYS.includes(v as SettingKey))
    throw Error("Unknown or prohibited setting.");
  return v as SettingKey;
}
export function encode(key: SettingKey, value: unknown): number {
  if (key === "dev.announcements.visible") {
    if (typeof value !== "boolean") throw Error("Use an explicit boolean.");
    return value ? 1 : 0;
  }
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 100
  )
    throw Error("Choose a whole number from 1 to 100.");
  return value;
}
export function decode(key: SettingKey, value: number): boolean | number {
  if (key === "dev.announcements.visible") {
    if (value !== 0 && value !== 1) throw Error("Invalid persisted boolean.");
    return value === 1;
  }
  encode(key, value);
  return value;
}
export function defaultEncoded(key: SettingKey) {
  return encode(key, REGISTRY[key].defaultValue);
}
export function parseSettingCommand(input: Record<string, unknown>) {
  const key = keyOf(input.key),
    action = input.action;
  if (action !== "SET" && action !== "ROLLBACK")
    throw Error("Unknown settings action.");
  const allowed = [
    "key",
    "action",
    "requestId",
    "expectedVersion",
    action === "SET" ? "value" : "targetVersion",
  ];
  if (
    Object.keys(input).some((k) => !allowed.includes(k)) ||
    typeof input.requestId !== "string" ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
      input.requestId,
    )
  )
    throw Error("Invalid settings command.");
  const expectedVersion = input.expectedVersion;
  if (
    typeof expectedVersion !== "number" ||
    !Number.isInteger(expectedVersion) ||
    expectedVersion < 0 ||
    expectedVersion > 2147483646
  )
    throw Error("Invalid expected version.");
  if (action === "SET")
    return {
      key,
      action,
      requestId: input.requestId,
      expectedVersion,
      value: encode(key, input.value),
      targetVersion: null,
    };
  const targetVersion = input.targetVersion;
  if (
    typeof targetVersion !== "number" ||
    !Number.isInteger(targetVersion) ||
    targetVersion < 0 ||
    targetVersion >= expectedVersion
  )
    throw Error(
      "Rollback must select an earlier recorded version or default version 0.",
    );
  return {
    key,
    action,
    requestId: input.requestId,
    expectedVersion,
    value: null,
    targetVersion,
  };
}
export type SettingView = {
  key: SettingKey;
  label: string;
  type: string;
  description: string;
  value: boolean | number;
  version: number;
  source: "DEFAULT" | "DATABASE";
  updatedAt: string | null;
  actorId: number | null;
};
