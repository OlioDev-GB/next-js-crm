/** Zoho Service Completions list-view custom buttons that run Deluge functions. */

export const SC_LIST_FUNCTION_ACTIONS = {
  "create-vendor-invoice": {
    id: "create-vendor-invoice",
    buttonLabel: "Create Vendor Invoice",
    widgetName: "Create Vendor Invoice",
    zohoButtonId: "2168928000069124011",
    functionName: "creating_vendor_invoice1",
    confirmVerb: "Create",
    description:
      "Create vendor invoices for the selected service completions.",
  },
  "solar-client-sync": {
    id: "solar-client-sync",
    buttonLabel: "Solar Client Sync",
    widgetName: "Solar Client Sync",
    zohoButtonId: "2168928000111795920",
    functionName: "Sync Standard Solar Images Multiple Records",
    confirmVerb: "Sync",
    description:
      "Sync Standard Solar media for the selected service completions.",
  },
} as const;

export type ScListFunctionActionId = keyof typeof SC_LIST_FUNCTION_ACTIONS;

export type ScListFunctionAction =
  (typeof SC_LIST_FUNCTION_ACTIONS)[ScListFunctionActionId];

/** Items shown in the Buttons dropdown (Solar only here — not also on the toolbar). */
export const SC_LIST_FUNCTION_MENU_ITEMS = [
  SC_LIST_FUNCTION_ACTIONS["create-vendor-invoice"].buttonLabel,
  SC_LIST_FUNCTION_ACTIONS["solar-client-sync"].buttonLabel,
] as const;

export type ScListFunctionMenuItem =
  (typeof SC_LIST_FUNCTION_MENU_ITEMS)[number];

export function getScListFunctionActionByLabel(
  label: string,
): ScListFunctionAction | undefined {
  return Object.values(SC_LIST_FUNCTION_ACTIONS).find(
    (action) => action.buttonLabel === label,
  );
}

export type RunScListFunctionPayload = {
  actionId: ScListFunctionActionId;
  selectedRecordIds: string[];
  module?: string;
};

export type RunScListFunctionResult = {
  ok: boolean;
  message?: string;
  /** Raw Zoho execute_custom_button / function output when available. */
  output?: unknown;
};
