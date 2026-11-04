import type { CrmWidgetDefinition } from "@/widgets/types";
import {
  ADD_MASS_BID_BUTTON_LABEL,
  ADD_MASS_BID_WIDGET_NAME,
} from "@/widgets/add-mass-bid/types";

export const ADD_MASS_BID_WIDGET = {
  id: "add-mass-bid",
  name: ADD_MASS_BID_WIDGET_NAME,
  buttonLabel: ADD_MASS_BID_BUTTON_LABEL,
} as const satisfies CrmWidgetDefinition;

export {
  ADD_MASS_BID_BUTTON_LABEL,
  ADD_MASS_BID_MAX_FILE_BYTES,
  ADD_MASS_BID_MAX_VENDORS,
  ADD_MASS_BID_SEARCH_MIN_CHARS,
  ADD_MASS_BID_WIDGET_NAME,
  ALLOWED_VENDOR_STATUSES,
  SEASONAL_CONTRACT_BIDS_LAYOUT_ID,
  UPLOAD_BID_FILE_FUNCTION,
} from "./types";

export type {
  AddMassBidContextResult,
  AddMassBidPayload,
  AddMassBidResult,
  AddMassBidUploadedFile,
  MassBidLineItem,
  MassBidSowContext,
  SelectedBidConflict,
  SelectedBidsResult,
  VendorSearchResult,
  VendorSuggestion,
} from "./types";

export { AddMassBidWidget } from "./ui/AddMassBidWidget";
