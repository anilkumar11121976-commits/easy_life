"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box, Container, Paper, Typography, TextField, MenuItem, Button, Stack,
  Alert, CircularProgress, Avatar, IconButton, Autocomplete,
} from "@mui/material";

import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import CloseIcon from "@mui/icons-material/Close";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";

import { toast } from "react-toastify";

import api from "../../lib/api";
import ImageLightbox from "../../components/ImageLightbox";

const STATUSES = ["Active", "Resigned", "Terminated"];

const toDateInputValue = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
};

export default function EmployeeForm({ mode = "create", initialData = null, onDone }) {
  const isEdit = mode === "edit";
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: "",
    employeeCode: "",
    designation: "",
    department: "",
    email: "",
    phone: "",
    joiningDate: toDateInputValue(new Date()),
    status: "Active",
    lastWorkingDate: "",
    remarks: "",
  });

  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [designationOptions, setDesignationOptions] = useState([]);

  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [removePhoto, setRemovePhoto] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const update = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    api.get("/employees/suggestions/departments").then((res) => setDepartmentOptions(res.data || [])).catch(() => {});
    api.get("/employees/suggestions/designations").then((res) => setDesignationOptions(res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit && initialData) {
      setForm({
        name: initialData.name || "",
        employeeCode: initialData.employeeCode || "",
        designation: initialData.designation || "",
        department: initialData.department || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        joiningDate: toDateInputValue(initialData.joiningDate),
        status: initialData.status || "Active",
        lastWorkingDate: toDateInputValue(initialData.lastWorkingDate),
        remarks: initialData.remarks || "",
      });
      setPhotoUrl(initialData.photoUrl || "");
    }
  }, [isEdit, initialData]);

  const handlePhotoSelected = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB.");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setRemovePhoto(false);
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview("");
    if (photoUrl) setRemovePhoto(true);
    setPhotoUrl("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Employee name is required.");
      toast.error("Employee name is required.");
      return;
    }
    if (form.status !== "Active" && !form.lastWorkingDate) {
      setError("Enter the last working date for a resigned/terminated employee.");
      toast.error("Enter the last working date.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      if (photoFile) formData.append("photo", photoFile);
      if (isEdit && removePhoto) formData.append("removePhoto", "true");

      if (isEdit) {
        await api.put(`/employees/${initialData._id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Employee updated.");
      } else {
        await api.post("/employees", formData, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Employee added.");
      }

      onDone?.();
    } catch (err) {
      const message = err?.response?.data?.message || "Could not save this employee.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const currentPreview = photoPreview || (!removePhoto ? photoUrl : "");

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 3 } }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Box sx={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 2, background: "linear-gradient(135deg, #8B5CF6, #6D28D9)", color: "#fff" }}>
          <BadgeRoundedIcon fontSize="small" />
        </Box>
        <Typography variant="h5" fontWeight={800} sx={{ color: "text.primary" }}>
          {isEdit ? "Edit Employee" : "Add Employee"}
        </Typography>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.75, sm: 3 }, border: "1px solid", borderColor: "divider",
          borderRadius: { xs: 2.5, sm: 3 }, backgroundColor: "background.paper",
          boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
        }}
      >
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {/* PHOTO */}
            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 0.8 }}>
                PHOTO (OPTIONAL)
              </Typography>
              <Stack direction="row" spacing={1.5} alignItems="center">
                {currentPreview ? (
                  <Box sx={{ position: "relative" }}>
                    <Avatar src={currentPreview} onClick={() => setLightboxOpen(true)} sx={{ width: 76, height: 76, cursor: "pointer" }} />
                    <IconButton
                      size="small"
                      onClick={clearPhoto}
                      sx={{ position: "absolute", top: -6, right: -6, bgcolor: "error.main", color: "#fff", width: 22, height: 22, "&:hover": { bgcolor: "error.dark" } }}
                    >
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                ) : (
                  <Button variant="outlined" component="label" startIcon={<AddAPhotoIcon />} sx={{ textTransform: "none", borderRadius: 2, height: 76 }}>
                    Upload Photo
                    <input
                      ref={fileInputRef}
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={(e) => {
                        handlePhotoSelected(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </Button>
                )}
              </Stack>
            </Box>

            <TextField label="Full name" required fullWidth value={form.name} onChange={(e) => update("name")(e.target.value)} />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Employee code (optional)" fullWidth value={form.employeeCode} onChange={(e) => update("employeeCode")(e.target.value)} />
              <TextField label="Joining date" type="date" fullWidth value={form.joiningDate} onChange={(e) => update("joiningDate")(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Autocomplete
                freeSolo
                fullWidth
                options={designationOptions}
                inputValue={form.designation}
                onInputChange={(_e, value) => update("designation")(value)}
                renderInput={(params) => <TextField {...params} label="Designation" fullWidth />}
              />
              <Autocomplete
                freeSolo
                fullWidth
                options={departmentOptions}
                inputValue={form.department}
                onInputChange={(_e, value) => update("department")(value)}
                renderInput={(params) => <TextField {...params} label="Department" fullWidth />}
              />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Email (optional)" type="email" fullWidth value={form.email} onChange={(e) => update("email")(e.target.value)} />
              <TextField label="Phone (optional)" fullWidth value={form.phone} onChange={(e) => update("phone")(e.target.value)} />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField select label="Status" fullWidth value={form.status} onChange={(e) => update("status")(e.target.value)}>
                {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
              {form.status !== "Active" && (
                <TextField
                  label="Last working date"
                  type="date"
                  fullWidth
                  value={form.lastWorkingDate}
                  onChange={(e) => update("lastWorkingDate")(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              )}
            </Stack>

            <TextField
              label="Remarks (optional)"
              fullWidth
              multiline
              minRows={2}
              value={form.remarks}
              onChange={(e) => update("remarks")(e.target.value)}
            />

            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
              sx={{
                py: 1.2, borderRadius: 2.5, textTransform: "none", fontWeight: 800,
                background: "linear-gradient(135deg,#8B5CF6,#6D28D9)",
                boxShadow: "0 8px 18px rgba(139,92,246,0.30)",
              }}
            >
              {submitting ? "Saving..." : isEdit ? "Save Changes" : "Add Employee"}
            </Button>
          </Stack>
        </Box>
      </Paper>

      <ImageLightbox open={lightboxOpen} images={currentPreview ? [{ url: currentPreview }] : []} startIndex={0} onClose={() => setLightboxOpen(false)} />
    </Container>
  );
}
