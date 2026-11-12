"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Box, Container, Typography, Stack, TextField, InputAdornment, Button,
  CircularProgress, Pagination, MenuItem, Paper, Divider, Grid, Chip,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import LaptopMacRoundedIcon from "@mui/icons-material/LaptopMacRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";

import ProtectedRoute from "../../components/ProtectedRoute";
import Navbar from "../../components/Navbar";
import AssetIssuanceCard from "../../components/AssetIssuanceCard";
import StatCard from "../../components/StatCard";
import ManageCategoriesDialog from "../../components/ManageCategoriesDialog";
import api from "../../lib/api";

const STATUSES = ["", "Issued", "Returned", "Lost", "Damaged"];

function AssetsInner() {
  const router = useRouter();

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);

  const loadSummary = () => {
    api.get("/asset-issuances/summary").then((res) => setSummary(res.data)).catch(() => {});
  };

  const load = (pageNum = 1) => {
    setLoading(true);
    api
      .get("/asset-issuances", { params: { page: pageNum, limit: 12, search, status, category, overdue: overdueOnly || undefined } })
      .then((res) => {
        setRecords(res.data.records || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setPage(res.data.pagination?.page || 1);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadSummary(); }, []);

  useEffect(() => {
    const t = setTimeout(() => load(1), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, category, overdueOnly]);

  const clearFilters = () => { setSearch(""); setStatus(""); setCategory(""); setOverdueOnly(false); };
  const hasFilters = search.trim() !== "" || status || category || overdueOnly;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ py: { xs: 1.5, sm: 2.5 }, px: { xs: 1.25, sm: 2, md: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.75 }}>
          <Stack direction="row" alignItems="center" spacing={1.1} sx={{ minWidth: 0 }}>
            <Box sx={{ width: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 }, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 2, background: "linear-gradient(135deg, #60A5FA, #2563EB)", color: "#FFFFFF" }}>
              <LaptopMacRoundedIcon sx={{ fontSize: { xs: 17, sm: 19 } }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: { xs: 17, sm: 20 }, lineHeight: 1.2, fontWeight: 800, color: "text.primary" }}>Company Assets</Typography>
              <Typography sx={{ fontSize: { xs: 10, sm: 11 }, color: "text.secondary", display: { xs: "none", sm: "block" } }}>
                What's been issued to whom, and what's come back
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined" size="small"
              startIcon={<TuneRoundedIcon sx={{ fontSize: 18 }} />}
              onClick={() => setManageCategoriesOpen(true)}
              sx={{ flexShrink: 0, minHeight: 38, px: { xs: 1.2, sm: 1.75 }, borderRadius: 2, textTransform: "none", fontWeight: 700, fontSize: { xs: 11.5, sm: 12.5 }, whiteSpace: "nowrap" }}
            >
              Categories
            </Button>
            <Button
              variant="contained" size="small"
              startIcon={<AddCircleIcon sx={{ fontSize: 18 }} />}
              onClick={() => router.push("/assets/new")}
              sx={{ flexShrink: 0, minHeight: 38, px: { xs: 1.4, sm: 2 }, borderRadius: 2, textTransform: "none", fontWeight: 700, fontSize: { xs: 11.5, sm: 12.5 }, whiteSpace: "nowrap", background: "linear-gradient(135deg, #60A5FA, #2563EB)" }}
            >
              Issue Asset
            </Button>
          </Stack>
        </Stack>

        <Grid container spacing={{ xs: 1, sm: 1.25 }} sx={{ mb: 1.75 }}>
          <Grid item xs={6} sm={3}>
            <StatCard icon={<LaptopMacRoundedIcon />} label="Currently Issued" value={summary?.currentlyIssued ?? 0} color="#60A5FA" bg="rgba(96,165,250,0.15)" />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard icon={<LaptopMacRoundedIcon />} label="Returned (total)" value={summary?.returned ?? 0} color="#4ADE80" bg="rgba(74,222,128,0.15)" />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard icon={<WarningAmberRoundedIcon />} label="Lost / Damaged" value={summary?.lostOrDamaged ?? 0} color="#F87171" bg="rgba(248,113,113,0.15)" />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard icon={<LaptopMacRoundedIcon />} label="All-Time Records" value={summary?.totalIssuances ?? 0} color="#8B5CF6" bg="rgba(139,92,246,0.15)" />
          </Grid>
        </Grid>

        {summary?.byCategory?.length > 0 && (
          <Paper elevation={0} sx={{ p: 1.5, mb: 1.75, borderRadius: 2.5, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 1 }}>CURRENTLY ISSUED, BY CATEGORY</Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {summary.byCategory.map((c) => (
                <Chip key={c._id} label={`${c._id || "Other"}: ${c.count}`} size="small" onClick={() => setCategory(c._id || "")} sx={{ cursor: "pointer" }} />
              ))}
            </Stack>
          </Paper>
        )}

        <Paper elevation={0} sx={{ p: { xs: 1.25, sm: 1.75 }, mb: 2, borderRadius: { xs: 2.5, sm: 3 }, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
          <Stack spacing={1.25}>
            <TextField
              fullWidth size="small" placeholder="Search by item, serial number, brand or employee..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 20, color: "text.secondary" }} /></InputAdornment> }}
            />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
              <TextField select size="small" label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 130, flex: 1 }} InputLabelProps={{ shrink: true }} SelectProps={{ displayEmpty: true }}>
                {STATUSES.map((s) => <MenuItem key={s || "all"} value={s}>{s || "All Statuses"}</MenuItem>)}
              </TextField>
              <TextField size="small" label="Category" value={category} onChange={(e) => setCategory(e.target.value)} sx={{ minWidth: 130, flex: 1 }} />
              <Chip
                label="Overdue only"
                onClick={() => setOverdueOnly((o) => !o)}
                sx={{ fontWeight: 700, cursor: "pointer", bgcolor: overdueOnly ? "rgba(251,146,60,0.2)" : "transparent", color: overdueOnly ? "#FB923C" : "text.secondary", border: "1px solid", borderColor: overdueOnly ? "#FB923C" : "divider" }}
              />
              {hasFilters && <Button size="small" onClick={clearFilters} sx={{ textTransform: "none", color: "primary.light", fontWeight: 650 }}>Clear all</Button>}
            </Stack>
          </Stack>
        </Paper>

        {loading ? (
          <Paper elevation={0} sx={{ minHeight: 260, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
            <CircularProgress size={30} thickness={4} sx={{ color: "primary.main" }} />
            <Typography sx={{ mt: 1.25, fontSize: 12, color: "text.secondary" }}>Loading...</Typography>
          </Paper>
        ) : records.length === 0 ? (
          <Paper elevation={0} sx={{ minHeight: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", px: 2, borderRadius: 3, border: "1px dashed", borderColor: "divider", bgcolor: "background.paper" }}>
            <LaptopMacRoundedIcon sx={{ fontSize: 32, color: "#2563EB", opacity: 0.6, mb: 1 }} />
            <Typography sx={{ fontSize: 16, fontWeight: 750, color: "text.primary" }}>No asset records found</Typography>
            <Typography sx={{ mt: 0.5, maxWidth: 320, fontSize: 12, color: "text.secondary" }}>
              {hasFilters ? "Try changing your filters." : "Issue your first item to an employee."}
            </Typography>
            {!hasFilters && (
              <Button variant="contained" startIcon={<AddCircleIcon />} onClick={() => router.push("/assets/new")} sx={{ mt: 2, textTransform: "none", fontWeight: 700, borderRadius: 2, background: "linear-gradient(135deg, #60A5FA, #2563EB)" }}>
                Issue first asset
              </Button>
            )}
          </Paper>
        ) : (
          <Stack spacing={{ xs: 1.1, sm: 1.35 }}>
            {records.map((asset) => (
              <AssetIssuanceCard key={asset._id} asset={asset} showEmployee onOpen={(a) => router.push(`/assets/${a._id}`)} />
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
          Expense Reminder • Company Assets
        </Typography>
      </Container>

      <ManageCategoriesDialog
        open={manageCategoriesOpen}
        onClose={() => setManageCategoriesOpen(false)}
        onChanged={() => { loadSummary(); load(page); }}
      />
    </Box>
  );
}

export default function AssetsPage() {
  return (
    <ProtectedRoute>
      <AssetsInner />
    </ProtectedRoute>
  );
}
