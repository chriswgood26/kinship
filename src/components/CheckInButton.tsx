"use client";

import { useState } from "react";
import CopayCollectionModal from "./CopayCollectionModal";

interface Props {
  appointmentId: string;
  patientId: string;
  patientName: string;
  currentStatus: string;
  copayAmount: number | null;
}

export default function CheckInButton({ appointmentId, patientId, patientName, currentStatus, copayAmount }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [checkedIn, setCheckedIn] = useState(currentStatus === "arrived");

  if (checkedIn || currentStatus === "completed" || currentStatus === "cancelled" || currentStatus === "no_show") {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-emerald-400 transition-colors whitespace-nowrap"
      >
        ✓ Check In
      </button>

      {showModal && (
        <CopayCollectionModal
          appointmentId={appointmentId}
          patientId={patientId}
          patientName={patientName}
          copayAmount={copayAmount}
          onClose={() => setShowModal(false)}
          onComplete={() => {
            setShowModal(false);
            setCheckedIn(true);
          }}
        />
      )}
    </>
  );
}
