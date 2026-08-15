"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import TransportTripForm from "@/components/transport/TransportTripForm";

function TransportFormPage() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  return <TransportTripForm editId={editId} />;
}

export default function NewTransportPage() {
  return (
    <Suspense
      fallback={
        <div className="erp-fleet-surface page-enter pb-8">
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
          </div>
        </div>
      }
    >
      <TransportFormPage />
    </Suspense>
  );
}
