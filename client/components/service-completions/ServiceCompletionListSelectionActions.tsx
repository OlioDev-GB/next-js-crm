"use client";

/**
 * Placeholder for Service Completions list selection toolbar actions.
 * Mass/bulk widgets are intentionally omitted for now.
 */
type ServiceCompletionListSelectionActionsProps = {
  className?: string;
  selectedRecordIds?: string[];
  onAction?: (action: string) => void;
};

export function ServiceCompletionListSelectionActions({
  className,
  selectedRecordIds = [],
}: ServiceCompletionListSelectionActionsProps) {
  void className;
  void selectedRecordIds;
  return null;
}
