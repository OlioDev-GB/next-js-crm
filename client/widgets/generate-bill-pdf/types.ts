/** Zoho Vendor Invoices list-view “Generate Bill PDF” custom function button. */

export const GENERATE_BILL_PDF_BUTTON_LABEL = "Generate Bill PDF" as const;

export const GENERATE_BILL_PDF_WIDGET_NAME = "Generate Bill PDF" as const;

/** Zoho custom button id (`Link_to_old_bills`). */
export const GENERATE_BILL_PDF_ZOHO_BUTTON_ID = "2168928000068190806" as const;

export const GENERATE_BILL_PDF_MODULE = "Vendor_Invoices" as const;

export type GenerateBillPdfResult = {
  ok: boolean;
  message?: string;
  output?: unknown;
};
