const mongoose = require("mongoose");

// One document per physical item given to one employee — a laptop AND a
// mouse AND a headphone for the same person are three separate records.
// That's what makes "how much has been given to whom" (and "who still
// has item X") a simple query instead of parsing a free-text list.
const assetIssuanceSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },

    // Deliberately free text (with an autocomplete suggestions endpoint
    // in the controller), not a hardcoded enum — "laptop, headphone,
    // mouse and whatever else the company hands out" means the list of
    // item types can never be closed.
    itemName: { type: String, required: true, trim: true },
    category: { type: String, default: "Other", trim: true },
    brand: { type: String, default: "", trim: true },

    // Lets the SAME physical item be tracked across reassignment —
    // e.g. a laptop returned by one employee and later issued to
    // another still shares a serial number across both records.
    serialNumber: { type: String, default: "", trim: true },

    quantity: { type: Number, default: 1, min: 1 },

    condition: {
      type: String,
      enum: ["New", "Good", "Fair", "Damaged"],
      default: "Good",
    },

    issueDate: { type: Date, required: true, default: Date.now },
    expectedReturnDate: { type: Date, default: null }, // for temporary loans

    returnDate: { type: Date, default: null },
    returnCondition: {
      type: String,
      enum: ["Good", "Fair", "Damaged", "Lost", ""],
      default: "",
    },
    returnRemarks: { type: String, default: "" },

    status: {
      type: String,
      enum: ["Issued", "Returned", "Lost", "Damaged"],
      default: "Issued",
    },

    // Proof photos at issue time AND at return time — kept separate so a
    // dispute about "was it already damaged when it was given?" has an
    // answer on both ends, not just one.
    issuePhotos: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
      },
    ],
    returnPhotos: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
      },
    ],

    remarks: { type: String, default: "" },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

assetIssuanceSchema.index({ createdBy: 1, employee: 1 });
assetIssuanceSchema.index({ createdBy: 1, status: 1 });
assetIssuanceSchema.index({ createdBy: 1, category: 1 });
assetIssuanceSchema.index({ createdBy: 1, serialNumber: 1 });
assetIssuanceSchema.index({ issueDate: -1 });

module.exports = mongoose.model("AssetIssuance", assetIssuanceSchema);
