const AssetCategory = require("../models/AssetCategory");
const AssetIssuance = require("../models/AssetIssuance");
const { asyncHandler } = require("../middleware/errorHandler");

const getUserFilter = (req) => ({ createdBy: req.user._id });

// First-time use is seeded with these so the picklist and the issue form's
// autocomplete aren't empty before anyone has configured anything —
// "future proof and fast" means it already works out of the box.
const PRESET_CATEGORIES = [
  "Laptop", "Desktop", "Monitor", "Mouse", "Keyboard", "Headphone",
  "Mobile Phone", "SIM Card", "ID Card", "Access Card", "Charger",
  "Bag", "Pen Drive", "Hard Disk", "Webcam", "Chair", "Other",
];

/*
=============================================================
LIST — includes how many assets (currently issued + all-time) are
tagged with each category, answering "iski assets ki" at a glance.
=============================================================
*/

const listCategories = asyncHandler(async (req, res) => {
  const existingCount = await AssetCategory.countDocuments(getUserFilter(req));

  if (existingCount === 0) {
    await AssetCategory.insertMany(
      PRESET_CATEGORIES.map((name) => ({
        name,
        nameLower: name.toLowerCase(),
        createdBy: req.user._id,
      })),
      { ordered: false }
    ).catch(() => {}); // ordered:false + unique index means a race here is harmless
  }

  const [categories, counts] = await Promise.all([
    AssetCategory.find(getUserFilter(req)).sort({ name: 1 }),

    AssetIssuance.aggregate([
      { $match: getUserFilter(req) },
      {
        $group: {
          _id: { $toLower: "$category" },
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ["$status", "Issued"] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const countMap = new Map(counts.map((c) => [c._id, c]));

  const withCounts = categories.map((c) => ({
    ...c.toObject(),
    assetCounts: countMap.get(c.nameLower) || { total: 0, active: 0 },
  }));

  res.json(withCounts);
});

/*
=============================================================
CREATE
=============================================================
*/

const createCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ message: "Category name is required." });
  }

  const nameLower = name.trim().toLowerCase();

  const existing = await AssetCategory.findOne({ ...getUserFilter(req), nameLower });
  if (existing) {
    return res.status(409).json({ message: "This category already exists." });
  }

  const category = await AssetCategory.create({
    name: name.trim(),
    nameLower,
    createdBy: req.user._id,
  });

  res.status(201).json(category);
});

/*
=============================================================
RENAME — only changes the picklist entry. Existing AssetIssuance
records keep whatever category string they already had; they are
plain text, not a reference to this collection, so nothing already
saved silently changes.
=============================================================
*/

const renameCategory = asyncHandler(async (req, res) => {
  const category = await AssetCategory.findOne({ _id: req.params.id, ...getUserFilter(req) });
  if (!category) return res.status(404).json({ message: "Category not found." });

  const { name } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ message: "Category name is required." });
  }

  const nameLower = name.trim().toLowerCase();

  if (nameLower !== category.nameLower) {
    const existing = await AssetCategory.findOne({ ...getUserFilter(req), nameLower, _id: { $ne: category._id } });
    if (existing) {
      return res.status(409).json({ message: "Another category already has this name." });
    }
  }

  category.name = name.trim();
  category.nameLower = nameLower;
  await category.save();

  res.json(category);
});

/*
=============================================================
DELETE — removes it from the picklist only; see note on renameCategory.
=============================================================
*/

const deleteCategory = asyncHandler(async (req, res) => {
  const category = await AssetCategory.findOne({ _id: req.params.id, ...getUserFilter(req) });
  if (!category) return res.status(404).json({ message: "Category not found." });

  await category.deleteOne();

  res.json({ message: "Category removed from the list.", id: req.params.id });
});

module.exports = { listCategories, createCategory, renameCategory, deleteCategory };
