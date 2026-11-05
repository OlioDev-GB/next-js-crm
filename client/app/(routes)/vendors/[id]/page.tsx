"use client";

import { use } from "react";
import VendorRecordDetail from "@/components/vendors/VendorRecordDetail";

type VendorRecordPageProps = {
  params: Promise<{ id: string }>;
};

export default function VendorRecordPage({ params }: VendorRecordPageProps) {
  const { id } = use(params);
  return <VendorRecordDetail recordId={id} />;
}
