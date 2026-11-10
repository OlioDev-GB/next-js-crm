/** Zoho SOW (Deals) detail-view “Create Bid” custom function button. */

export const CREATE_BID_BUTTON_LABEL = "Create Bid" as const;

export const CREATE_BID_WIDGET_NAME = "Create Bid" as const;

/** Zoho custom button id (`Create_Bid` on Deals). */
export const CREATE_BID_ZOHO_BUTTON_ID = "2168928000036299007" as const;

export const CREATE_BID_MODULE = "Deals" as const;

/** Fallback CRM function used by the Create Bid Test widget. */
export const CREATE_BID_FUNCTION_API_NAME = "create_bid_from_sow" as const;

export type CreateBidResult = {
  ok: boolean;
  message?: string;
  output?: unknown;
};
