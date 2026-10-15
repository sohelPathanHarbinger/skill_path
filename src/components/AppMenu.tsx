import { useEffect, useRef, useState, type ReactNode } from "react";
import { openSettingsDialog } from "../hooks/useSettingsDialog";
import { APP_VERSION, DEVELOPER } from "../lib/appInfo";
import { BackupPanel } from "./BackupPanel";
import { AboutPage, DisclaimerPage, HowToUsePage } from "./InfoPages";
import { Dialog } from "./ui";

type Page = "about" | "howto" | "disclaimer" | "backup";

const TITLES: Record<Page, string> = {
  about: "About SkillPath",
  howto: "How to use SkillPath",
  disclaimer: "Disclaimer & privacy",
  backup: "Back up & restore",
};

/** The ☰ menu in the header, and the pages it opens. */
export function AppMenu() {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<Page | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-slate-200"
        >
          <Item onClick={() => choose(() => setPage("howto"))}>How to use</Item>
          <Item onClick={() => choose(() => setPage("about"))}>About SkillPath</Item>
          <Item onClick={() => choose(() => setPage("disclaimer"))}>Disclaimer &amp; privacy</Item>
          <div className="my-1 border-t border-slate-100" />
          <Item onClick={() => choose(openSettingsDialog)}>AI settings</Item>
          <Item onClick={() => choose(() => setPage("backup"))}>Back up &amp; restore</Item>
          <div className="my-1 border-t border-slate-100" />
          <p className="px-4 py-2 text-xs text-slate-400">
            Developed by {DEVELOPER} · v{APP_VERSION}
          </p>
        </div>
      )}

      {page && (
        <Dialog title={TITLES[page]} onClose={() => setPage(null)}>
          {page === "about" ? (
            <AboutPage />
          ) : page === "howto" ? (
            <HowToUsePage />
          ) : page === "disclaimer" ? (
            <DisclaimerPage />
          ) : (
            <BackupPanel />
          )}
        </Dialog>
      )}
    </div>
  );
}

function Item({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900"
    >
      {children}
    </button>
  );
}
