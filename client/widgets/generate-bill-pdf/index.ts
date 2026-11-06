import type { CrmWidgetDefinition } from "@/widgets/types";
import {
  GENERATE_BILL_PDF_BUTTON_LABEL,
  GENERATE_BILL_PDF_WIDGET_NAME,
} from "@/widgets/generate-bill-pdf/types";

export const GENERATE_BILL_PDF_WIDGET = {
  id: "generate-bill-pdf",
  name: GENERATE_BILL_PDF_WIDGET_NAME,
  buttonLabel: GENERATE_BILL_PDF_BUTTON_LABEL,
} as const satisfies CrmWidgetDefinition;

export {
  GENERATE_BILL_PDF_BUTTON_LABEL,
  GENERATE_BILL_PDF_WIDGET_NAME,
  GENERATE_BILL_PDF_ZOHO_BUTTON_ID,
  GENERATE_BILL_PDF_MODULE,
} from "./types";

export type { GenerateBillPdfResult } from "./types";

export { GenerateBillPdfDialog } from "./ui/GenerateBillPdfDialog";
