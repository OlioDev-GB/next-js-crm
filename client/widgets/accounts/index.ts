import type { CrmWidgetDefinition } from "@/widgets/types";
import { CREATE_SOW_RECORD_WIDGET } from "@/widgets/create-sow-record";
import { SEND_WITH_ZOHO_SIGN_WIDGET } from "@/widgets/accounts/send-with-zoho-sign";
import { OLIO_MASS_UPDATE_WIDGET } from "@/widgets/olio-mass-update";

/** Accounts list-action widgets — no Zoho “test” buttons. */
export const ACCOUNT_WIDGETS = [
  SEND_WITH_ZOHO_SIGN_WIDGET,
  CREATE_SOW_RECORD_WIDGET,
  OLIO_MASS_UPDATE_WIDGET,
] as const satisfies readonly CrmWidgetDefinition[];

export {
  ACCOUNTS_LIST_ZOHO_SIGN_BUTTON_ID,
  ACCOUNTS_VIEW_ZOHO_SIGN_BUTTON_ID,
  SEND_WITH_ZOHO_SIGN_BUTTON_LABEL,
  SEND_WITH_ZOHO_SIGN_WIDGET,
  ZOHO_SIGN_CRM_ZGID,
  openAccountsZohoSign,
} from "@/widgets/accounts/send-with-zoho-sign";

export {
  CREATE_SOW_RECORD_BUTTON_LABEL,
  CREATE_SOW_RECORD_WIDGET,
  CREATE_SOW_RECORD_WIDGET_NAME,
  CreateSowRecordWidget,
} from "@/widgets/create-sow-record";

export {
  OLIO_MASS_UPDATE_BUTTON_LABEL,
  OLIO_MASS_UPDATE_WIDGET,
  OlioMassUpdateWidget,
} from "@/widgets/olio-mass-update";
