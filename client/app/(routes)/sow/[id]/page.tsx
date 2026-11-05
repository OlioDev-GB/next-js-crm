"use client";

import { use } from "react";
import SowRecordDetail from "@/components/sow/SowRecordDetail";

type SowRecordPageProps = {
  params: Promise<{ id: string }>;
};

export default function SowRecordPage({ params }: SowRecordPageProps) {
  const { id } = use(params);
  return <SowRecordDetail recordId={id} />;
}
