"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fromJson, parseAuthorText } from "@credit-generator/core";
import type { Author } from "@credit-generator/core";
import { useRef, useState } from "react";

interface Props {
  open: boolean;
  onImport: (authors: Author[]) => void;
  onClose: () => void;
}

type DetectedFormat = "json" | "xml" | "names" | "unknown";

function detect(text: string): DetectedFormat {
  const trimmed = text.trim();
  if (trimmed.startsWith("<")) return "xml";
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      JSON.parse(trimmed);
      return "json";
    } catch {
      /* fall through */
    }
  }
  if (trimmed.length > 0) return "names";
  return "unknown";
}

const FORMAT_LABEL: Record<DetectedFormat, string> = {
  json: "JSON export",
  xml: "JATS4R XML",
  names: "Author name list",
  unknown: "",
};

export function ImportModal({ open, onImport, onClose }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const format: DetectedFormat = detect(text);

  function handleFileRead(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      setText((e.target?.result as string) ?? "");
      setError(null);
    };
    reader.readAsText(file);
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
  }

  async function handleImport() {
    setError(null);
    try {
      let authors: Author[];
      if (format === "json") {
        authors = fromJson(text.trim());
      } else if (format === "xml") {
        const res = await fetch("/api/v1/xml/parse", {
          method: "POST",
          headers: { "Content-Type": "application/xml" },
          body: text.trim(),
        });
        const json = (await res.json()) as { authors?: Author[]; error?: string };
        if (!res.ok) {
          setError(json.error ?? `HTTP ${res.status}`);
          return;
        }
        authors = json.authors ?? [];
        if (authors.length === 0) {
          setError("No <contrib> elements found in the XML.");
          return;
        }
      } else {
        authors = parseAuthorText(text);
        if (authors.length === 0) {
          setError("No author names found. Enter one name per line.");
          return;
        }
      }
      onImport(authors);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not parse the input. Check the format.");
    }
  }

  function handleClose() {
    setText("");
    setError(null);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Import Contributors</DialogTitle>
          <DialogDescription>
            Paste author names, or upload a JSON export / JATS4R XML file from a previous session.
          </DialogDescription>
        </DialogHeader>

        <div className="px-8 py-8 space-y-6">
          {/* Drop zone */}
          <div>
            <p className="text-xs uppercase tracking-widest font-bold text-outline mb-3">
              Structured File Upload
            </p>
            <div
              onDragOver={handleFileDragOver}
              onDragLeave={() => setDragging(false)}
              onDrop={handleFileDrop}
              aria-label="File drop zone — drag and drop a JSON or XML file here"
              className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-colors ${
                dragging
                  ? "border-primary bg-surface-container"
                  : "border-outline-variant/40 bg-surface"
              }`}
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-primary text-3xl">upload_file</span>
              </div>
              <p className="text-sm font-medium text-on-surface">Drag and drop a file here</p>
              <p className="text-xs text-on-surface-variant mt-1 mb-4">
                Accepts .json (export) or .xml (JATS4R)
              </p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="px-4 py-1.5 border border-primary text-primary text-xs font-semibold rounded hover:bg-primary hover:text-on-primary transition-colors"
              >
                Browse files
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".json,.xml"
                className="hidden"
                onChange={handleFileInput}
                aria-label="Upload JSON or XML file"
              />
            </div>
          </div>

          {/* Text area */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <label
                htmlFor="import-text"
                className="block text-xs uppercase tracking-widest font-bold text-outline"
              >
                Paste Raw Data
              </label>
              {format !== "unknown" && (
                <span className="text-[10px] text-primary font-medium italic">
                  Detected: {FORMAT_LABEL[format]}
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
              placeholder={
                "Jane A. Smith\nBob White\nCarol Davis\n\n— or paste a .json / .xml export —"
              }
              rows={6}
              className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant/40 focus:border-primary focus:ring-0 outline-none text-sm font-mono p-4 text-on-surface rounded-t resize-none transition-colors"
            />
          </div>

          {/* Tip */}
          <div className="bg-surface-container-high border-l-2 border-primary p-4">
            <p
              className="text-sm italic text-primary"
              style={{ fontFamily: "var(--font-headline)" }}
            >
              "Paste a comma- or newline-separated list and initials will be assigned automatically.
              Or upload a JSON/XML file from a previous session to restore all contribution scores."
            </p>
          </div>

          {error && (
            <p className="text-sm text-error bg-error-container/30 rounded px-4 py-2">{error}</p>
          )}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2 text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={format === "unknown"}
            className="px-7 py-2 bg-primary text-on-primary text-sm font-bold rounded-lg shadow hover:bg-primary-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Import Data
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
