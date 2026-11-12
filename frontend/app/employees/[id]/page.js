"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Box, CircularProgress, Stack, Button, Container, Typography, Paper, Chip, Divider } from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import LaptopMacRoundedIcon from "@mui/icons-material/LaptopMacRounded";

import ProtectedRoute from "../../../components/ProtectedRoute";
import Navbar from "../../../components/Navbar";
import EmployeeForm from "../EmployeeForm";
import AssetIssuanceCard from "../../../components/AssetIssuanceCard";
import api from "../../../lib/api";

function EditEmployeeInner() {
  const { id } = useParams();
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get(`/employees/${id}`).then((res) => setEmployee(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const assets = employee?.assets || [];
  const activeAssets = assets.filter((a) => a.status === "Issued");

  return (
    <>
      <Navbar />
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : !employee ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <Typography color="text.secondary">Employee not found.</Typography>
        </Box>
      ) : (
        <>
          <EmployeeForm mode="edit" initialData={employee} onDone={load} />

          <Container maxWidth="sm" sx={{ pb: { xs: 3, sm: 4 } }}>
            <Paper elevation={0} sx={{ p: { xs: 1.75, sm: 2.5 }, borderRadius: { xs: 2.5, sm: 3 }, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <LaptopMacRoundedIcon sx={{ color: "#2563EB" }} />
                  <Typography fontWeight={800}>Assets Issued</Typography>
                  {activeAssets.length > 0 && (
                    <Chip size="small" label={`${activeAssets.length} active`} sx={{ bgcolor: "rgba(96,165,250,0.15)", color: "#2563EB", fontWeight: 700 }} />
                  )}
                </Stack>
                <Button
                  size="small" variant="outlined" startIcon={<AddCircleIcon sx={{ fontSize: 16 }} />}
                  onClick={() => router.push(`/assets/new?employeeId=${employee._id}`)}
                  sx={{ textTransform: "none", borderRadius: 2, whiteSpace: "nowrap" }}
                >
                  Issue Asset
                </Button>
              </Stack>

              {assets.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
                  Nothing issued to this employee yet.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {assets.map((asset) => (
                    <AssetIssuanceCard
                      key={asset._id}
                      asset={asset}
                      onOpen={(a) => router.push(`/assets/${a._id}`)}
                    />
                  ))}
                </Stack>
              )}
            </Paper>

            <Divider sx={{ mt: 3, opacity: 0.3 }} />
            <Typography sx={{ textAlign: "center", mt: 1.5, fontSize: 10, color: "text.secondary" }}>
              Expense Reminder • Employees
            </Typography>
          </Container>
        </>
      )}
    </>
  );
}

export default function EditEmployeePage() {
  return (
    <ProtectedRoute>
      <EditEmployeeInner />
    </ProtectedRoute>
  );
}
