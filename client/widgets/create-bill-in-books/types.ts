export type CreateBillInBooksResult = {
  ok: boolean;
  message?: string;
  total?: number | string;
  skipped?: number | string;
  success?: number | string;
  failed?: number | string;
  log?: string;
  raw?: unknown;
};
