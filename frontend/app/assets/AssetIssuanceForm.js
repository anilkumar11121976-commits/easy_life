"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Box, Container, Paper, Typography, TextField, MenuItem, Button, Stack,
  Alert, CircularProgress, Avatar, IconButton, Chip, Autocomplete, Divider,
} from "@mui/material";

import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import CloseIcon from "@mui/icons-material/Close";
import LaptopMacRoundedIcon from "@mui/icons-material/LaptopMacRounded";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";

import { toast } from "react-toastify";

import api from "../../lib/api";
import ImageLightbox from "../../components/ImageLightbox";
import QuickAddEmployeeDialog from "../../components/QuickAddEmployeeDialog";
import ManageCategoriesDialog from "../../components/ManageCategoriesDialog";

const CONDITIONS = ["New", "Good", "Fair", "Damaged"];
const MAX_PHOTOS = 5;
const MAX_ROWS = 15;

// Common preset categories so the autocomplete isn't empty on first use —
// still fully freeSolo, so anything the company actually hands out can be
// typed in and it'll show up as a suggestion from then on.
const PRESET_CATEGORIES = [
  "Laptop", "Desktop", "Monitor", "Mouse", "Keyboard", "Headphone",
  "Mobile Phone", "SIM Card", "ID Card", "Access Card", "Charger",
  "Bag", "Pen Drive", "Hard Disk", "Webcam", "Chair", "Other",
];

const toDateInputValue = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
};

let rowIdCounter = 0;
const blankRow = () => ({
  id: ++rowIdCounter,
  itemName: "",
  category: "",
  brand: "",
  serialNumber: "",
  quantity: "1",
  condition: "Good",
  photoFiles: [],
  photoPreviews: [],
});

export default function AssetIssuanceForm({ mode = "create", initialData = null, onDone }) {
  const isEdit = mode === "edit";
  const searchParams = useSearchParams();

  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddSeedName, setQuickAddSeedName] = useState("");
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);

  const [categoryOptions, setCategoryOptions] = useState(PRESET_CATEGORIES);

  // Shared across every item in this batch (create mode) or the one
  // record being edited.
  const [issueDate, setIssueDate] = useState(toDateInputValue(new Date()));
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [remarks, setRemarks] = useState("");

  // CREATE: one or more items being issued to the same employee at once.
  const [rows, setRows] = useState([blankRow()]);

  // EDIT: single record's existing/new issue photos (unchanged shape
  // from before — editing still operates on exactly one record).
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [removedPhotoIds, setRemovedPhotoIds] = useState([]);

  const [lightbox, setLightbox] = useState({ open: false, images: [], index: 0 });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // =========================================================
  // LOAD EMPLOYEES + CATEGORY SUGGESTIONS
  // =========================================================
  const loadEmployees = () => {
    api.get("/employees", { params: { limit: 100, status: "Active" } })
      .then((res) => setEmployeeOptions(res.data.records || []))
      .catch(() => {});
  };

  const loadCategories = () => {
    Promise.all([
      api.get("/asset-categories").catch(() => ({ data: [] })),
      api.get("/asset-issuances/suggestions/categories").catch(() => ({ data: [] })),
    ]).then(([managed, legacy]) => {
      const names = [
        ...PRESET_CATEGORIES,
        ...(managed.data || []).map((c) => c.name),
        ...(legacy.data || []),
      ];
      setCategoryOptions([...new Set(names)]);
    });
  };

  useEffect(() => {
    loadEmployees();
    loadCategories();
  }, []);

  // Pre-fill employee from "+ Issue Asset" on an employee's own page.
  useEffect(() => {
    if (isEdit) return;
    const employeeId = searchParams.get("employeeId");
    if (!employeeId || !employeeOptions.length) return;
    const match = employeeOptions.find((e) => e._id === employeeId);
    if (match) setSelectedEmployee(match);
  }, [isEdit, searchParams, employeeOptions]);

  // =========================================================
  // LOAD EDIT DATA
  // =========================================================
  useEffect(() => {
    if (isEdit && initialData) {
      setIssueDate(toDateInputValue(initialData.issueDate));
      setExpectedReturnDate(toDateInputValue(initialData.expectedReturnDate));
      setRemarks(initialData.remarks || "");
      setSelectedEmployee(initialData.employee || null);
      setExistingPhotos(initialData.issuePhotos || []);
      setRows([{
        ...blankRow(),
        itemName: initialData.itemName || "",
        category: initialData.category || "",
        brand: initialData.brand || "",
        serialNumber: initialData.serialNumber || "",
        quantity: String(initialData.quantity ?? 1),
        condition: initialData.condition || "Good",
      }]);
    }
  }, [isEdit, initialData]);

  // =========================================================
  // EMPLOYEE QUICK-ADD — when the person isn't in the list yet
  // =========================================================
  const handleEmployeeAdded = (newEmployee) => {
    setEmployeeOptions((prev) => [newEmployee, ...prev]);
    setSelectedEmployee(newEmployee);
    setQuickAddOpen(false);
  };

  // =========================================================
  // ROW MANAGEMENT (create mode — multiple items in one go)
  // =========================================================
  const updateRow = (id, key) => (value) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  };

  const addRow = () => {
    if (rows.length >= MAX_ROWS) {
      toast.error(`You can issue at most ${MAX_ROWS} items in one go.`);
      return;
    }
    setRows((prev) => [...prev, blankRow()]);
  };

  const removeRow = (id) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };

  const handleRowPhotosSelected = (id, files) => {
    const incoming = Array.from(files || []);
    if (!incoming.length) return;

    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const spaceLeft = MAX_PHOTOS - r.photoFiles.length;
        if (spaceLeft <= 0) {
          toast.error(`You can attach at most ${MAX_PHOTOS} photos per item.`);
          return r;
        }
        const toAdd = incoming.slice(0, spaceLeft);
        return {
          ...r,
          photoFiles: [...r.photoFiles, ...toAdd],
          photoPreviews: [...r.photoPreviews, ...toAdd.map((f) => URL.createObjectURL(f))],
        };
      })
    );
  };

  const removeRowPhoto = (id, index) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              photoFiles: r.photoFiles.filter((_, i) => i !== index),
              photoPreviews: r.photoPreviews.filter((_, i) => i !== index),
            }
          : r
      )
    );
  };

  // =========================================================
  // EDIT-MODE PHOTOS (single record)
  // =========================================================
  const removeExistingPhoto = (publicId) => {
    setExistingPhotos((prev) => prev.filter((p) => p.publicId !== publicId));
    setRemovedPhotoIds((prev) => [...prev, publicId]);
  };

  const openLightbox = (images, index) => setLightbox({ open: true, images, index });

  // =========================================================
  // SUBMIT — EDIT (single record)
  // =========================================================
  const submitEdit = async () => {
    const row = rows[0];
    const formData = new FormData();
    formData.append("itemName", row.itemName);
    formData.append("category", row.category);
    formData.append("brand", row.brand);
    formData.append("serialNumber", row.serialNumber);
    formData.append("quantity", row.quantity);
    formData.append("condition", row.condition);
    formData.append("issueDate", issueDate);
    formData.append("expectedReturnDate", expectedReturnDate);
    formData.append("remarks", remarks);
    formData.append("removeIssuePhotoIds", JSON.stringify(removedPhotoIds));
    row.photoFiles.forEach((f) => formData.append("issuePhotos", f));

    await api.put(`/asset-issuances/${initialData._id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
    toast.success("Asset record updated.");
    onDone?.();
  };

  // =========================================================
  // SUBMIT — CREATE (one or more items, same employee/issue date)
  // =========================================================
  const submitCreate = async () => {
    const invalidIndex = rows.findIndex((r) => !r.itemName.trim());
    if (invalidIndex !== -1) {
      throw new Error(`Item #${invalidIndex + 1} needs a name.`);
    }

    let remaining = rows;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const formData = new FormData();
      formData.append("employee", selectedEmployee._id);
      formData.append("itemName", row.itemName);
      formData.append("category", row.category);
      formData.append("brand", row.brand);
      formData.append("serialNumber", row.serialNumber);
      formData.append("quantity", row.quantity);
      formData.append("condition", row.condition);
      formData.append("issueDate", issueDate);
      formData.append("expectedReturnDate", expectedReturnDate);
      formData.append("remarks", remarks);
      row.photoFiles.forEach((f) => formData.append("issuePhotos", f));

      try {
        await api.post("/asset-issuances", formData, { headers: { "Content-Type": "multipart/form-data" } });
        remaining = remaining.slice(1);
      } catch (err) {
        // Items before this one already saved successfully — don't make
        // the user re-submit those. Keep only what's left to retry.
        setRows(remaining);
        const message = err?.response?.data?.message || `Could not issue "${row.itemName}".`;
        throw new Error(
          i > 0
            ? `${message} (the ${i} item(s) above were already saved — only the rest are shown now.)`
            : message
        );
      }
    }

    toast.success(rows.length > 1 ? `${rows.length} items issued.` : "Asset issued.");
    onDone?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isEdit && !selectedEmployee) {
      setError("Select which employee this item is being issued to.");
      toast.error("Select an employee.");
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await submitEdit();
      } else {
        await submitCreate();
      }
    } catch (err) {
      const message = err?.response?.data?.message || err.message || "Could not save this asset record.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 3 } }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Box sx={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 2, background: "linear-gradient(135deg, #60A5FA, #2563EB)", color: "#fff" }}>
          <LaptopMacRoundedIcon fontSize="small" />
        </Box>
        <Typography variant="h5" fontWeight={800} sx={{ color: "text.primary" }}>
          {isEdit ? "Edit Asset Record" : "Issue Asset(s)"}
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
            {/* EMPLOYEE */}
            {isEdit ? (
              <TextField label="Employee" fullWidth disabled value={selectedEmployee?.name || ""} helperText="To reassign this item, mark it returned and issue a new record." />
            ) : (
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <Autocomplete
                  fullWidth
                  options={employeeOptions}
                  getOptionLabel={(e) => e.name || ""}
                  value={selectedEmployee}
                  onChange={(_e, value) => setSelectedEmployee(value)}
                  isOptionEqualToValue={(a, b) => a._id === b._id}
                  renderInput={(params) => <TextField {...params} label="Issue to employee" required fullWidth placeholder="Type to search..." />}
                  noOptionsText="No matching employee — add one with the button"
                />
                <IconButton
                  onClick={() => { setQuickAddSeedName(""); setQuickAddOpen(true); }}
                  title="Add new employee"
                  sx={{ mt: 0.5, border: "1px solid", borderColor: "divider", borderRadius: 2, flexShrink: 0 }}
                >
                  <PersonAddAlt1Icon fontSize="small" />
                </IconButton>
              </Stack>
            )}
            {!isEdit && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
                Employee not in the list? Tap the <PersonAddAlt1Icon sx={{ fontSize: 12, verticalAlign: "middle" }} /> button to add them, then come straight back here.
              </Typography>
            )}

            {/* SHARED DETAILS */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Issue date" type="date" fullWidth value={issueDate} onChange={(e) => setIssueDate(e.target.value)} InputLabelProps={{ shrink: true }} />
              <TextField label="Expected return (optional)" type="date" fullWidth value={expectedReturnDate} onChange={(e) => setExpectedReturnDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Stack>

            <Divider />

            {/* ITEM ROWS */}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                {isEdit ? "ITEM" : rows.length > 1 ? `ITEMS (${rows.length})` : "ITEM"}
              </Typography>
              <Button
                size="small" startIcon={<TuneRoundedIcon sx={{ fontSize: 14 }} />}
                onClick={() => setManageCategoriesOpen(true)}
                sx={{ textTransform: "none", fontSize: 11, color: "text.secondary", minHeight: "auto", py: 0.25 }}
              >
                Manage Categories
              </Button>
            </Stack>

            {rows.map((row, index) => {
              const rowTotalPhotos = isEdit ? existingPhotos.length + row.photoFiles.length : row.photoFiles.length;
              const rowLightboxImages = isEdit
                ? [...existingPhotos.map((p) => ({ url: p.url })), ...row.photoPreviews.map((url) => ({ url }))]
                : row.photoPreviews.map((url) => ({ url }));

              return (
                <Paper
                  key={row.id}
                  variant="outlined"
                  sx={{ p: 1.5, borderRadius: 2.5, borderColor: "divider", position: "relative" }}
                >
                  {!isEdit && rows.length > 1 && (
                    <IconButton
                      size="small"
                      onClick={() => removeRow(row.id)}
                      sx={{ position: "absolute", top: 6, right: 6 }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  )}

                  <Stack spacing={1.5}>
                    {!isEdit && rows.length > 1 && (
                      <Chip size="small" label={`Item #${index + 1}`} sx={{ alignSelf: "flex-start", fontWeight: 700 }} />
                    )}

                    <TextField label="Item name" required fullWidth placeholder="e.g. Dell Latitude 5420" value={row.itemName} onChange={(e) => updateRow(row.id, "itemName")(e.target.value)} />

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                      <Autocomplete
                        freeSolo
                        fullWidth
                        options={categoryOptions}
                        inputValue={row.category}
                        onInputChange={(_e, value) => updateRow(row.id, "category")(value)}
                        renderInput={(params) => <TextField {...params} label="Category" fullWidth size="small" />}
                      />
                      <TextField label="Brand (optional)" size="small" fullWidth value={row.brand} onChange={(e) => updateRow(row.id, "brand")(e.target.value)} />
                    </Stack>

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                      <TextField label="Serial / asset tag (optional)" size="small" fullWidth value={row.serialNumber} onChange={(e) => updateRow(row.id, "serialNumber")(e.target.value)} />
                      <TextField label="Qty" type="number" size="small" fullWidth inputProps={{ min: 1 }} value={row.quantity} onChange={(e) => updateRow(row.id, "quantity")(e.target.value)} />
                      <TextField select label="Condition" size="small" fullWidth value={row.condition} onChange={(e) => updateRow(row.id, "condition")(e.target.value)}>
                        {CONDITIONS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                      </TextField>
                    </Stack>

                    {/* PHOTOS */}
                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.6 }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary">PHOTOS</Typography>
                        <Chip size="small" label={`${rowTotalPhotos}/${MAX_PHOTOS}`} sx={{ height: 18, fontSize: 9.5 }} />
                      </Stack>

                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {isEdit && existingPhotos.map((photo, i) => (
                          <Box key={photo.publicId} sx={{ position: "relative" }}>
                            <Avatar src={photo.url} variant="rounded" onClick={() => openLightbox(rowLightboxImages, i)} sx={{ width: 56, height: 56, cursor: "pointer" }} />
                            <IconButton
                              size="small"
                              onClick={(e) => { e.stopPropagation(); removeExistingPhoto(photo.publicId); }}
                              sx={{ position: "absolute", top: -6, right: -6, bgcolor: "error.main", color: "#fff", width: 18, height: 18, "&:hover": { bgcolor: "error.dark" } }}
                            >
                              <CloseIcon sx={{ fontSize: 11 }} />
                            </IconButton>
                          </Box>
                        ))}

                        {row.photoPreviews.map((preview, i) => (
                          <Box key={preview} sx={{ position: "relative" }}>
                            <Avatar
                              src={preview}
                              variant="rounded"
                              onClick={() => openLightbox(rowLightboxImages, (isEdit ? existingPhotos.length : 0) + i)}
                              sx={{ width: 56, height: 56, cursor: "pointer" }}
                            />
                            <IconButton
                              size="small"
                              onClick={(e) => { e.stopPropagation(); removeRowPhoto(row.id, i); }}
                              sx={{ position: "absolute", top: -6, right: -6, bgcolor: "error.main", color: "#fff", width: 18, height: 18, "&:hover": { bgcolor: "error.dark" } }}
                            >
                              <CloseIcon sx={{ fontSize: 11 }} />
                            </IconButton>
                          </Box>
                        ))}

                        {rowTotalPhotos < MAX_PHOTOS && (
                          <Button variant="outlined" component="label" startIcon={<AddAPhotoIcon sx={{ fontSize: 16 }} />} sx={{ textTransform: "none", borderRadius: 2, height: 56, fontSize: 11 }}>
                            Add
                            <input
                              type="file"
                              hidden
                              multiple
                              accept="image/*"
                              onChange={(e) => {
                                handleRowPhotosSelected(row.id, e.target.files);
                                e.target.value = "";
                              }}
                            />
                          </Button>
                        )}
                      </Stack>
                    </Box>
                  </Stack>
                </Paper>
              );
            })}

            {!isEdit && (
              <Button
                startIcon={<AddCircleOutlineIcon />}
                onClick={addRow}
                sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 700, color: "primary.light" }}
              >
                Add Another Item
              </Button>
            )}

            <Divider />

            <TextField
              label="Remarks (optional, applies to this whole batch)"
              fullWidth
              multiline
              minRows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />

            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
              sx={{
                py: 1.2, borderRadius: 2.5, textTransform: "none", fontWeight: 800,
                background: "linear-gradient(135deg,#60A5FA,#2563EB)",
                boxShadow: "0 8px 18px rgba(37,99,235,0.30)",
              }}
            >
              {submitting ? "Saving..." : isEdit ? "Save Changes" : rows.length > 1 ? `Issue ${rows.length} Items` : "Issue Asset"}
            </Button>
          </Stack>
        </Box>
      </Paper>

      <ImageLightbox
        open={lightbox.open}
        images={lightbox.images}
        startIndex={lightbox.index}
        onClose={() => setLightbox((prev) => ({ ...prev, open: false }))}
      />

      <QuickAddEmployeeDialog
        open={quickAddOpen}
        initialName={quickAddSeedName}
        onClose={() => setQuickAddOpen(false)}
        onAdded={handleEmployeeAdded}
      />

      <ManageCategoriesDialog
        open={manageCategoriesOpen}
        onClose={() => setManageCategoriesOpen(false)}
        onChanged={loadCategories}
      />
    </Container>
  );
}
