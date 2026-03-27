"use client";

import { AuthorList } from "@/components/steps/AuthorInput";
import { RoleAssignment } from "@/components/steps/ContributionMatrix";

/**
 * Left panel: author entry list (top) + role assignment for the selected author (bottom).
 */
export function AuthorPanel() {
  return (
    <>
      <AuthorList />
      <RoleAssignment />
    </>
  );
}
