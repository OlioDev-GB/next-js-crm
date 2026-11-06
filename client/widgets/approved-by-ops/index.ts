import type { CrmWidgetDefinition } from "@/widgets/types";

export const APPROVED_BY_OPS_BUTTON_LABEL = "Approved by Ops" as const;

export const APPROVED_BY_OPS_WIDGET_NAME = "Approved by Ops" as const;

export const APPROVED_BY_OPS_WIDGET = {
  id: "approved-by-ops",
  name: APPROVED_BY_OPS_WIDGET_NAME,
  buttonLabel: APPROVED_BY_OPS_BUTTON_LABEL,
} as const satisfies CrmWidgetDefinition;

export { ApprovedByOpsWidget } from "./ui/ApprovedByOpsWidget";
