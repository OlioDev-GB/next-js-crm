import type { CrmWidgetDefinition } from "@/widgets/types";

export const CREATE_SOW_RECORD_BUTTON_LABEL = "Create Sow Record" as const;

export const CREATE_SOW_RECORD_WIDGET_NAME = "Create SOW Records - List" as const;

export const CREATE_SOW_RECORD_WIDGET = {
  id: "create-sow-record",
  name: CREATE_SOW_RECORD_WIDGET_NAME,
  buttonLabel: CREATE_SOW_RECORD_BUTTON_LABEL,
} as const satisfies CrmWidgetDefinition;

export { CreateSowRecordWidget } from "./ui/CreateSowRecordWidget";
