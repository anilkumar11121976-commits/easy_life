const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    employeeCode: { type: String, default: "", trim: true }, // e.g. "EMP001" — optional, not enforced globally unique since different owners may reuse codes
    designation: { type: String, default: "", trim: true },
    department: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    phone: { type: String, default: "", trim: true },

    joiningDate: { type: Date, default: Date.now },

    status: {
      type: String,
      enum: ["Active", "Resigned", "Terminated"],
      default: "Active",
    },
    lastWorkingDate: { type: Date, default: null },

    photoUrl: { type: String, default: "" },
    photoPublicId: { type: String, default: "" },

    remarks: { type: String, default: "" },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

employeeSchema.index({ createdBy: 1, name: 1 });
employeeSchema.index({ createdBy: 1, status: 1 });
employeeSchema.index({ createdBy: 1, department: 1 });

module.exports = mongoose.model("Employee", employeeSchema);
