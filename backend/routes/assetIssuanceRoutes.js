const express = require("express");
const router = express.Router();
const {
  createIssuance, listIssuances, getSummary, suggestCategories, suggestItems,
  getIssuance, updateIssuance, markReturned, reopenIssuance, deleteIssuance,
} = require("../controllers/assetIssuanceController");
const { protect } = require("../middleware/auth");
const { uploadAssetPhotos } = require("../middleware/upload");

router.use(protect);

router.get("/summary", getSummary);
router.get("/suggestions/categories", suggestCategories);
router.get("/suggestions/items", suggestItems);

router.get("/", listIssuances);
router.post("/", uploadAssetPhotos.fields([{ name: "issuePhotos", maxCount: 5 }]), createIssuance);

router.patch("/:id/return", uploadAssetPhotos.fields([{ name: "returnPhotos", maxCount: 5 }]), markReturned);
router.patch("/:id/reopen", reopenIssuance);
router.get("/:id", getIssuance);
router.put(
  "/:id",
  uploadAssetPhotos.fields([{ name: "issuePhotos", maxCount: 5 }]),
  updateIssuance
);
router.delete("/:id", deleteIssuance);

module.exports = router;
