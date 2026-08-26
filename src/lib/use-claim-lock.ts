import { useContributionStore } from "@/store/contribution-store";

/**
 * Claim-lock view for components. The store already refuses locked edits; this
 * exists so the interface can *look* locked too, instead of offering controls
 * that silently do nothing.
 */
export function useClaimLock(): { locked: boolean; editableAuthorId: string | null } {
  const claim = useContributionStore((s) => s.claim);
  return { locked: claim !== null, editableAuthorId: claim?.contributorId ?? null };
}
