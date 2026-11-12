"use client";

import { Paper, Box, Stack, Typography, Chip, Avatar, IconButton } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import LaptopMacRoundedIcon from "@mui/icons-material/LaptopMacRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";

const STATUS_COLORS = { Active: "#4ADE80", Resigned: "#FBBF24", Terminated: "#F87171" };

export default function EmployeeCard({ employee, onOpen, onEdit, onDelete }) {
  const statusColor = STATUS_COLORS[employee.status] || "#94a3b8";
  const counts = employee.assetCounts || { total: 0, active: 0 };

  return (
    <Paper
      elevation={0}
      onClick={() => onOpen(employee)}
      sx={{
        p: 1.8, border: "1px solid", borderColor: "divider",
        borderRadius: 3, bgcolor: "background.paper", cursor: "pointer",
        "&:hover": { borderColor: "rgba(139,92,246,0.5)" },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Avatar src={employee.photoUrl || undefined} variant="rounded" sx={{ width: 52, height: 52, bgcolor: "rgba(139,92,246,0.15)", color: "#6D28D9", flexShrink: 0 }}>
          <BadgeRoundedIcon />
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={800} noWrap color="text.primary">{employee.name}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {[employee.designation, employee.department].filter(Boolean).join(" • ") || "No designation set"}
              </Typography>
            </Box>
            {counts.active > 0 && (
              <Chip
                size="small"
                icon={<LaptopMacRoundedIcon sx={{ fontSize: 14 }} />}
                label={`${counts.active} item${counts.active > 1 ? "s" : ""}`}
                sx={{ bgcolor: "rgba(96,165,250,0.15)", color: "#60A5FA", fontWeight: 700, whiteSpace: "nowrap" }}
              />
            )}
          </Stack>

          <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap sx={{ mt: 0.8 }}>
            <Chip size="small" label={employee.status} sx={{ bgcolor: `${statusColor}26`, color: statusColor, fontWeight: 700 }} />
            {employee.employeeCode && <Chip size="small" label={employee.employeeCode} variant="outlined" />}
          </Stack>
        </Box>

        <Stack direction="row" spacing={0.25}>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(employee); }}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); onDelete(employee); }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>
    </Paper>
  );
}
