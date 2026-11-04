"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CREATE_SC_VENDOR_INVOICE_BUTTON_LABEL,
  SC_LIST_FUNCTION_MENU_ITEMS,
  ScListFunctionActionDialog,
  getScListFunctionActionByLabel,
} from "@/widgets/service-completions";
import type { ScListFunctionAction } from "@/widgets/service-completions";
import {
  OLIO_MASS_UPDATE_BUTTON_LABEL,
  OlioMassUpdateWidget,
} from "@/widgets/olio-mass-update";

const SC_MENU_ITEMS = [
  OLIO_MASS_UPDATE_BUTTON_LABEL,
  ...SC_LIST_FUNCTION_MENU_ITEMS,
] as const;

type ServiceCompletionListSelectionActionsProps = {
  className?: string;
  /** Selected Service Completion record IDs passed into list-action buttons. */
  selectedRecordIds?: string[];
  onAction?: (action: string) => void;
};

export function ServiceCompletionListSelectionActions({
  className,
  selectedRecordIds = [],
  onAction,
}: ServiceCompletionListSelectionActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeAction, setActiveAction] = useState<ScListFunctionAction | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [olioMassUpdateOpen, setOlioMassUpdateOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SC_MENU_ITEMS;
    return SC_MENU_ITEMS.filter((item) => item.toLowerCase().includes(q));
  }, [query]);

  function closeMenu() {
    setMenuOpen(false);
    setQuery("");
  }

  function toggleMenu() {
    if (menuOpen) {
      closeMenu();
      return;
    }
    setMenuOpen(true);
  }

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenu();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const frame = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [menuOpen]);

  function openAction(label: string) {
    closeMenu();

    if (label === OLIO_MASS_UPDATE_BUTTON_LABEL) {
      setOlioMassUpdateOpen(true);
      onAction?.(label);
      return;
    }

    const action = getScListFunctionActionByLabel(label);
    if (!action) {
      onAction?.(label);
      return;
    }
    setActiveAction(action);
    setDialogOpen(true);
    onAction?.(label);
  }

  return (
    <>
      <div
        className={cn(
          "flex min-w-0 flex-wrap items-center gap-2",
          className,
        )}
        role="toolbar"
        aria-label="Selected service completion actions"
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="crm-toolbar-btn h-8 px-3 text-sm"
          onClick={() => openAction(OLIO_MASS_UPDATE_BUTTON_LABEL)}
        >
          {OLIO_MASS_UPDATE_BUTTON_LABEL}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="crm-toolbar-btn h-8 px-3 text-sm"
          onClick={() => openAction(CREATE_SC_VENDOR_INVOICE_BUTTON_LABEL)}
        >
          {CREATE_SC_VENDOR_INVOICE_BUTTON_LABEL}
        </Button>

        <div ref={menuRef} className="relative">
          <div className="inline-flex overflow-hidden rounded-lg border border-crm-border bg-crm-panel">
            <button
              type="button"
              className="crm-toolbar-btn h-8 rounded-none border-0 px-3 text-sm font-medium text-crm-text hover:bg-crm-panel-muted"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={toggleMenu}
            >
              Buttons
            </button>
            <button
              type="button"
              className="crm-toolbar-btn flex h-8 w-8 items-center justify-center rounded-none border-0 border-l border-crm-border text-crm-text hover:bg-crm-panel-muted"
              aria-label="Open buttons menu"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={toggleMenu}
            >
              <ChevronDown
                className={cn(
                  "size-4 text-crm-text-muted transition",
                  menuOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>
          </div>

          {menuOpen ?
            <div
              className="absolute left-0 top-[calc(100%+0.35rem)] z-50 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-lg border border-crm-border bg-crm-panel shadow-xl"
              role="menu"
              aria-label="Service completion button actions"
            >
              <div className="border-b border-crm-border p-2.5">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-crm-text-muted"
                    aria-hidden
                  />
                  <input
                    ref={searchRef}
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search Button"
                    className="h-9 w-full rounded-lg border border-crm-border bg-crm-panel py-2 pl-8 pr-3 text-sm text-crm-text outline-none placeholder:text-crm-text-muted focus:border-blue-500"
                    aria-label="Search buttons"
                  />
                </div>
              </div>

              <div className="max-h-[min(22rem,50vh)] overflow-y-auto overscroll-contain py-1">
                {filtered.length === 0 ?
                  <p className="px-3 py-6 text-center text-sm text-crm-text-muted">
                    No buttons match your search.
                  </p>
                : filtered.map((item) => (
                    <button
                      key={item}
                      type="button"
                      role="menuitem"
                      className="flex w-full cursor-pointer px-3 py-2.5 text-left text-sm text-crm-text transition hover:bg-blue-500/10"
                      onClick={() => openAction(item)}
                    >
                      {item}
                    </button>
                  ))
                }
              </div>
            </div>
          : null}
        </div>
      </div>

      <OlioMassUpdateWidget
        open={olioMassUpdateOpen}
        onClose={() => setOlioMassUpdateOpen(false)}
        selectedRecordIds={selectedRecordIds}
        module="ServiceCompletions"
      />

      <ScListFunctionActionDialog
        open={dialogOpen}
        action={activeAction}
        onClose={() => {
          setDialogOpen(false);
          setActiveAction(null);
        }}
        selectedRecordIds={selectedRecordIds}
        module="ServiceCompletions"
      />
    </>
  );
}
