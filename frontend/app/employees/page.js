"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Box, Container, Typography, Stack, TextField, InputAdornment, Button,
  CircularProgress, Pagination, Chip, MenuItem, Paper, Divider, Grid,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";

import { toast } from "react-toastify";

import ProtectedRoute from "../../components/ProtectedRoute";
import Navbar from "../../components/Navbar";
import EmployeeCard from "../../components/EmployeeCard";
import StatCard from "../../components/StatCard";
import api from "../../lib/api";

const STATUSES = ["", "Active", "Resigned", "Terminated"];

function EmployeesInner() {
  const router = useRouter();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = (pageNum = 1) => {
    setLoading(true);
    api
      .get("/employees", { params: { page: pageNum, limit: 12, search, status } })
      .then((res) => {
        setRecords(res.data.records || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotal(res.data.pagination?.total || 0);
        setPage(res.data.pagination?.page || 1);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(() => load(1), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status]);

  const handleDelete = async (employee) => {
    if (!window.confirm(`Delete employee "${employee.name}"? This only works if they have no asset records on file.`)) return;
    try {
      await api.delete(`/employees/${employee._id}`);
      load(page);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not delete this employee.");
    }
  };

  const clearFilters = () => { setSearch(""); setStatus(""); };
  const hasFilters = search.trim() !== "" || status !== "";

  const activeCount = records.filter((r) => r.status === "Active").length;
  const withAssetsCount = records.filter((r) => (r.assetCounts?.active || 0) > 0).length;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ py: { xs: 1.5, sm: 2.5 }, px: { xs: 1.25, sm: 2, md: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.75 }}>
          <Stack direction="row" alignItems="center" spacing={1.1} sx={{ minWidth: 0 }}>
            <Box sx={{ width: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 }, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 2, background: "linear-gradient(135deg, #8B5CF6, #6D28D9)", color: "#FFFFFF" }}>
              <BadgeRoundedIcon sx={{ fontSize: { xs: 17, sm: 19 } }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: { xs: 17, sm: 20 }, lineHeight: 1.2, fontWeight: 800, color: "text.primary" }}>Employees</Typography>
              <Typography sx={{ fontSize: { xs: 10, sm: 11 }, color: "text.secondary", display: { xs: "none", sm: "block" } }}>
                Profiles, joining/exit status, and what they currently hold
              </Typography>
            </Box>
          </Stack>

          <Button
            variant="contained" size="small"
            startIcon={<AddCircleIcon sx={{ fontSize: 18 }} />}
            onClick={() => router.push("/employees/new")}
            sx={{ flexShrink: 0, minHeight: 38, px: { xs: 1.4, sm: 2 }, borderRadius: 2, textTransform: "none", fontWeight: 700, fontSize: { xs: 11.5, sm: 12.5 }, whiteSpace: "nowrap", background: "linear-gradient(135deg, #8B5CF6, #6D28D9)" }}
          >
            Add Employee
          </Button>
        </Stack>

        <Grid container spacing={{ xs: 1, sm: 1.25 }} sx={{ mb: 1.75 }}>
          <Grid item xs={6} sm={4}>
            <StatCard icon={<BadgeRoundedIcon />} label="Total Employees" value={total} color="#6D28D9" bg="rgba(139,92,246,0.15)" />
          </Grid>
          <Grid item xs={6} sm={4}>
            <StatCard icon={<BadgeRoundedIcon />} label="Active (this page)" value={activeCount} color="#4ADE80" bg="rgba(74,222,128,0.15)" />
          </Grid>
          <Grid item xs={6} sm={4}>
            <StatCard icon={<BadgeRoundedIcon />} label="Holding Assets (this page)" value={withAssetsCount} color="#60A5FA" bg="rgba(96,165,250,0.15)" />
          </Grid>
        </Grid>

        <Paper elevation={0} sx={{ p: { xs: 1.25, sm: 1.75 }, mb: 2, borderRadius: { xs: 2.5, sm: 3 }, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ xs: "stretch", sm: "center" }}>
            <TextField
              fullWidth size="small" placeholder="Search by name, code, designation, department..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 20, color: "text.secondary" }} /></InputAdornment> }}
            />
            <TextField select size="small" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ width: { xs: "100%", sm: 170 }, flexShrink: 0 }} SelectProps={{ displayEmpty: true }}>
              {STATUSES.map((s) => <MenuItem key={s || "all"} value={s}>{s || "All Statuses"}</MenuItem>)}
            </TextField>
            {hasFilters && <Button onClick={clearFilters} sx={{ minHeight: 40, flexShrink: 0, textTransform: "none", color: "primary.light", fontWeight: 650 }}>Clear</Button>}
          </Stack>
        </Paper>

        {loading ? (
          <Paper elevation={0} sx={{ minHeight: 260, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
            <CircularProgress size={30} thickness={4} sx={{ color: "primary.main" }} />
            <Typography sx={{ mt: 1.25, fontSize: 12, color: "text.secondary" }}>Loading...</Typography>
          </Paper>
        ) : records.length === 0 ? (
          <Paper elevation={0} sx={{ minHeight: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", px: 2, borderRadius: 3, border: "1px dashed", borderColor: "divider", bgcolor: "background.paper" }}>
            <BadgeRoundedIcon sx={{ fontSize: 32, color: "primary.main", opacity: 0.6, mb: 1 }} />
            <Typography sx={{ fontSize: 16, fontWeight: 750, color: "text.primary" }}>No employees found</Typography>
            <Typography sx={{ mt: 0.5, maxWidth: 320, fontSize: 12, color: "text.secondary" }}>
              {hasFilters ? "Try changing your filters." : "Add your first employee to start tracking issued assets."}
            </Typography>
            {!hasFilters && (
              <Button variant="contained" startIcon={<AddCircleIcon />} onClick={() => router.push("/employees/new")} sx={{ mt: 2, textTransform: "none", fontWeight: 700, borderRadius: 2, background: "linear-gradient(135deg, #8B5CF6, #6D28D9)" }}>
                Add first employee
              </Button>
            )}
          </Paper>
        ) : (
          <Stack spacing={{ xs: 1.1, sm: 1.35 }}>
            {records.map((employee) => (
              <EmployeeCard
                key={employee._id}
                employee={employee}
                onOpen={(e) => router.push(`/employees/${e._id}`)}
                onEdit={(e) => router.push(`/employees/${e._id}`)}
                onDelete={handleDelete}
              />
            ))}
          </Stack>
        )}

        {!loading && totalPages > 1 && (
          <Paper elevation={0} sx={{ mt: 2.5, py: 1.25, display: "flex", justifyContent: "center", borderRadius: 2.5, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
            <Pagination count={totalPages} page={page} onChange={(_e, value) => load(value)} shape="rounded" siblingCount={0} boundaryCount={1} />
          </Paper>
        )}

        <Divider sx={{ mt: 3, opacity: 0.3 }} />
        <Typography sx={{ textAlign: "center", mt: 1.5, mb: 1, fontSize: 10, color: "text.secondary" }}>
          Expense Reminder • Employees
        </Typography>
      </Container>
    </Box>
  );
}

export default function EmployeesPage() {
  return (
    <ProtectedRoute>
      <EmployeesInner />
    </ProtectedRoute>
  );
}
