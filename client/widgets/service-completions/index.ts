import type { CrmWidgetDefinition } from "@/widgets/types";
import { SC_LIST_FUNCTION_ACTIONS } from "@/widgets/service-completions/types";

export const CREATE_SC_VENDOR_INVOICE_BUTTON_LABEL =
  SC_LIST_FUNCTION_ACTIONS["create-vendor-invoice"].buttonLabel;

export const SOLAR_CLIENT_SYNC_BUTTON_LABEL =
  SC_LIST_FUNCTION_ACTIONS["solar-client-sync"].buttonLabel;

export const CREATE_SC_VENDOR_INVOICE_WIDGET = {
  id: SC_LIST_FUNCTION_ACTIONS["create-vendor-invoice"].id,
  name: SC_LIST_FUNCTION_ACTIONS["create-vendor-invoice"].widgetName,
  buttonLabel: CREATE_SC_VENDOR_INVOICE_BUTTON_LABEL,
} as const satisfies CrmWidgetDefinition;

export const SOLAR_CLIENT_SYNC_WIDGET = {
  id: SC_LIST_FUNCTION_ACTIONS["solar-client-sync"].id,
  name: SC_LIST_FUNCTION_ACTIONS["solar-client-sync"].widgetName,
  buttonLabel: SOLAR_CLIENT_SYNC_BUTTON_LABEL,
} as const satisfies CrmWidgetDefinition;

export {
  SC_LIST_FUNCTION_ACTIONS,
  SC_LIST_FUNCTION_MENU_ITEMS,
  getScListFunctionActionByLabel,
} from "./types";

export type {
  RunScListFunctionPayload,
  RunScListFunctionResult,
  ScListFunctionAction,
  ScListFunctionActionId,
  ScListFunctionMenuItem,
} from "./types";

export { runScListFunction } from "./server/runScListFunction";
export { ScListFunctionActionDialog } from "./ui/ScListFunctionActionDialog";
