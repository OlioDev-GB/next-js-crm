"use client";

/**
 * Placeholder for SOW list selection toolbar actions.
 * Mass/bulk widgets are intentionally omitted for now.
 */
type SowListSelectionActionsProps = {
  className?: string;
  selectedRecordIds?: string[];
  onAction?: (action: string) => void;
};

export function SowListSelectionActions({
  className,
  selectedRecordIds = [],
}: SowListSelectionActionsProps) {
  void className;
  void selectedRecordIds;
  return null;
}
