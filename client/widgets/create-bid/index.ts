import type { CrmWidgetDefinition } from "@/widgets/types";
import {
  CREATE_BID_BUTTON_LABEL,
  CREATE_BID_WIDGET_NAME,
} from "@/widgets/create-bid/types";

export const CREATE_BID_WIDGET = {
  id: "create-bid",
  name: CREATE_BID_WIDGET_NAME,
  buttonLabel: CREATE_BID_BUTTON_LABEL,
} as const satisfies CrmWidgetDefinition;

export {
  CREATE_BID_BUTTON_LABEL,
  CREATE_BID_WIDGET_NAME,
  CREATE_BID_ZOHO_BUTTON_ID,
  CREATE_BID_MODULE,
  CREATE_BID_FUNCTION_API_NAME,
} from "./types";

export type { CreateBidResult } from "./types";

export { CreateBidDialog } from "./ui/CreateBidDialog";
