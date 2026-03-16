import type { EmailPlatform, StepsMap } from "../db/types";

/**
 * Pick the platform-specific steps variant from a keyed steps object,
 * falling back to "default" if the platform key doesn't exist.
 *
 * @param stepsMap  Keyed object e.g. { default: [...], google_workspace: [...] }
 * @param platform  The org's email_platform setting (nullable)
 * @returns Flat array of step strings
 */
export function resolveSteps(
  stepsMap: StepsMap | string[] | null | undefined,
  platform: EmailPlatform | null | undefined
): string[] {
  if (!stepsMap) return [];

  // Backwards compat: if still a flat array, return as-is
  if (Array.isArray(stepsMap)) return stepsMap;

  if (platform && stepsMap[platform]) {
    return stepsMap[platform];
  }

  return stepsMap["default"] ?? [];
}

/**
 * Returns a human-readable label for the email platform.
 */
export function platformLabel(
  platform: EmailPlatform | null | undefined
): string | null {
  switch (platform) {
    case "google_workspace":
      return "Google Workspace";
    case "microsoft_365":
      return "Microsoft 365";
    case "gmail_personal":
      return "Gmail (Personal)";
    case "other":
      return null;
    default:
      return null;
  }
}
