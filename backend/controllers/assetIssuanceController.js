const AssetIssuance = require("../models/AssetIssuance");
const Employee = require("../models/Employee");
const { cloudinary } = require("../config/cloudinary");
const { asyncHandler } = require("../middleware/errorHandler");

const STATUSES = ["Issued", "Returned", "Lost", "Damaged"];
const CONDITIONS = ["New", "Good", "Fair", "Damaged"];
const RETURN_CONDITIONS = ["Good", "Fair", "Damaged", "Lost"];
const MAX_PHOTOS = 5;

/*
=============================================================
HELPERS
=============================================================
*/

const destroyPhotos = (photos) => {
  if (!photos?.length) return Promise.resolve();
  return Promise.all(photos.map((p) => cloudinary.uploader.destroy(p.publicId).catch(() => {})));
};

const getUserFilter = (req) => ({ createdBy: req.user._id });

const toPhotoArray = (files) => (files || []).map((f) => ({ url: f.path, publicId: f.filename }));

/*
=============================================================
CREATE — issue a new asset to an employee
=============================================================
*/

const createIssuance = asyncHandler(async (req, res) => {
  const {
    employee: employeeId,
    itemName,
    category,
    brand,
    serialNumber,
    quantity,
    condition,
    issueDate,
    expectedReturnDate,
    remarks,
  } = req.body;

  if (!employeeId) {
    return res.status(400).json({ message: "Select the employee this item is being issued to." });
  }
  if (!itemName?.trim()) {
    return res.status(400).json({ message: "Item name is required." });
  }

  const employee = await Employee.findOne({ _id: employeeId, ...getUserFilter(req) });
  if (!employee) {
    return res.status(404).json({ message: "Employee not found." });
  }

  const issuePhotoFiles = req.files?.issuePhotos || [];
  if (issuePhotoFiles.length > MAX_PHOTOS) {
    return res.status(400).json({ message: `You can attach at most ${MAX_PHOTOS} issue photos.` });
  }

  const issuance = await AssetIssuance.create({
    employee: employee._id,
    itemName: itemName.trim(),
    category: category?.trim() || "Other",
    brand: brand?.trim() || "",
    serialNumber: serialNumber?.trim() || "",
    quantity: quantity ? Math.max(Number(quantity), 1) : 1,
    condition: CONDITIONS.includes(condition) ? condition : "Good",
    issueDate: issueDate ? new Date(issueDate) : new Date(),
    expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
    remarks: remarks?.trim() || "",
    issuePhotos: toPhotoArray(issuePhotoFiles),
    createdBy: req.user._id,
  });

  res.status(201).json(issuance);
});

/*
=============================================================
LIST
=============================================================
*/

const listIssuances = asyncHandler(async (req, res) => {
  const {
    search,
    employee: employeeId,
    category,
    status,
    overdue,
    page = 1,
    limit = 20,
  } = req.query;

  const filter = getUserFilter(req);

  if (employeeId) filter.employee = employeeId;
  if (category?.trim()) filter.category = new RegExp(category.trim(), "i");
  if (status && STATUSES.includes(status)) filter.status = status;

  if (overdue === "true") {
    filter.status = "Issued";
    filter.expectedReturnDate = { $ne: null, $lt: new Date() };
  }

  if (search?.trim()) {
    const regex = new RegExp(search.trim(), "i");

    // Search also matches by employee name — resolve matching employee
    // ids first (scoped to this user), same two-step approach the rest
    // of this app uses rather than a cross-collection $lookup.
    const matchingEmployees = await Employee.find({
      ...getUserFilter(req),
      name: regex,
    }).select("_id");

    filter.$or = [
      { itemName: regex },
      { serialNumber: regex },
      { brand: regex },
      { remarks: regex },
      { employee: { $in: matchingEmployees.map((e) => e._id) } },
    ];
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const [records, total] = await Promise.all([
    AssetIssuance.find(filter)
      .populate("employee", "name employeeCode department designation status")
      .sort({ issueDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum),

    AssetIssuance.countDocuments(filter),
  ]);

  res.json({
    records,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.max(Math.ceil(total / limitNum), 1),
    },
  });
});

/*
=============================================================
SUMMARY — overall + per-employee totals ("kitna saman kisko dia hai")
=============================================================
*/

const getSummary = asyncHandler(async (req, res) => {
  const filter = getUserFilter(req);

  const [overall, byCategory, byEmployee] = await Promise.all([
    AssetIssuance.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalIssuances: { $sum: 1 },
          currentlyIssued: { $sum: { $cond: [{ $eq: ["$status", "Issued"] }, 1, 0] } },
          returned: { $sum: { $cond: [{ $eq: ["$status", "Returned"] }, 1, 0] } },
          lostOrDamaged: {
            $sum: { $cond: [{ $in: ["$status", ["Lost", "Damaged"]] }, 1, 0] },
          },
        },
      },
    ]),

    AssetIssuance.aggregate([
      { $match: { ...filter, status: "Issued" } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),

    AssetIssuance.aggregate([
      { $match: { ...filter, status: "Issued" } },
      { $group: { _id: "$employee", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "employees",
          localField: "_id",
          foreignField: "_id",
          as: "employee",
        },
      },
      { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
      { $project: { count: 1, name: "$employee.name", department: "$employee.department" } },
    ]),
  ]);

  res.json({
    ...(overall[0] || { totalIssuances: 0, currentlyIssued: 0, returned: 0, lostOrDamaged: 0 }),
    byCategory,
    topHolders: byEmployee,
  });
});

/*
=============================================================
SUGGESTIONS (autocomplete) — category / item name
=============================================================
*/

const suggestCategories = asyncHandler(async (req, res) => {
  const values = await AssetIssuance.distinct("category", getUserFilter(req));
  res.json(values.filter(Boolean).sort());
});

const suggestItems = asyncHandler(async (req, res) => {
  const values = await AssetIssuance.distinct("itemName", getUserFilter(req));
  res.json(values.filter(Boolean).sort());
});

/*
=============================================================
GET ONE
=============================================================
*/

const getIssuance = asyncHandler(async (req, res) => {
  const record = await AssetIssuance.findOne({ _id: req.params.id, ...getUserFilter(req) }).populate(
    "employee",
    "name employeeCode department designation status photoUrl"
  );

  if (!record) return res.status(404).json({ message: "Asset record not found." });

  res.json(record);
});

/*
=============================================================
UPDATE — edit issue-side details (not the return action, see below)
=============================================================
*/

const updateIssuance = asyncHandler(async (req, res) => {
  const record = await AssetIssuance.findOne({ _id: req.params.id, ...getUserFilter(req) });
  if (!record) return res.status(404).json({ message: "Asset record not found." });

  const {
    itemName,
    category,
    brand,
    serialNumber,
    quantity,
    condition,
    issueDate,
    expectedReturnDate,
    remarks,
    status,
    removeIssuePhotoIds,
  } = req.body;

  if (itemName !== undefined) {
    if (!itemName.trim()) return res.status(400).json({ message: "Item name is required." });
    record.itemName = itemName.trim();
  }
  if (category !== undefined) record.category = category.trim() || "Other";
  if (brand !== undefined) record.brand = brand.trim();
  if (serialNumber !== undefined) record.serialNumber = serialNumber.trim();
  if (quantity !== undefined) record.quantity = Math.max(Number(quantity) || 1, 1);
  if (condition !== undefined && CONDITIONS.includes(condition)) record.condition = condition;
  if (issueDate !== undefined) record.issueDate = issueDate ? new Date(issueDate) : record.issueDate;
  if (expectedReturnDate !== undefined) {
    record.expectedReturnDate = expectedReturnDate ? new Date(expectedReturnDate) : null;
  }
  if (remarks !== undefined) record.remarks = remarks.trim();
  // Only allow flipping directly to Lost/Damaged here — going back to
  // "Returned" has its own action (markReturned) since that one needs
  // a return date and, usually, return photos.
  if (status !== undefined && ["Issued", "Lost", "Damaged"].includes(status)) {
    record.status = status;
  }

  // Remove selected issue photos
  let idsToRemove = [];
  if (removeIssuePhotoIds) {
    try {
      idsToRemove = JSON.parse(removeIssuePhotoIds);
    } catch {
      idsToRemove = [];
    }
  }
  if (Array.isArray(idsToRemove) && idsToRemove.length) {
    await destroyPhotos(record.issuePhotos.filter((p) => idsToRemove.includes(p.publicId)));
    record.issuePhotos = record.issuePhotos.filter((p) => !idsToRemove.includes(p.publicId));
  }

  // Add new issue photos
  const newIssuePhotos = toPhotoArray(req.files?.issuePhotos);
  if (record.issuePhotos.length + newIssuePhotos.length > MAX_PHOTOS) {
    return res.status(400).json({ message: `You can attach at most ${MAX_PHOTOS} issue photos total.` });
  }
  record.issuePhotos = [...record.issuePhotos, ...newIssuePhotos];

  await record.save();
  res.json(record);
});

/*
=============================================================
MARK RETURNED — the "submit ke time le" action
=============================================================
*/

const markReturned = asyncHandler(async (req, res) => {
  const record = await AssetIssuance.findOne({ _id: req.params.id, ...getUserFilter(req) });
  if (!record) return res.status(404).json({ message: "Asset record not found." });

  const { returnDate, returnCondition, returnRemarks } = req.body;

  const newReturnPhotos = toPhotoArray(req.files?.returnPhotos);
  if (record.returnPhotos.length + newReturnPhotos.length > MAX_PHOTOS) {
    return res.status(400).json({ message: `You can attach at most ${MAX_PHOTOS} return photos total.` });
  }

  record.returnDate = returnDate ? new Date(returnDate) : new Date();
  record.returnCondition = RETURN_CONDITIONS.includes(returnCondition) ? returnCondition : "Good";
  record.returnRemarks = returnRemarks?.trim() || "";
  record.returnPhotos = [...record.returnPhotos, ...newReturnPhotos];
  record.status = record.returnCondition === "Lost" ? "Lost" : "Returned";

  await record.save();
  res.json(record);
});

const reopenIssuance = asyncHandler(async (req, res) => {
  const record = await AssetIssuance.findOne({ _id: req.params.id, ...getUserFilter(req) });
  if (!record) return res.status(404).json({ message: "Asset record not found." });

  record.status = "Issued";
  record.returnDate = null;
  record.returnCondition = "";
  record.returnRemarks = "";

  await record.save();
  res.json(record);
});

/*
=============================================================
DELETE
=============================================================
*/

const deleteIssuance = asyncHandler(async (req, res) => {
  const record = await AssetIssuance.findOne({ _id: req.params.id, ...getUserFilter(req) });
  if (!record) return res.status(404).json({ message: "Asset record not found." });

  await destroyPhotos(record.issuePhotos);
  await destroyPhotos(record.returnPhotos);
  await record.deleteOne();

  res.json({ message: "Asset record deleted.", id: req.params.id });
});

module.exports = {
  createIssuance,
  listIssuances,
  getSummary,
  suggestCategories,
  suggestItems,
  getIssuance,
  updateIssuance,
  markReturned,
  reopenIssuance,
  deleteIssuance,
};
