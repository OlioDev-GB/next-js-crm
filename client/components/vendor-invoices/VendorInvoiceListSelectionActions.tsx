"use client";

/**
 * Placeholder for Vendor Invoices list selection toolbar actions.
 * Mass/bulk widgets are intentionally omitted for now.
 */
type VendorInvoiceListSelectionActionsProps = {
  className?: string;
  selectedRecordIds?: string[];
  onAction?: (action: string) => void;
};

export function VendorInvoiceListSelectionActions({
  className,
  selectedRecordIds = [],
}: VendorInvoiceListSelectionActionsProps) {
  void className;
  void selectedRecordIds;
  return null;
}
