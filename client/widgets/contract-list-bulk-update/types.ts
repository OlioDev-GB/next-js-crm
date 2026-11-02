/** Zoho CRM standalone function API name (REST). */
export const CONTRACT_LIST_BULK_UPDATE_FUNCTION_NAME =
  "contract_list_bulk_update" as const;

/** Zoho CRM modules supported by `contract_list_bulk_update`. */
export type BulkUpdateModuleName = "Contracts" | "Vendors" | "ServiceCompletions";

export type ContractListBulkUpdatePayload = {
  /** Zoho module API name — required by Deluge (`Contracts` | `Vendors` | `ServiceCompletions`). */
  moduleName: BulkUpdateModuleName;
  /** Record IDs to update. */
  recordIds: string[];
  /** Field API name, e.g. Site_Street or Email. */
  fieldApiName: string;
  /**
   * Value sent to Deluge as text.
   * Lookups/userlookups: prefer related record ID.
   * Booleans: "true" / "false".
   */
  fieldValue: string;
  /** Zoho field data_type (Deluge also re-reads metadata). */
  fieldType: string;
};

export type ContractListBulkUpdateResult = {
  ok: boolean;
  message?: string;
  output?: unknown;
};
