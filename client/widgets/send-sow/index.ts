import type { CrmWidgetDefinition } from "@/widgets/types";

/** Zoho SOW detail custom button label. */
export const SEND_SOW_BUTTON_LABEL = "Send SOW" as const;

/** Widget modal title. */
export const SEND_SOW_WIDGET_NAME = "Send SOW" as const;

/** Zoho custom button id — Deals/SOW detail view (`Send_SOW`). */
export const SEND_SOW_ZOHO_BUTTON_ID = "2168928000036289459" as const;

export const SEND_SOW_WIDGET = {
  id: "send-sow",
  name: SEND_SOW_WIDGET_NAME,
  buttonLabel: SEND_SOW_BUTTON_LABEL,
} as const satisfies CrmWidgetDefinition;

export { SendSowWidget } from "./ui/SendSowWidget";
