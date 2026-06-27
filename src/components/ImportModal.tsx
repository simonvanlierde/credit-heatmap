"use client";

import type { Author } from "@credit-generator/core";
import { fromCsv, fromJats4rXml, fromJson, parseAuthorText } from "@credit-generator/core";
import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onImport: (authors: Author[]) => void;
  onClose: () => void;
}

type DetectedFormat = "csv" | "json" | "xml" | "names" | "unknown";

function detect(text: string): DetectedFormat {
  const trimmed = text.trim();
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

const FORMAT_LABEL: Record<DetectedFormat, string> = {
  csv: "CSV",
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

  async function handleFileRead(file: File) {
    try {
      setText(await file.text());
      setError(null);
    } catch {
      setError("Could not read that file.");
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
  }

  async function handleImport() {
    setError(null);
    try {
      let authors: Author[];
      if (format === "json") {
        authors = fromJson(text.trim());
        if (authors.length === 0) {
          setError("That JSON export contains no contributors.");
          return;
        }
      } else if (format === "csv") {
        authors = fromCsv(text.trim());
        if (authors.length === 0) {
          setError("No contributor rows found in the CSV.");
          return;
        }
      } else if (format === "xml") {
        authors = fromJats4rXml(text.trim());
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
            <p className="text-xs uppercase tracking-widest font-bold text-outline mb-3">Structured File Upload</p>
            {/* biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop is a mouse-only progressive enhancement; the Browse button + file input below provide the accessible path. */}
            <div
              onDragOver={handleFileDragOver}
              onDragLeave={() => setDragging(false)}
              onDrop={handleFileDrop}
              className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-colors ${
                dragging ? "border-primary bg-surface-container" : "border-outline-variant/40 bg-surface"
              }`}
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-primary text-3xl">upload_file</span>
              </div>
              <p className="text-sm font-medium text-on-surface">Drag and drop a file here</p>
              <p className="text-xs text-on-surface-variant mt-1 mb-4">Accepts .csv, .json, or .xml</p>
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
                accept=".csv,.json,.xml"
                className="hidden"
                onChange={handleFileInput}
                aria-label="Upload CSV, JSON, or XML file"
              />
            </div>
          </div>

          {/* Text area */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <label htmlFor="import-text" className="block text-xs uppercase tracking-widest font-bold text-outline">
                Paste Raw Data
              </label>
              {format !== "unknown" && (
                <span className="text-[10px] text-primary font-medium italic">Detected: {FORMAT_LABEL[format]}</span>
              )}
            </div>
            <textarea
              id="import-text"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setError(null);
              }}
              placeholder={"Jane A. Smith\nBob White\nCarol Davis\n\n— or paste a .json / .xml export —"}
              rows={6}
              className="w-full bg-surface-container-low border-0 border-b-2 border-outline-variant/40 focus:border-primary focus:ring-0 outline-none text-sm font-mono p-4 text-on-surface rounded-t resize-none transition-colors"
            />
          </div>

          {/* Tip */}
          <div className="bg-surface-container-high border-l-2 border-primary p-4">
            <p className="text-sm italic text-primary" style={{ fontFamily: "var(--font-headline)" }}>
              "Paste a comma- or newline-separated list and initials will be assigned automatically. Or upload a
              JSON/XML file from a previous session to restore all contribution scores."
            </p>
          </div>

          {error && <p className="text-sm text-error bg-error-container/30 rounded px-4 py-2">{error}</p>}
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
