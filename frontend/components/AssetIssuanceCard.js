"use client";

import { Paper, Box, Stack, Typography, Chip, Avatar } from "@mui/material";
import LaptopMacRoundedIcon from "@mui/icons-material/LaptopMacRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

const STATUS_COLORS = { Issued: "#60A5FA", Returned: "#4ADE80", Lost: "#F87171", Damaged: "#FB923C" };

export default function AssetIssuanceCard({ asset, onOpen, showEmployee = false }) {
  const statusColor = STATUS_COLORS[asset.status] || "#94a3b8";

  const isOverdue =
    asset.status === "Issued" &&
    asset.expectedReturnDate &&
    new Date(asset.expectedReturnDate) < new Date();

  const thumb = asset.issuePhotos?.[0]?.url;

  return (
    <Paper
      elevation={0}
      onClick={() => onOpen(asset)}
      sx={{
        p: 1.6, border: "1px solid", borderColor: isOverdue ? "rgba(251,146,60,0.5)" : "divider",
        borderRadius: 3, bgcolor: "background.paper", cursor: "pointer",
        "&:hover": { borderColor: "rgba(139,92,246,0.5)" },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Avatar src={thumb} variant="rounded" sx={{ width: 48, height: 48, bgcolor: "rgba(96,165,250,0.15)", color: "#60A5FA", flexShrink: 0 }}>
          <LaptopMacRoundedIcon fontSize="small" />
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={800} noWrap color="text.primary">
                {asset.itemName}{asset.quantity > 1 ? ` ×${asset.quantity}` : ""}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {showEmployee && asset.employee?.name ? `${asset.employee.name} • ` : ""}
                {new Date(asset.issueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap sx={{ mt: 0.8 }}>
            <Chip size="small" label={isOverdue ? "Overdue" : asset.status} sx={{ bgcolor: `${isOverdue ? "#FB923C" : statusColor}26`, color: isOverdue ? "#FB923C" : statusColor, fontWeight: 700 }} />
            {asset.category && <Chip size="small" label={asset.category} variant="outlined" />}
            {asset.serialNumber && <Chip size="small" label={`S/N: ${asset.serialNumber}`} variant="outlined" />}
            {isOverdue && <WarningAmberRoundedIcon sx={{ fontSize: 16, color: "#FB923C" }} />}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}
