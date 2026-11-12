"use client";

import { useRouter } from "next/navigation";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Navbar from "../../../components/Navbar";
import EmployeeForm from "../EmployeeForm";

function NewEmployeeInner() {
  const router = useRouter();
  return (
    <>
      <Navbar />
      <EmployeeForm mode="create" onDone={() => router.push("/employees")} />
    </>
  );
}

export default function NewEmployeePage() {
  return (
    <ProtectedRoute>
      <NewEmployeeInner />
    </ProtectedRoute>
  );
}
