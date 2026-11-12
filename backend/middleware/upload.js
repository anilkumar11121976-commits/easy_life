const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { cloudinary } = require("../config/cloudinary");

// --- existing: bill/receipt photo uploads (unchanged) ---
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "expense-reminder/bills",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 1200, height: 1200, crop: "limit" }],
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
});

// --- new: task chat photo uploads ---
const taskPhotoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "expense-reminder/task-chat",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 1600, height: 1600, crop: "limit" }],
  },
});

const uploadTaskPhoto = multer({
  storage: taskPhotoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per photo
});

// --- new: payment screenshot uploads — shared by both received-payments
// and sent-payments routes, since both just attach one optional screenshot
// to an otherwise-identical kind of record. ---
const paymentScreenshotStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "expense-reminder/payments",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 1600, height: 1600, crop: "limit" }],
  },
});

const uploadPaymentScreenshot = multer({
  storage: paymentScreenshotStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  // Belt-and-suspenders: allowed_formats above already restricts what
  // Cloudinary will accept, but don't trust the file extension/MIME
  // string alone — reject anything not declaring itself as an image
  // before it's even uploaded.
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed for the payment screenshot."));
    }
    cb(null, true);
  },
});

// --- new: employee profile photo uploads (single photo) ---
const employeePhotoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "expense-reminder/employees",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 800, height: 800, crop: "limit" }],
  },
});

const uploadEmployeePhoto = multer({
  storage: employeePhotoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed for the employee photo."));
    }
    cb(null, true);
  },
});

// --- new: asset issue/return proof photos (multiple, both directions) ---
const assetPhotoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "expense-reminder/assets",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 1600, height: 1600, crop: "limit" }],
  },
});

const uploadAssetPhotos = multer({
  storage: assetPhotoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per photo
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed for asset photos."));
    }
    cb(null, true);
  },
});

// Default export stays the bills uploader (unchanged for existing callers).
// The rest are attached as named properties for their respective routes.
module.exports = upload;
module.exports.uploadTaskPhoto = uploadTaskPhoto;
module.exports.uploadPaymentScreenshot = uploadPaymentScreenshot;
module.exports.uploadEmployeePhoto = uploadEmployeePhoto;
module.exports.uploadAssetPhotos = uploadAssetPhotos;