const mongoose = require("mongoose");

// A managed list of category names (per user), separate from the free-text
// `category` field already stored on each AssetIssuance record. This is
// the configurable picklist shown in the "Manage Categories" dialog and
// fed into the issue form's autocomplete — it does NOT retroactively
// rename/delete anything already saved on existing asset records, since
// those are plain strings, not references to this collection.
const assetCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameLower: { type: String, required: true, lowercase: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

assetCategorySchema.index({ createdBy: 1, nameLower: 1 }, { unique: true });

module.exports = mongoose.model("AssetCategory", assetCategorySchema);
