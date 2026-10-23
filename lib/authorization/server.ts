import "server-only";
import {
  evaluateShadow,
  type PolicySnapshot,
  type ShadowDecision,
} from "./policy";
import { capability } from "./registry";

/** Future DAL seam. No database implementation, activation switch, grant writer,
 * mutation callback or approval executor exists in Batch 2B. Dependencies are
 * installed by server code, never by JSON, cookies or role/risk headers.
 */
export interface ShadowLoaders {
  loadSnapshot(
    credential: Request | { sessionKey: string },
    reference: Readonly<{ kind: string; id: string }>,
  ): Promise<PolicySnapshot>;
  now(): number;
}
export function createShadowPolicyService(loaders: ShadowLoaders) {
  return Object.freeze({
    async evaluate(
      credential: Request | { sessionKey: string },
      action: unknown,
      reference: Readonly<{ kind: string; id: string }>,
    ): Promise<ShadowDecision> {
      if (!capability(action))
        return evaluateShadow(
          action,
          { session: null, membership: null, resource: null },
          loaders.now(),
        );
      // Even caller-supplied references are only selectors, never trusted resource
      // attributes. Binding and assignment are checked after the server lookup.
      const snapshot = await loaders.loadSnapshot(credential, reference);
      if (
        snapshot.resource &&
        (snapshot.resource.kind !== reference.kind ||
          snapshot.resource.id !== reference.id)
      )
        return evaluateShadow(
          action,
          { ...snapshot, resource: null },
          loaders.now(),
        );
      return evaluateShadow(action, snapshot, loaders.now());
    },
  });
}
