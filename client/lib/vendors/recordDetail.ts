import type { VendorRecord } from "@/lib/vendors/columns";
import { VENDORS_STATIC_RECORDS } from "@/lib/vendors/static";

/** Fields fetched for the Vendor Overview detail canvas (no SMS). */
export const VENDOR_DETAIL_FIELD_API_NAMES = [
  "Vendor_Name",
  "Phone",
  "Email",
  "City",
  "State",
  "Street",
  "Zip_Code",
  "Country",
  "Website",
  "Status",
  "Vendor_Standing",
  "COI_Expiration",
  "Workers_Compensation_Expiration",
  "Auto_Insurance_Date",
  "Late_Invoice_Count",
  "Progress_Notes",
  "Vendor_Categories",
  "Service_Capabilities",
  "States_Served",
  "Service_Radius_From_Zip_Code",
  "Avg_Price_Acre",
  "Owner",
  "Ops_Rep",
  "Last_Login",
  "App_Version",
  "password",
  "First_Name",
  "Last_Name",
  "Secondary_Phone",
  "Secondary_Email1",
  "CF_Vendor_ID_Number",
  "Org_ID",
  "Wizard",
  "Payment_Terms_Label",
  "Payment_Terms",
  // Compliance docs
  "Workers_Comp_Exemption_Form",
  "W9",
  "W9_URL",
  "MultiState_WC_Forms",
  "MultiState_WC_Urls",
  "Auto_Insurance",
  "Certificate_of_Insurance_Team_upload",
  "Certificate_of_Insurance",
  "Workers_Comp_Team_Upload",
  "Workers_Compensation",
  "Auto_Insurance_Upload",
  "Workers_Comp_Exemption_URL",
  "Workers_Comp_Exemption_Team_upload",
  "Workers_Comp_Exemption_Expiration",
  "W9_Expiration",
  "MultiState_WC_Expiration",
  // Financial
  "Type_of_Account_Financial",
  "CF_Vendor_Bank_Routing_Number",
  "CF_Vendor_Bank_Account_Number",
  "CF_Vendor_Bank_Confirmed_Account_Number",
  "Bank_ACH_Team_Upload",
  "Bank_ACH",
  "Check_Payment_Preferred",
  "Payee_Name",
  "Payee_SSN_EIN",
  "Payee_Address",
  "Payee_Email",
  "Payee_Phone",
  "Remittance_Email",
  "CF_Vendor_EIN",
  "Exchange_Rate",
  "Address_Financial",
  "Phone_Financial",
  // Admin extras (All Fields)
  "Catalyst_Confirmed",
  "VendorID_Auto_generator",
  "Last_Late_Invoice_Month",
  "Latitude",
  "Longitude",
  "Created_Time",
  "Modified_Time",
  "Created_By",
  "Modified_By",
  "Last_Activity_Time",
] as const;

export type VendorDetailTabId =
  | "overview"
  | "compliance"
  | "financial"
  | "all-fields";

export const VENDOR_DETAIL_TABS: { id: VendorDetailTabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "compliance", label: "Compliance" },
  { id: "financial", label: "Financial" },
  { id: "all-fields", label: "All Fields" },
];

export type VendorDetailRecord = {
  id: string;
  fields: Record<string, string>;
  lookups?: Record<string, string>;
  offlineDemo?: boolean;
};

export function formatVendorDetailDate(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw || raw === "-") return "-";
  const iso = raw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return raw;
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatVendorDetailDateTime(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "-";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function displayOrDash(value: string | null | undefined): string {
  const text = (value ?? "").trim();
  return text || "-";
}

export function mapZohoVendorDetail(
  _row: Record<string, unknown>,
  mapped: VendorRecord,
): VendorDetailRecord {
  return {
    id: mapped.id,
    fields: mapped.fields,
    lookups: mapped.lookups,
  };
}

export function getStaticVendorDetail(recordId: string): VendorDetailRecord | null {
  const match = VENDORS_STATIC_RECORDS.find((row) => row.id === recordId);
  if (!match) return null;
  return {
    id: match.id,
    fields: {
      ...match.fields,
      Progress_Notes: "",
      Vendor_Standing: "",
      COI_Expiration: "",
      Workers_Compensation_Expiration: "",
      Auto_Insurance_Date: "",
      Late_Invoice_Count: "",
      Ops_Rep: match.fields.Owner || "",
      Payment_Terms_Label: "Net 45",
      Exchange_Rate: "1",
    },
    offlineDemo: true,
  };
}

export type VendorComplianceRow = {
  id: string;
  document: string;
  expires: string;
  fileUpload: string;
  fileUrl: string;
};

/** Compliance table rows mapped from vendor fields (canvas layout). */
export function buildVendorComplianceRows(
  fields: Record<string, string>,
): VendorComplianceRow[] {
  return [
    {
      id: "coi",
      document: "Certificate of insurance",
      expires: formatVendorDetailDate(fields.COI_Expiration),
      fileUpload: displayOrDash(fields.Certificate_of_Insurance_Team_upload),
      fileUrl: displayOrDash(fields.Certificate_of_Insurance),
    },
    {
      id: "wc",
      document: "Workers compensation",
      expires: formatVendorDetailDate(fields.Workers_Compensation_Expiration),
      fileUpload: displayOrDash(fields.Workers_Comp_Team_Upload),
      fileUrl: displayOrDash(fields.Workers_Compensation),
    },
    {
      id: "wc-ex",
      document: "Workers comp exemption",
      expires: formatVendorDetailDate(fields.Workers_Comp_Exemption_Expiration),
      fileUpload: displayOrDash(fields.Workers_Comp_Exemption_Team_upload),
      fileUrl: displayOrDash(fields.Workers_Comp_Exemption_URL),
    },
    {
      id: "auto",
      document: "Auto insurance",
      expires: formatVendorDetailDate(fields.Auto_Insurance_Date),
      fileUpload: displayOrDash(fields.Auto_Insurance_Upload),
      fileUrl: displayOrDash(fields.Auto_Insurance),
    },
    {
      id: "w9",
      document: "W9",
      expires: formatVendorDetailDate(fields.W9_Expiration),
      fileUpload: displayOrDash(fields.W9),
      fileUrl: displayOrDash(fields.W9_URL),
    },
    {
      id: "mswc",
      document: "Multi-state WC",
      expires: formatVendorDetailDate(fields.MultiState_WC_Expiration),
      fileUpload: displayOrDash(fields.MultiState_WC_Forms),
      fileUrl: displayOrDash(fields.MultiState_WC_Urls),
    },
  ];
}
