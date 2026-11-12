const Employee = require("../models/Employee");
const AssetIssuance = require("../models/AssetIssuance");
const { cloudinary } = require("../config/cloudinary");
const { asyncHandler } = require("../middleware/errorHandler");

const STATUSES = ["Active", "Resigned", "Terminated"];

/*
=============================================================
HELPERS
=============================================================
*/

const destroyPhoto = (publicId) => {
  if (!publicId) return Promise.resolve();
  return cloudinary.uploader.destroy(publicId).catch(() => {});
};

const getUserFilter = (req) => ({ createdBy: req.user._id });

/*
=============================================================
CREATE
=============================================================
*/

const createEmployee = asyncHandler(async (req, res) => {
  const {
    name,
    employeeCode,
    designation,
    department,
    email,
    phone,
    joiningDate,
    remarks,
  } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ message: "Employee name is required." });
  }

  const file = req.file || null;

  const employee = await Employee.create({
    name: name.trim(),
    employeeCode: employeeCode?.trim() || "",
    designation: designation?.trim() || "",
    department: department?.trim() || "",
    email: email?.trim() || "",
    phone: phone?.trim() || "",
    joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
    remarks: remarks?.trim() || "",
    photoUrl: file ? file.path : "",
    photoPublicId: file ? file.filename : "",
    createdBy: req.user._id,
  });

  res.status(201).json(employee);
});

/*
=============================================================
LIST
=============================================================
*/

const listEmployees = asyncHandler(async (req, res) => {
  const { search, status, department, page = 1, limit = 20 } = req.query;

  const filter = getUserFilter(req);

  if (search?.trim()) {
    const regex = new RegExp(search.trim(), "i");
    filter.$or = [
      { name: regex },
      { employeeCode: regex },
      { designation: regex },
      { department: regex },
      { email: regex },
      { phone: regex },
    ];
  }

  if (status && STATUSES.includes(status)) filter.status = status;
  if (department?.trim()) filter.department = new RegExp(department.trim(), "i");

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const [records, total] = await Promise.all([
    Employee.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Employee.countDocuments(filter),
  ]);

  // Active-asset counts per employee, in one aggregation rather than N
  // queries — this is "kitna saman kisko dia hai" at a glance on the list.
  const ids = records.map((r) => r._id);
  const counts = await AssetIssuance.aggregate([
    { $match: { ...getUserFilter(req), employee: { $in: ids } } },
    {
      $group: {
        _id: "$employee",
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ["$status", "Issued"] }, 1, 0] } },
      },
    },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c]));

  const withCounts = records.map((r) => ({
    ...r.toObject(),
    assetCounts: countMap.get(String(r._id)) || { total: 0, active: 0 },
  }));

  res.json({
    records: withCounts,
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
SUGGESTIONS (autocomplete) — department / designation
=============================================================
*/

const suggestDepartments = asyncHandler(async (req, res) => {
  const values = await Employee.distinct("department", { ...getUserFilter(req), department: { $ne: "" } });
  res.json(values.sort());
});

const suggestDesignations = asyncHandler(async (req, res) => {
  const values = await Employee.distinct("designation", { ...getUserFilter(req), designation: { $ne: "" } });
  res.json(values.sort());
});

/*
=============================================================
GET ONE — includes all asset issuances for this employee
=============================================================
*/

const getEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ _id: req.params.id, ...getUserFilter(req) });

  if (!employee) {
    return res.status(404).json({ message: "Employee not found." });
  }

  const assets = await AssetIssuance.find({
    employee: employee._id,
    ...getUserFilter(req),
  }).sort({ issueDate: -1 });

  res.json({ ...employee.toObject(), assets });
});

/*
=============================================================
UPDATE
=============================================================
*/

const updateEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ _id: req.params.id, ...getUserFilter(req) });

  if (!employee) {
    return res.status(404).json({ message: "Employee not found." });
  }

  const {
    name,
    employeeCode,
    designation,
    department,
    email,
    phone,
    joiningDate,
    status,
    lastWorkingDate,
    remarks,
    removePhoto,
  } = req.body;

  if (name !== undefined) {
    if (!name.trim()) return res.status(400).json({ message: "Employee name is required." });
    employee.name = name.trim();
  }
  if (employeeCode !== undefined) employee.employeeCode = employeeCode.trim();
  if (designation !== undefined) employee.designation = designation.trim();
  if (department !== undefined) employee.department = department.trim();
  if (email !== undefined) employee.email = email.trim();
  if (phone !== undefined) employee.phone = phone.trim();
  if (joiningDate !== undefined) employee.joiningDate = joiningDate ? new Date(joiningDate) : employee.joiningDate;
  if (status !== undefined && STATUSES.includes(status)) {
    // Same rule as the dedicated markResigned action below — enforced
    // here too so a plain edit can't silently bypass it by setting
    // status directly instead of using that action.
    if (status !== "Active" && employee.status === "Active") {
      const activeAssetCount = await AssetIssuance.countDocuments({
        employee: employee._id,
        ...getUserFilter(req),
        status: "Issued",
      });

      if (activeAssetCount > 0) {
        return res.status(409).json({
          message: `This employee still has ${activeAssetCount} item(s) marked as issued. Return them first before marking as ${status.toLowerCase()}.`,
          activeAssetCount,
        });
      }
    }

    employee.status = status;
  }
  if (lastWorkingDate !== undefined) {
    employee.lastWorkingDate = lastWorkingDate ? new Date(lastWorkingDate) : null;
  }
  if (remarks !== undefined) employee.remarks = remarks.trim();

  if (removePhoto === "true" && employee.photoPublicId) {
    await destroyPhoto(employee.photoPublicId);
    employee.photoUrl = "";
    employee.photoPublicId = "";
  }

  const file = req.file || null;
  if (file) {
    await destroyPhoto(employee.photoPublicId);
    employee.photoUrl = file.path;
    employee.photoPublicId = file.filename;
  }

  await employee.save();

  res.json(employee);
});

/*
=============================================================
MARK RESIGNED / REACTIVATE
=============================================================
*/

const markResigned = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ _id: req.params.id, ...getUserFilter(req) });
  if (!employee) return res.status(404).json({ message: "Employee not found." });

  const activeAssetCount = await AssetIssuance.countDocuments({
    employee: employee._id,
    ...getUserFilter(req),
    status: "Issued",
  });

  if (activeAssetCount > 0) {
    return res.status(409).json({
      message: `This employee still has ${activeAssetCount} item(s) marked as issued. Return them first before marking as resigned.`,
      activeAssetCount,
    });
  }

  const { lastWorkingDate, status } = req.body;

  employee.status = STATUSES.includes(status) ? status : "Resigned";
  employee.lastWorkingDate = lastWorkingDate ? new Date(lastWorkingDate) : new Date();

  await employee.save();
  res.json(employee);
});

const reactivateEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ _id: req.params.id, ...getUserFilter(req) });
  if (!employee) return res.status(404).json({ message: "Employee not found." });

  employee.status = "Active";
  employee.lastWorkingDate = null;

  await employee.save();
  res.json(employee);
});

/*
=============================================================
DELETE
=============================================================
*/

const deleteEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ _id: req.params.id, ...getUserFilter(req) });
  if (!employee) return res.status(404).json({ message: "Employee not found." });

  const assetCount = await AssetIssuance.countDocuments({ employee: employee._id, ...getUserFilter(req) });

  if (assetCount > 0) {
    return res.status(409).json({
      message: `This employee has ${assetCount} asset record(s) on file. Delete or reassign those first.`,
      assetCount,
    });
  }

  await destroyPhoto(employee.photoPublicId);
  await employee.deleteOne();

  res.json({ message: "Employee deleted.", id: req.params.id });
});

module.exports = {
  createEmployee,
  listEmployees,
  suggestDepartments,
  suggestDesignations,
  getEmployee,
  updateEmployee,
  markResigned,
  reactivateEmployee,
  deleteEmployee,
};
