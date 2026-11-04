/** Zoho CRM function used by the Update Addendum list button on Deals/SOW. */
export const UPDATE_ADDENDUM_FUNCTION_NAME = "Mass_Update_Addendum" as const;

export const UPDATE_ADDENDUM_BUTTON_LABEL = "Update_Addendum" as const;

export const UPDATE_ADDENDUM_WIDGET_NAME = "Update Addendum" as const;

export type UpdateAddendumPayload = {
  selectedRecordIds: string[];
  text: string;
  module?: string;
};

export type UpdateAddendumResult = {
  ok: boolean;
  message?: string;
  output?: unknown;
};
