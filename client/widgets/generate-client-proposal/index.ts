import type { CrmWidgetDefinition } from "@/widgets/types";

/** Zoho SOW detail custom button label. */
export const GENERATE_CLIENT_PROPOSAL_BUTTON_LABEL =
  "Generate client Proposal" as const;

/** Widget modal title (matches Zoho widget name). */
export const GENERATE_CLIENT_PROPOSAL_WIDGET_NAME =
  "Generate Client Proposal" as const;

/** Zoho custom button id — Deals/SOW detail view. */
export const GENERATE_CLIENT_PROPOSAL_ZOHO_BUTTON_ID =
  "2168928000137310996" as const;

export const GENERATE_CLIENT_PROPOSAL_WIDGET = {
  id: "generate-client-proposal",
  name: GENERATE_CLIENT_PROPOSAL_WIDGET_NAME,
  buttonLabel: GENERATE_CLIENT_PROPOSAL_BUTTON_LABEL,
} as const satisfies CrmWidgetDefinition;

export { GenerateClientProposalWidget } from "./ui/GenerateClientProposalWidget";
