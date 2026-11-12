"use client";

import { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack,
  MenuItem, Box, Avatar, IconButton, Typography, Chip,
} from "@mui/material";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import CloseIcon from "@mui/icons-material/Close";
import { toast } from "react-toastify";
import api from "../lib/api";

const CONDITIONS = ["Good", "Fair", "Damaged", "Lost"];
const MAX_PHOTOS = 5;

export default function MarkAssetReturnDialog({ open, asset, onClose, onUpdated }) {
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 10));
  const [returnCondition, setReturnCondition] = useState("Good");
  const [returnRemarks, setReturnRemarks] = useState("");
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [saving, setSaving] = useState(false);

  if (!asset) return null;

  const handleFilesSelected = (files) => {
    const incoming = Array.from(files || []);
    if (!incoming.length) return;

    const spaceLeft = MAX_PHOTOS - photoFiles.length;
    if (spaceLeft <= 0) {
      toast.error(`You can attach at most ${MAX_PHOTOS} return photos.`);
      return;
    }

    const toAdd = incoming.slice(0, spaceLeft);
    setPhotoFiles((prev) => [...prev, ...toAdd]);
    setPhotoPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
  };

  const removePhoto = (index) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("returnDate", returnDate);
      formData.append("returnCondition", returnCondition);
      formData.append("returnRemarks", returnRemarks);
      photoFiles.forEach((f) => formData.append("returnPhotos", f));

      const res = await api.patch(`/asset-issuances/${asset._id}/return`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Marked as returned.");
      onUpdated?.(res.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not mark this as returned.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Mark &quot;{asset.itemName}&quot; as Returned</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Return date"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
          />

          <TextField select label="Condition on return" fullWidth value={returnCondition} onChange={(e) => setReturnCondition(e.target.value)}>
            {CONDITIONS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>

          <TextField
            label="Remark (optional)"
            fullWidth
            multiline
            minRows={2}
            value={returnRemarks}
            onChange={(e) => setReturnRemarks(e.target.value)}
          />

          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.8 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">RETURN PHOTOS (OPTIONAL)</Typography>
              <Chip size="small" label={`${photoFiles.length}/${MAX_PHOTOS}`} sx={{ height: 20, fontSize: 10 }} />
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {photoPreviews.map((preview, index) => (
                <Box key={preview} sx={{ position: "relative" }}>
                  <Avatar src={preview} variant="rounded" sx={{ width: 60, height: 60 }} />
                  <IconButton
                    size="small"
                    onClick={() => removePhoto(index)}
                    sx={{ position: "absolute", top: -6, right: -6, bgcolor: "error.main", color: "#fff", width: 18, height: 18, "&:hover": { bgcolor: "error.dark" } }}
                  >
                    <CloseIcon sx={{ fontSize: 12 }} />
                  </IconButton>
                </Box>
              ))}

              {photoFiles.length < MAX_PHOTOS && (
                <Button variant="outlined" component="label" startIcon={<AddAPhotoIcon />} sx={{ textTransform: "none", borderRadius: 2, height: 60 }}>
                  Add
                  <input
                    type="file"
                    hidden
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      handleFilesSelected(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </Button>
              )}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Confirm Return"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
