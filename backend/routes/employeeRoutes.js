const express = require("express");
const router = express.Router();
const {
  createEmployee, listEmployees, suggestDepartments, suggestDesignations,
  getEmployee, updateEmployee, markResigned, reactivateEmployee, deleteEmployee,
} = require("../controllers/employeeController");
const { protect } = require("../middleware/auth");
const { uploadEmployeePhoto } = require("../middleware/upload");

router.use(protect);

router.get("/suggestions/departments", suggestDepartments);
router.get("/suggestions/designations", suggestDesignations);

router.get("/", listEmployees);
router.post("/", uploadEmployeePhoto.single("photo"), createEmployee);

router.patch("/:id/resign", markResigned);
router.patch("/:id/reactivate", reactivateEmployee);
router.get("/:id", getEmployee);
router.put("/:id", uploadEmployeePhoto.single("photo"), updateEmployee);
router.delete("/:id", deleteEmployee);

module.exports = router;
