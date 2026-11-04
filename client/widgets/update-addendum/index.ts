import type { CrmWidgetDefinition } from "@/widgets/types";
import {
  UPDATE_ADDENDUM_BUTTON_LABEL,
  UPDATE_ADDENDUM_WIDGET_NAME,
} from "@/widgets/update-addendum/types";

export const UPDATE_ADDENDUM_WIDGET = {
  id: "update-addendum",
  name: UPDATE_ADDENDUM_WIDGET_NAME,
  buttonLabel: UPDATE_ADDENDUM_BUTTON_LABEL,
} as const satisfies CrmWidgetDefinition;

export {
  UPDATE_ADDENDUM_BUTTON_LABEL,
  UPDATE_ADDENDUM_FUNCTION_NAME,
  UPDATE_ADDENDUM_WIDGET_NAME,
} from "./types";

export type {
  UpdateAddendumPayload,
  UpdateAddendumResult,
} from "./types";

export { UpdateAddendumWidget } from "./ui/UpdateAddendumWidget";
