import type { CrmWidgetDefinition } from "@/widgets/types";
import { ACTIVATE_VENDORS_WIDGET } from "@/widgets/activate-vendors";
import { ADD_MASS_BID_WIDGET } from "@/widgets/add-mass-bid";
import { ADD_MASS_SUBFORM_WIDGET } from "@/widgets/add-mass-subform";
import { COMPLIANCE_FIELDS_WIDGET } from "@/widgets/compliance-fields";
import { CREATE_CONTRACT_PDF_WIDGET } from "@/widgets/create-contract-pdf";
import { CREATE_SOW_RECORD_WIDGET } from "@/widgets/create-sow-record";
import { CREATE_VENDOR_INVOICE_RECORDS_WIDGET } from "@/widgets/create-vendor-invoice-records";
import { MASS_RENEWAL_CONTRACTS_WIDGET } from "@/widgets/mass-renewal-contracts";
import { MISSING_INVOICE_EMAIL_WIDGET } from "@/widgets/missing-invoice-email";
import { OLIO_MASS_UPDATE_WIDGET } from "@/widgets/olio-mass-update";
import { PO_ADDENDUM_WIDGET } from "@/widgets/po-addendum";
import { SEND_MESSAGE_WIDGET } from "@/widgets/send-message";
import { CLONE_CONTRACT_WIDGET } from "@/widgets/clone-contract";
import { CREATE_SERVICE_COMPLETION_WIDGET } from "@/widgets/create-service-completion";
import { CLIENT_SENDING_RFP_WIDGET } from "@/widgets/client-sending-rfp";
import { STATUS_VENDOR_COMPLIANCE_WIDGET } from "@/widgets/status-vendor-compliance";
import { UPDATE_ADDENDUM_WIDGET } from "@/widgets/update-addendum";
import {
  CREATE_SC_VENDOR_INVOICE_WIDGET,
  SOLAR_CLIENT_SYNC_WIDGET,
} from "@/widgets/service-completions";

/**
 * Registry of list-action widgets.
 * Add new widgets here so buttons can resolve them by label or id.
 */
export const CRM_WIDGETS = [
  CREATE_VENDOR_INVOICE_RECORDS_WIDGET,
  OLIO_MASS_UPDATE_WIDGET,
  ADD_MASS_SUBFORM_WIDGET,
  ADD_MASS_BID_WIDGET,
  UPDATE_ADDENDUM_WIDGET,
  ACTIVATE_VENDORS_WIDGET,
  MISSING_INVOICE_EMAIL_WIDGET,
  MASS_RENEWAL_CONTRACTS_WIDGET,
  SEND_MESSAGE_WIDGET,
  CREATE_CONTRACT_PDF_WIDGET,
  CREATE_SOW_RECORD_WIDGET,
  COMPLIANCE_FIELDS_WIDGET,
  PO_ADDENDUM_WIDGET,
  CLONE_CONTRACT_WIDGET,
  CREATE_SERVICE_COMPLETION_WIDGET,
  CLIENT_SENDING_RFP_WIDGET,
  STATUS_VENDOR_COMPLIANCE_WIDGET,
  CREATE_SC_VENDOR_INVOICE_WIDGET,
  SOLAR_CLIENT_SYNC_WIDGET,
] as const satisfies readonly CrmWidgetDefinition[];

export type CrmWidgetId = (typeof CRM_WIDGETS)[number]["id"];

export function getWidgetByButtonLabel(
  buttonLabel: string,
): CrmWidgetDefinition | undefined {
  return CRM_WIDGETS.find((widget) => widget.buttonLabel === buttonLabel);
}

export function getWidgetById(id: string): CrmWidgetDefinition | undefined {
  return CRM_WIDGETS.find((widget) => widget.id === id);
}

export type { CrmWidgetDefinition, WidgetOpenContext } from "@/widgets/types";
export {
  ACTIVATE_VENDORS_WIDGET,
  ActivateVendorsWidget,
} from "@/widgets/activate-vendors";
export {
  ADD_MASS_BID_WIDGET,
  ADD_MASS_BID_BUTTON_LABEL,
  AddMassBidWidget,
} from "@/widgets/add-mass-bid";
export {
  ADD_MASS_SUBFORM_WIDGET,
  AddMassSubformWidget,
} from "@/widgets/add-mass-subform";
export {
  UPDATE_ADDENDUM_WIDGET,
  UPDATE_ADDENDUM_BUTTON_LABEL,
  UpdateAddendumWidget,
} from "@/widgets/update-addendum";
export {
  CREATE_VENDOR_INVOICE_RECORDS_WIDGET,
  CreateVendorInvoiceRecordsWidget,
} from "@/widgets/create-vendor-invoice-records";
export {
  MASS_RENEWAL_CONTRACTS_WIDGET,
  MassRenewalContractsWidget,
} from "@/widgets/mass-renewal-contracts";
export {
  MISSING_INVOICE_EMAIL_WIDGET,
  MissingInvoiceEmailWidget,
} from "@/widgets/missing-invoice-email";
export {
  OLIO_MASS_UPDATE_WIDGET,
  OlioMassUpdateWidget,
} from "@/widgets/olio-mass-update";
export {
  SEND_MESSAGE_WIDGET,
  SendMessageWidget,
} from "@/widgets/send-message";
export {
  CREATE_CONTRACT_PDF_WIDGET,
  CreateContractPdfWidget,
} from "@/widgets/create-contract-pdf";
export {
  CREATE_SOW_RECORD_WIDGET,
  CREATE_SOW_RECORD_BUTTON_LABEL,
  CreateSowRecordWidget,
} from "@/widgets/create-sow-record";
export {
  COMPLIANCE_FIELDS_WIDGET,
  ComplianceFieldsWidget,
} from "@/widgets/compliance-fields";
export {
  PO_ADDENDUM_WIDGET,
  PoAddendumWidget,
} from "@/widgets/po-addendum";
export {
  CLONE_CONTRACT_WIDGET,
  CloneContractWidget,
} from "@/widgets/clone-contract";
export {
  CREATE_SERVICE_COMPLETION_WIDGET,
  CREATE_SERVICE_COMPLETION_BUTTON_LABEL,
  createServiceCompletionFromContract,
} from "@/widgets/create-service-completion";
export {
  CLIENT_SENDING_RFP_WIDGET,
  CLIENT_SENDING_RFP_BUTTON_LABEL,
  ClientSendingRfpWidget,
} from "@/widgets/client-sending-rfp";
export {
  STATUS_VENDOR_COMPLIANCE_WIDGET,
  STATUS_VENDOR_COMPLIANCE_BUTTON_LABEL,
  StatusVendorComplianceWidget,
} from "@/widgets/status-vendor-compliance";
export {
  CREATE_SC_VENDOR_INVOICE_WIDGET,
  CREATE_SC_VENDOR_INVOICE_BUTTON_LABEL,
  SOLAR_CLIENT_SYNC_WIDGET,
  SOLAR_CLIENT_SYNC_BUTTON_LABEL,
  ScListFunctionActionDialog,
  runScListFunction,
} from "@/widgets/service-completions";
