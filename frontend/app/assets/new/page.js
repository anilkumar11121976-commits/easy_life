"use client";

import { useRouter } from "next/navigation";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Navbar from "../../../components/Navbar";
import AssetIssuanceForm from "../AssetIssuanceForm";

function NewAssetInner() {
  const router = useRouter();
  return (
    <>
      <Navbar />
      <AssetIssuanceForm mode="create" onDone={() => router.push("/assets")} />
    </>
  );
}

export default function NewAssetPage() {
  return (
    <ProtectedRoute>
      <NewAssetInner />
    </ProtectedRoute>
  );
}
