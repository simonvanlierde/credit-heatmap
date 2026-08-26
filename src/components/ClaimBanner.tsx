"use client";

import { Send } from "lucide-react";
import { useTranslations } from "use-intl";
import { announce } from "@/lib/announce";
import { buildShareUrl } from "@/lib/share";
import { useCopyStatus } from "@/lib/use-copy-status";
import { useContributionStore } from "@/store/contribution-store";

/**
 * Shown when the draft was opened from a link addressed to one contributor.
 *
 * It exists to answer two questions before anything is clicked: whose row this
 * is, and what happens to everything else. Both matter, because the person
 * reading it is looking at a full draft they did not write and can edit every
 * cell of — only their own row will be collected.
 */
export function ClaimBanner() {
  const t = useTranslations();
  const claimIndex = useContributionStore((s) => s.claimIndex);
  const authors = useContributionStore((s) => s.authors);
  const claimDraftId = useContributionStore((s) => s.claimDraftId);
  const [copyStatus, copy] = useCopyStatus({
    copied: t("annLinkCopied"),
    error: t("copyFailedMessage"),
  });

  const claimed = claimIndex === null ? undefined : authors[claimIndex];
  if (!claimed) return null;

  async function handleSendBack() {
    if (claimIndex === null) return;
    try {
      // The draft id rides back with the reply, so it lands on the paper it
      // was asked about rather than on whatever the recipient has open.
      await copy(buildShareUrl(authors, { claimIndex, ...(claimDraftId ? { draftId: claimDraftId } : {}) }));
    } catch {
      announce(t("errShareTooLarge"), { assertive: true });
    }
  }

  return (
    <div
      // A status rather than an alert: it is context for the whole session, not
      // an error interrupting one action.
      role="status"
      className="mx-3 mt-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 md:mx-4 md:mt-4"
    >
      <p className="text-sm font-semibold text-on-surface">{t("claimBannerTitle", { name: claimed.name })}</p>
      <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
        {t("claimBannerBody", { name: claimed.name })}
      </p>
      <button
        type="button"
        onClick={() => void handleSendBack()}
        className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-container"
      >
        <Send className="h-4 w-4" />
        {copyStatus === "copied" ? t("claimSendBackCopied") : t("claimSendBack")}
      </button>
    </div>
  );
}
