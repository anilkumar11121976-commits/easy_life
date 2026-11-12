"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack,
  List, ListItem, ListItemText, IconButton, Chip, CircularProgress, Typography, Divider,
} from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { toast } from "react-toastify";
import api from "../lib/api";

export default function ManageCategoriesDialog({ open, onClose, onChanged }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");

  const load = () => {
    setLoading(true);
    api.get("/asset-categories").then((res) => setCategories(res.data || [])).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast.error("Category name is required.");
      return;
    }
    setAdding(true);
    try {
      await api.post("/asset-categories", { name: newName.trim() });
      setNewName("");
      load();
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not add category.");
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (category) => {
    setEditingId(category._id);
    setEditingValue(category.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingValue("");
  };

  const saveEdit = async () => {
    if (!editingValue.trim()) {
      toast.error("Category name is required.");
      return;
    }
    try {
      await api.put(`/asset-categories/${editingId}`, { name: editingValue.trim() });
      toast.success("Category renamed.");
      cancelEdit();
      load();
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not rename category.");
    }
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`Remove "${category.name}" from the category list? Existing asset records keep their category text — this only affects what shows up when issuing new items.`)) return;
    try {
      await api.delete(`/asset-categories/${category._id}`);
      load();
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not remove this category.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Manage Asset Categories</DialogTitle>
      <DialogContent>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
          This is the picklist shown when issuing an asset. Renaming or removing a category here only
          changes the list — it does not change the category already saved on existing asset records.
        </Typography>

        <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
          <TextField
            size="small" fullWidth placeholder="New category name"
            value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
          />
          <Button variant="contained" onClick={handleAdd} disabled={adding} startIcon={<AddCircleIcon sx={{ fontSize: 18 }} />} sx={{ textTransform: "none", whiteSpace: "nowrap" }}>
            Add
          </Button>
        </Stack>

        <Divider sx={{ mb: 0.5 }} />

        {loading ? (
          <Stack alignItems="center" sx={{ py: 3 }}><CircularProgress size={24} /></Stack>
        ) : categories.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 2 }}>No categories yet.</Typography>
        ) : (
          <List dense sx={{ maxHeight: 320, overflowY: "auto" }}>
            {categories.map((category) => (
              <ListItem
                key={category._id}
                secondaryAction={
                  editingId === category._id ? (
                    <Stack direction="row" spacing={0.25}>
                      <IconButton size="small" onClick={saveEdit}><CheckIcon fontSize="small" color="success" /></IconButton>
                      <IconButton size="small" onClick={cancelEdit}><CloseIcon fontSize="small" /></IconButton>
                    </Stack>
                  ) : (
                    <Stack direction="row" spacing={0.25}>
                      <IconButton size="small" onClick={() => startEdit(category)}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(category)}><DeleteOutlineIcon fontSize="small" /></IconButton>
                    </Stack>
                  )
                }
                sx={{ pr: 9 }}
              >
                {editingId === category._id ? (
                  <TextField
                    size="small" fullWidth autoFocus value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveEdit(); } }}
                  />
                ) : (
                  <ListItemText
                    primary={category.name}
                    secondary={
                      category.assetCounts?.total > 0
                        ? `${category.assetCounts.active} active, ${category.assetCounts.total} total`
                        : "No assets yet"
                    }
                  />
                )}
                {category.assetCounts?.active > 0 && editingId !== category._id && (
                  <Chip size="small" label={category.assetCounts.active} sx={{ bgcolor: "rgba(96,165,250,0.15)", color: "#2563EB", fontWeight: 700, mr: 1 }} />
                )}
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
