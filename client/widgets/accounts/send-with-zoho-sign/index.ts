import type { CrmWidgetDefinition } from "@/widgets/types";

/** Zoho Accounts list-view custom button label. */
export const SEND_WITH_ZOHO_SIGN_BUTTON_LABEL = "Send with Zoho Sign" as const;

/** Zoho custom button id — Accounts list_view (`MP_Send_with_Zoho_Sign12`). */
export const ACCOUNTS_LIST_ZOHO_SIGN_BUTTON_ID = "2168928000033295175" as const;

/** Zoho custom button id — Accounts detail view (`MP_Send_with_Zoho_Sign1`). */
export const ACCOUNTS_VIEW_ZOHO_SIGN_BUTTON_ID = "2168928000000922870" as const;

/** CRM zgid used by the Zoho Sign marketplace extension (`crmzgid`). */
export const ZOHO_SIGN_CRM_ZGID = "636333168" as const;

export const SEND_WITH_ZOHO_SIGN_WIDGET = {
  id: "accounts-send-with-zoho-sign",
  name: SEND_WITH_ZOHO_SIGN_BUTTON_LABEL,
  buttonLabel: SEND_WITH_ZOHO_SIGN_BUTTON_LABEL,
} as const satisfies CrmWidgetDefinition;

const BULK_SIGN_URL =
  "https://extensions.zoho.com/plugin/zohosign/handler?action=bulkZohoSignDocument";

const CREATE_SIGN_URL =
  "https://extensions.zoho.com/plugin/zohosign/handler?action=createZohoSignDocument";

/**
 * Opens the Zoho Sign marketplace handler for selected Accounts.
 * Uses the list-view (bulk) URL for multiple records, and the detail
 * (create) URL when a single record is selected.
 */
export function openAccountsZohoSign(options: {
  recordIds: string[];
  /** Optional account name for the single-record create flow. */
  recordName?: string;
}): void {
  const ids = [...new Set(options.recordIds.map(String).map((id) => id.trim()))].filter(
    Boolean,
  );
  if (ids.length === 0) return;

  const params = new URLSearchParams({
    module: "Accounts",
    crmzgid: ZOHO_SIGN_CRM_ZGID,
  });

  if (ids.length === 1) {
    params.set("rec_id", ids[0]!);
    if (options.recordName?.trim()) {
      params.set("rec_name", options.recordName.trim());
    }
    window.open(`${CREATE_SIGN_URL}&${params.toString()}`, "_blank", "noopener,noreferrer");
    return;
  }

  params.set("rec_id", ids.join(","));
  window.open(`${BULK_SIGN_URL}&${params.toString()}`, "_blank", "noopener,noreferrer");
}
