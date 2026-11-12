"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box, CircularProgress, Stack, Button, Container, Chip, Paper, Typography,
  Divider, Avatar,
} from "@mui/material";
import ReplayIcon from "@mui/icons-material/Replay";
import AssignmentReturnIcon from "@mui/icons-material/AssignmentReturn";
import DeleteIcon from "@mui/icons-material/Delete";
import { toast } from "react-toastify";

import ProtectedRoute from "../../../components/ProtectedRoute";
import Navbar from "../../../components/Navbar";
import AssetIssuanceForm from "../AssetIssuanceForm";
import MarkAssetReturnDialog from "../../../components/MarkAssetReturnDialog";
import ImageLightbox from "../../../components/ImageLightbox";
import api from "../../../lib/api";

const STATUS_COLORS = { Issued: "#60A5FA", Returned: "#4ADE80", Lost: "#F87171", Damaged: "#FB923C" };

function EditAssetInner() {
  const { id } = useParams();
  const router = useRouter();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const load = () => {
    api.get(`/asset-issuances/${id}`).then((res) => setAsset(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleReopen = async () => {
    setReopening(true);
    try {
      const res = await api.patch(`/asset-issuances/${id}/reopen`);
      toast.success("Marked as issued again.");
      setAsset((prev) => ({ ...prev, ...res.data }));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not update.");
    } finally {
      setReopening(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete this asset record for "${asset.itemName}"?`)) return;
    try {
      await api.delete(`/asset-issuances/${id}`);
      toast.success("Asset record deleted.");
      router.push("/assets");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not delete this record.");
    }
  };

  const statusColor = asset ? STATUS_COLORS[asset.status] || "#94a3b8" : "#94a3b8";
  const returnPhotos = asset?.returnPhotos || [];

  return (
    <>
      <Navbar />
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : !asset ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <Typography color="text.secondary">Asset record not found.</Typography>
        </Box>
      ) : (
        <>
          <Container maxWidth="sm" sx={{ pt: { xs: 2, sm: 3 } }}>
            <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center" flexWrap="wrap" useFlexGap>
              <Chip label={asset.status} size="small" sx={{ bgcolor: `${statusColor}26`, color: statusColor, fontWeight: 700 }} />

              {asset.status === "Issued" && (
                <Button size="small" variant="contained" startIcon={<AssignmentReturnIcon />} onClick={() => setReturnDialogOpen(true)} sx={{ textTransform: "none", borderRadius: 2 }}>
                  Mark Returned
                </Button>
              )}
              {asset.status !== "Issued" && (
                <Button size="small" variant="outlined" startIcon={<ReplayIcon />} onClick={handleReopen} disabled={reopening} sx={{ textTransform: "none", borderRadius: 2 }}>
                  Reopen
                </Button>
              )}
              <Button size="small" variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleDelete} sx={{ textTransform: "none", borderRadius: 2 }}>
                Delete
              </Button>
            </Stack>
          </Container>

          <AssetIssuanceForm mode="edit" initialData={asset} onDone={load} />

          {asset.status !== "Issued" && (
            <Container maxWidth="sm" sx={{ pb: { xs: 2, sm: 3 } }}>
              <Paper elevation={0} sx={{ p: { xs: 1.75, sm: 2.5 }, borderRadius: { xs: 2.5, sm: 3 }, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">RETURN DETAILS</Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Returned on</Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {asset.returnDate ? new Date(asset.returnDate).toLocaleDateString("en-IN") : "-"}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Condition</Typography>
                    <Typography variant="body2" fontWeight={700}>{asset.returnCondition || "-"}</Typography>
                  </Stack>
                  {asset.returnRemarks && (
                    <>
                      <Divider sx={{ my: 0.5 }} />
                      <Typography variant="body2" sx={{ fontStyle: "italic" }}>{asset.returnRemarks}</Typography>
                    </>
                  )}
                  {returnPhotos.length > 0 && (
                    <>
                      <Divider sx={{ my: 0.5 }} />
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {returnPhotos.map((photo, i) => (
                          <Avatar
                            key={photo.publicId}
                            src={photo.url}
                            variant="rounded"
                            onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }}
                            sx={{ width: 64, height: 64, cursor: "pointer", "&:hover": { opacity: 0.85 } }}
                          />
                        ))}
                      </Stack>
                    </>
                  )}
                </Stack>
              </Paper>
            </Container>
          )}

          <MarkAssetReturnDialog
            open={returnDialogOpen}
            asset={asset}
            onClose={() => setReturnDialogOpen(false)}
            onUpdated={(updated) => { setReturnDialogOpen(false); setAsset((prev) => ({ ...prev, ...updated })); }}
          />

          <ImageLightbox open={lightboxOpen} images={returnPhotos} startIndex={lightboxIndex} onClose={() => setLightboxOpen(false)} />
        </>
      )}
    </>
  );
}

export default function EditAssetPage() {
  return (
    <ProtectedRoute>
      <EditAssetInner />
    </ProtectedRoute>
  );
}
