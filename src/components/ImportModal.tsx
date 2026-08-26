"use client";

import type { Author, DoiLookupResult } from "@credit-generator/core";
import {
  createAuthor,
  DOI_INPUT_REGEX,
  fromCsv,
  fromJats4rXml,
  fromJson,
  MAX_AUTHORS,
  MAX_IMPORT_BYTES,
  normalizeDoi,
  parseAuthorText,
} from "@credit-generator/core";
import { FileUp, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import { announce } from "@/lib/announce";
import type { Messages } from "@/lib/intl";

interface Props {
  open: boolean;
  existingContributorCount: number;
  /** `title` is set only by the DOI path; the other importers carry no title. */
  onImport: (authors: Author[], title?: string) => void;
  /**
   * Handle a pasted share link. Returns a message key when it could not be
   * used, or null on success. Lives with the caller because merging a returned
   * link needs the current workspace, which this dialog does not hold.
   */
  onLink: (url: string) => "errShareLinkBroken" | null;
  onClose: () => void;
}

/** What a resolved import is waiting to write, once any replace is confirmed. */
interface PendingImport {
  authors: Author[];
  title?: string;
}

/**
 * Failure code → message key. Explicit rather than built by string
 * concatenation, so the typed-message guarantee still holds: a key removed from
 * en.json breaks the build here instead of silently rendering a key name.
 */
const DOI_ERROR_KEYS = {
  INVALID_DOI: "errDoiINVALID_DOI",
  NOT_FOUND: "errDoiNOT_FOUND",
  NO_AUTHORS: "errDoiNO_AUTHORS",
  TOO_MANY_AUTHORS: "errDoiTOO_MANY_AUTHORS",
  UNAVAILABLE: "errDoiUNAVAILABLE",
  RATE_LIMITED: "errDoiRATE_LIMITED",
  BAD_REQUEST: "errDoiBAD_REQUEST",
  UNREACHABLE: "errDoiUNREACHABLE",
  OFFLINE: "errDoiOFFLINE",
} as const;

type DoiFailure = { code: keyof typeof DOI_ERROR_KEYS };

async function fetchDoiWork(doi: string): Promise<Extract<DoiLookupResult, { ok: true }> | DoiFailure> {
  try {
    const res = await fetch("/api/doi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doi: normalizeDoi(doi) }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { code?: string } | null;
      const code = data?.code ?? "";
      return { code: code in DOI_ERROR_KEYS ? (code as keyof typeof DOI_ERROR_KEYS) : "BAD_REQUEST" };
    }
    return (await res.json()) as Extract<DoiLookupResult, { ok: true }>;
  } catch {
    // The lookup is one of two paths that need a network; the rest of the app
    // works offline, so say which half is unavailable rather than blaming Crossref.
    return { code: navigator.onLine ? "UNREACHABLE" : "OFFLINE" };
  }
}

type DetectedFormat = "link" | "csv" | "json" | "xml" | "names" | "unknown";

function detect(text: string): DetectedFormat {
  const trimmed = text.trim();
  // A share link, most usefully one a co-author sent back with their own roles.
  if (/^https?:\/\/\S+#s=/.test(trimmed)) return "link";
  if (trimmed.startsWith("<")) return "xml";
  // JSON must be checked before the CSV heuristic: a toJson() payload contains
  // both a comma and a "name" field, so the CSV check would misclassify it.
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      JSON.parse(trimmed);
      return "json";
    } catch {
      /* fall through */
    }
  }
  if (trimmed.includes(",") && trimmed.toLowerCase().includes("name")) return "csv";
  if (trimmed.length > 0) return "names";
  return "unknown";
}

/** The import size cap, written the way the messages below say it. */
const MAX_IMPORT_MB = `${Math.round(MAX_IMPORT_BYTES / 1_000_000)} MB`;

/** Parser + "nothing found" message for each detectable format. */
const IMPORTERS: Record<
  Exclude<DetectedFormat, "unknown" | "link">,
  { parse: (text: string) => Author[]; emptyMessageKey: keyof Messages }
> = {
  json: { parse: fromJson, emptyMessageKey: "errImportNoJsonContributors" },
  csv: { parse: fromCsv, emptyMessageKey: "errImportNoCsvRows" },
  xml: { parse: fromJats4rXml, emptyMessageKey: "errImportNoXmlContribs" },
  names: { parse: parseAuthorText, emptyMessageKey: "errImportNoNames" },
};

export function ImportModal({ open, existingContributorCount, onImport, onLink, onClose }: Props) {
  const t = useTranslations();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [doi, setDoi] = useState("");
  const [doiLoading, setDoiLoading] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const format: DetectedFormat = detect(text);

  /** Show an import error and announce it (errors interrupt via role="alert"). */
  function showError(message: string) {
    setError(message);
    announce(message, { assertive: true });
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  async function handleFileRead(file: File) {
    if (file.size > MAX_IMPORT_BYTES) {
      showError(t("errFileTooLarge", { limit: MAX_IMPORT_MB }));
      return;
    }
    try {
      setText(await file.text());
      setError(null);
    } catch {
      showError(t("errFileUnreadable"));
    }
  }

  function handleFileDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileRead(file);
  }

  function handleFileDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(true);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileRead(file);
    // Reset so re-selecting the same file still fires a change event.
    e.target.value = "";
  }

  function handleImport() {
    setError(null);
    if (format === "unknown") return;
    try {
      if (new TextEncoder().encode(text).byteLength > MAX_IMPORT_BYTES) {
        showError(t("errImportTooLarge", { limit: MAX_IMPORT_MB }));
        return;
      }
      if (format === "link") {
        // The whole-draft and merge cases both need the current workspace, so
        // the caller owns this one; failures come back as a message key.
        const failure = onLink(text.trim());
        if (failure) {
          showError(t(failure));
          return;
        }
        dialogRef.current?.close();
        return;
      }
      const { parse, emptyMessageKey } = IMPORTERS[format];
      const authors = parse(text.trim());
      if (authors.length === 0) {
        showError(t(emptyMessageKey));
        return;
      }
      if (authors.length > MAX_AUTHORS) {
        showError(t("errTooManyContributors", { limit: MAX_AUTHORS }));
        return;
      }
      stageImport({ authors });
    } catch {
      showError(t("errImportFailed"));
    }
  }

  /** Import straight away, or hold it behind the replace confirmation. */
  function stageImport(next: PendingImport) {
    if (existingContributorCount > 0) {
      setPending(next);
      return;
    }
    finishImport(next);
  }

  async function handleDoiLookup() {
    setError(null);
    const trimmed = normalizeDoi(doi);
    if (!DOI_INPUT_REGEX.test(trimmed)) {
      showError(t("errDoiINVALID_DOI"));
      return;
    }
    setDoiLoading(true);
    const result = await fetchDoiWork(trimmed);
    setDoiLoading(false);
    if (!("ok" in result)) {
      showError(t(DOI_ERROR_KEYS[result.code]));
      return;
    }
    try {
      // Crossref names go through createAuthor like any other import, so the
      // initials and the empty role row are built exactly as they are for a
      // pasted list.
      const authors = result.authors.map((author) =>
        createAuthor(author.name, author.orcid ? { orcid: author.orcid } : undefined),
      );
      stageImport({ authors, title: result.title });
    } catch {
      showError(t("errImportFailed"));
    }
  }

  function finishImport({ authors, title }: PendingImport) {
    // `onImport` runs the authors back through the store's normalizeAuthors,
    // which throws on anything createAuthor cannot rebuild. On the confirm
    // path this sits outside handleImport's try, so an unguarded throw here
    // escaped the click handler instead of showing as an import error.
    try {
      onImport(authors, title);
    } catch {
      showError(t("errImportFailed"));
      return;
    }
    setPending(null);
    dialogRef.current?.close();
  }

  function handleClose() {
    setText("");
    setDoi("");
    setError(null);
    setPending(null);
    onClose();
  }

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: the onMouseDown closes the dialog on backdrop click; Escape and the Close button provide the accessible paths.
    <dialog
      ref={dialogRef}
      aria-labelledby="import-title"
      aria-describedby="import-description"
      onClose={handleClose}
      onMouseDown={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}
      className="relative m-auto w-full max-w-xl max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-lg bg-surface-bright p-0 text-on-surface shadow-2xl ring-1 ring-outline-variant/20 backdrop:bg-on-surface/30 backdrop:backdrop-blur-sm"
    >
      <div>
        <div className="px-8 py-6 border-b border-outline-variant/10 bg-surface-container-low">
          <h2
            id="import-title"
            className="text-2xl italic font-semibold text-primary"
            style={{ fontFamily: "var(--font-headline)" }}
          >
            {t("importTitle")}
          </h2>
          <p id="import-description" className="text-sm text-on-surface-variant mt-1">
            Paste author names, or upload a CSV, JSON, or JATS4R XML file from a previous session. A JSON or XML import
            restores contribution scores as well as names.
          </p>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="absolute right-5 top-5 text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">{t("close")}</span>
          </button>
        </div>

        <div className="px-8 py-8 space-y-6">
          {/* DOI lookup */}
          <div>
            <label
              htmlFor="import-doi"
              className="block text-xs uppercase tracking-widest font-bold text-on-surface-variant mb-3"
            >
              {t("importFromDoi")}
            </label>
            <div className="flex gap-2">
              <input
                id="import-doi"
                type="text"
                inputMode="url"
                value={doi}
                onChange={(e) => {
                  setDoi(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleDoiLookup();
                  }
                }}
                placeholder={t("doiPlaceholder")}
                className="flex-1 min-w-0 bg-surface-container-low border-0 border-b-2 border-outline-variant/40 focus:border-primary focus:ring-0 outline-none text-sm font-mono px-4 py-2 text-on-surface rounded-t transition-colors"
              />
              <button
                type="button"
                onClick={() => void handleDoiLookup()}
                disabled={doiLoading || doi.trim().length === 0 || pending !== null}
                className="inline-flex shrink-0 items-center gap-1.5 rounded border border-primary px-4 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-on-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-primary"
              >
                <Search className="h-4 w-4" />
                {doiLoading ? t("doiLookingUp") : t("doiLookUp")}
              </button>
            </div>
            <p className="mt-2 text-xs text-on-surface-variant">{t("doiHint")}</p>
          </div>

          {/* Drop zone */}
          <div>
            <p className="text-xs uppercase tracking-widest font-bold text-on-surface-variant mb-3">
              Structured file upload
            </p>
            {/* biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop is a mouse-only progressive enhancement; the Browse button + file input below provide the accessible path. */}
            {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: same as above. */}
            <div
              onDragOver={handleFileDragOver}
              onDragLeave={() => setDragging(false)}
              onDrop={handleFileDrop}
              className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-colors ${
                dragging ? "border-primary bg-surface-container" : "border-outline-variant/40 bg-surface"
              }`}
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <FileUp className="h-7 w-7 text-primary" />
              </div>
              <p className="text-sm font-medium text-on-surface">{t("dragDropFile")}</p>
              <p className="text-xs text-on-surface-variant mt-1 mb-4">{t("acceptedFileTypes")}</p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="px-4 py-1.5 border border-primary text-primary text-xs font-semibold rounded hover:bg-primary hover:text-on-primary transition-colors"
              >
                {t("browseFiles")}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.json,.xml"
                className="hidden"
                onChange={handleFileInput}
                aria-label={t("a11yUploadFile")}
              />
            </div>
          </div>

          {/* Text area */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <label
                htmlFor="import-text"
                className="block text-xs uppercase tracking-widest font-bold text-on-surface-variant"
              >
                {t("pasteRawData")}
              </label>
              {format !== "unknown" && (
                <span className="text-[10px] text-primary font-medium italic">
                  {t("detectedFormat")}
                  {format === "names"
                    ? t("importAuthorList")
                    : format === "link"
                      ? t("formatShareLink")
                      : format === "json"
                        ? t("formatJsonExport")
                        : format === "xml"
                          ? "JATS4R XML"
                          : "CSV"}
                </span>
              )}
            </div>
            <textarea
              id="import-text"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setError(null);
              }}
              placeholder={t("importPlaceholder")}
              rows={6}
              className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant/40 focus:border-primary focus:ring-0 outline-none text-sm font-mono p-4 text-on-surface rounded-t resize-none transition-colors"
            />
          </div>

          {error && <p className="text-sm text-error bg-error-container/30 rounded px-4 py-2">{error}</p>}

          {pending && (
            <div role="alert" className="rounded-lg bg-error-container/30 p-4 text-sm text-on-surface">
              <p className="font-semibold">{t("replaceWorkspaceTitle")}</p>
              <p className="mt-1 text-on-surface-variant">
                {t("replaceWorkspaceBody", {
                  incoming: pending.authors.length,
                  existing: existingContributorCount,
                })}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPending(null)}
                  className="rounded-lg border border-outline-variant px-4 py-2 font-semibold text-on-surface-variant hover:border-primary hover:text-primary"
                >
                  {t("keepCurrentWork")}
                </button>
                <button
                  type="button"
                  onClick={() => finishImport(pending)}
                  className="rounded-lg bg-error px-4 py-2 font-semibold text-on-error hover:opacity-90"
                >
                  {t("replaceWorkspace")}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-8 py-5 border-t border-outline-variant/10 bg-surface-container-low flex justify-end gap-3">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="px-5 py-2 text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={format === "unknown" || pending !== null}
            className="px-7 py-2 bg-primary text-on-primary text-sm font-bold rounded-lg shadow hover:bg-primary-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t("importData")}
          </button>
        </div>
      </div>
    </dialog>
  );
}
