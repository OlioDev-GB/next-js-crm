"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  OLIO_MASS_UPDATE_BUTTON_LABEL,
  OlioMassUpdateWidget,
} from "@/widgets/olio-mass-update";

type BidListSelectionActionsProps = {
  className?: string;
  /** Selected Bid record IDs passed into list-action widgets. */
  selectedRecordIds?: string[];
  onAction?: (action: string) => void;
};

export function BidListSelectionActions({
  className,
  selectedRecordIds = [],
  onAction,
}: BidListSelectionActionsProps) {
  const [olioMassUpdateOpen, setOlioMassUpdateOpen] = useState(false);

  function openOlioMassUpdate() {
    setOlioMassUpdateOpen(true);
    onAction?.(OLIO_MASS_UPDATE_BUTTON_LABEL);
  }

  return (
    <>
      <div
        className={cn(
          "flex min-w-0 flex-wrap items-center gap-2",
          className,
        )}
        role="toolbar"
        aria-label="Selected bid actions"
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="crm-toolbar-btn h-8 px-3 text-sm"
          onClick={openOlioMassUpdate}
        >
          {OLIO_MASS_UPDATE_BUTTON_LABEL}
        </Button>
      </div>

      <OlioMassUpdateWidget
        open={olioMassUpdateOpen}
        onClose={() => setOlioMassUpdateOpen(false)}
        selectedRecordIds={selectedRecordIds}
        module="Bids"
      />
    </>
  );
}
