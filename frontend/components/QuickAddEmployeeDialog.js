"use client";

import { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack } from "@mui/material";
import { toast } from "react-toastify";
import api from "../lib/api";

// A fast way to add an employee without leaving the asset-issuance form —
// just name + designation/department. Everything else (photo, email,
// phone, status) can be filled in later from the full Employees page.
export default function QuickAddEmployeeDialog({ open, initialName = "", onClose, onAdded }) {
  const [name, setName] = useState(initialName);
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Employee name is required.");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("designation", designation.trim());
      formData.append("department", department.trim());

      const res = await api.post("/employees", formData, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Employee added.");
      onAdded?.(res.data);
      setName("");
      setDesignation("");
      setDepartment("");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not add employee.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add New Employee</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Full name" fullWidth required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          <TextField label="Designation (optional)" fullWidth value={designation} onChange={(e) => setDesignation(e.target.value)} />
          <TextField label="Department (optional)" fullWidth value={department} onChange={(e) => setDepartment(e.target.value)} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Add Employee"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
