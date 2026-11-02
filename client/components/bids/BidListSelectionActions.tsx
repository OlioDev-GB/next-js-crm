"use client";

/**
 * Placeholder for Bids list selection toolbar actions.
 * Mass/bulk widgets are intentionally omitted for now.
 */
type BidListSelectionActionsProps = {
  className?: string;
  selectedRecordIds?: string[];
  onAction?: (action: string) => void;
};

export function BidListSelectionActions({
  className,
  selectedRecordIds = [],
}: BidListSelectionActionsProps) {
  void className;
  void selectedRecordIds;
  return null;
}
