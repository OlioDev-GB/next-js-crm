import type { CrmWidgetDefinition } from "@/widgets/types";

export const CREATE_BILL_IN_BOOKS_BUTTON_LABEL = "Create Bill in Books" as const;

export const CREATE_BILL_IN_BOOKS_WIDGET_NAME = "Create Bill in Books" as const;

export const CREATE_BILL_IN_BOOKS_WIDGET = {
  id: "create-bill-in-books",
  name: CREATE_BILL_IN_BOOKS_WIDGET_NAME,
  buttonLabel: CREATE_BILL_IN_BOOKS_BUTTON_LABEL,
} as const satisfies CrmWidgetDefinition;

export { CreateBillInBooksWidget } from "./ui/CreateBillInBooksWidget";
export type { CreateBillInBooksResult } from "./types";
