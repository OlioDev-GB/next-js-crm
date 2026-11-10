import type { CrmWidgetDefinition } from "@/widgets/types";

/** Zoho SOW detail custom button label. */
export const OPPORTUNITY_SPOTTED_BUTTON_LABEL =
  "Opportunity Spotted Stage" as const;

/** Widget modal title. */
export const OPPORTUNITY_SPOTTED_WIDGET_NAME = "Opportunity Spotted" as const;

/** Zoho custom button id — Deals/SOW detail view (`Test_stage`). */
export const OPPORTUNITY_SPOTTED_ZOHO_BUTTON_ID =
  "2168928000079173011" as const;

/** Stage value that opens this widget from the SOW header stage button. */
export const OPPORTUNITY_SPOTTED_STAGE = "Opportunity Spotted" as const;

export const OPPORTUNITY_SPOTTED_WIDGET = {
  id: "opportunity-spotted",
  name: OPPORTUNITY_SPOTTED_WIDGET_NAME,
  buttonLabel: OPPORTUNITY_SPOTTED_BUTTON_LABEL,
} as const satisfies CrmWidgetDefinition;

export { OpportunitySpottedWidget } from "./ui/OpportunitySpottedWidget";
