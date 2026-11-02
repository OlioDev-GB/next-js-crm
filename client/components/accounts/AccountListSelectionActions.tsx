"use client";

/**
 * Placeholder for Bids list selection toolbar actions.
 * Mass/bulk widgets are intentionally omitted for now.
 */
type AccountListSelectionActionsProps = {
  className?: string;
  selectedRecordIds?: string[];
  onAction?: (action: string) => void;
};

export function AccountListSelectionActions({
  className,
  selectedRecordIds = [],
}: AccountListSelectionActionsProps) {
  void className;
  void selectedRecordIds;
  return null;
}
