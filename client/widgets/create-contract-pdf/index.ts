import type { CrmWidgetDefinition } from "@/widgets/types";

/** Zoho SOW detail custom button label. */
export const CREATE_CONTRACT_PDF_BUTTON_LABEL = "create contract PDF" as const;

/** Widget modal title. */
export const CREATE_CONTRACT_PDF_WIDGET_NAME = "Create Contract PDF" as const;

/** Zoho custom button id — Deals/SOW detail view. */
export const CREATE_CONTRACT_PDF_ZOHO_BUTTON_ID =
  "2168928000036165043" as const;

export const CREATE_CONTRACT_PDF_WIDGET = {
  id: "create-contract-pdf",
  name: CREATE_CONTRACT_PDF_WIDGET_NAME,
  buttonLabel: CREATE_CONTRACT_PDF_BUTTON_LABEL,
} as const satisfies CrmWidgetDefinition;

export { CreateContractPdfWidget } from "./ui/CreateContractPdfWidget";
