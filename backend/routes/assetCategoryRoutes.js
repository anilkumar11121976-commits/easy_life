const express = require("express");
const router = express.Router();
const { listCategories, createCategory, renameCategory, deleteCategory } = require("../controllers/assetCategoryController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.get("/", listCategories);
router.post("/", createCategory);
router.put("/:id", renameCategory);
router.delete("/:id", deleteCategory);

module.exports = router;
