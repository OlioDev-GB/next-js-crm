/** Button label in the SOW list selection toolbar. */
export const ADD_MASS_BID_BUTTON_LABEL = "Add Mass Bid" as const;

/** Widget modal title. */
export const ADD_MASS_BID_WIDGET_NAME = "Add Mass Bid" as const;

export const ADD_MASS_BID_SEARCH_MIN_CHARS = 3;

export const ADD_MASS_BID_MAX_VENDORS = 30;

export const ADD_MASS_BID_MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Zoho CRM function that moves an uploaded CRM file into WorkDrive. */
export const UPLOAD_BID_FILE_FUNCTION = "UploadBidFileToWorkDrive" as const;

/** Layout ID for Seasonal Contract Bids — omit when null. */
export const SEASONAL_CONTRACT_BIDS_LAYOUT_ID: string | null = null;

export const ALLOWED_VENDOR_STATUSES = [
  "Prospective",
  "Active",
  "InActive Incumbent",
] as const;

export type MassBidLineItem = {
  id: string;
  serviceName: string;
  serviceId: string;
  startDate: string;
  endDate: string;
  clientPrice: number;
  vendorPrice: number;
};

export type MassBidSowContext = {
  sowId: string;
  companyNameId?: string;
  companyName?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  locationName: string;
  salesOwnerId?: string;
  opsOwnerId?: string;
  parentAccountId?: string;
  /** Sum of Vendor_Price on Scope_of_Work (for selected-bids confirm UI). */
  vendorPriceTotal: number | null;
  lineItems: MassBidLineItem[];
};

export type AddMassBidContextResult = {
  ok: boolean;
  message?: string;
  lineItemsMatch?: boolean;
  sowCount?: number;
  referenceLineItems?: MassBidLineItem[];
  sows?: MassBidSowContext[];
};

export type VendorSuggestion = {
  id: string;
  name: string;
  status?: string;
};

export type VendorSearchResult = {
  ok: boolean;
  message?: string;
  vendors?: VendorSuggestion[];
};

export type SelectedBidConflict = {
  id: string;
  name: string;
  vendorName: string;
  vendorPrice: number | null;
  sowId: string;
};

export type SelectedBidsResult = {
  ok: boolean;
  message?: string;
  bids?: SelectedBidConflict[];
};

export type AddMassBidPayload = {
  selectedRecordIds: string[];
  vendorId: string;
  selectedBid: boolean;
  bidNotes: string;
  vendorPrices: number[];
  confirmUncheck?: boolean;
  bidFileUrl?: string;
};

export type AddMassBidUploadedFile = {
  name: string;
  type: string;
  bytes: Uint8Array;
  size: number;
};

export type AddMassBidResult = {
  ok: boolean;
  message?: string;
  createdCount?: number;
  /** When true, UI must confirm unchecking existing Selected_Bid records. */
  requiresConfirm?: boolean;
  selectedBids?: SelectedBidConflict[];
  errors?: Array<{ sowId: string; message: string }>;
};
