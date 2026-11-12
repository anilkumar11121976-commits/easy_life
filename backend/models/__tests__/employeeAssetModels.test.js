// Run with: node --test models/__tests__/employeeAssetModels.test.js
//
// Schema-level checks only (no MongoDB connection needed) — mirrors the
// pattern in paymentModels.test.js.

const test = require("node:test");
const assert = require("node:assert/strict");

const Employee = require("../Employee");
const AssetIssuance = require("../AssetIssuance");

test("Employee requires a name and createdBy, defaults status to Active", () => {
  assert.ok(Employee.schema.paths.name.isRequired);
  assert.ok(Employee.schema.paths.createdBy.isRequired);
  assert.equal(Employee.schema.paths.status.defaultValue, "Active");
});

test("AssetIssuance requires employee + itemName, defaults status to Issued", () => {
  assert.ok(AssetIssuance.schema.paths.employee.isRequired);
  assert.ok(AssetIssuance.schema.paths.itemName.isRequired);
  assert.equal(AssetIssuance.schema.paths.status.defaultValue, "Issued");
  assert.equal(AssetIssuance.schema.paths.quantity.defaultValue, 1);
});

test("AssetIssuance keeps issue photos and return photos as separate arrays", () => {
  assert.notEqual(AssetIssuance.schema.paths.issuePhotos, AssetIssuance.schema.paths.returnPhotos);
  assert.ok(AssetIssuance.schema.paths["issuePhotos"]);
  assert.ok(AssetIssuance.schema.paths["returnPhotos"]);
});

test("AssetIssuance.employee references the Employee model", () => {
  assert.equal(AssetIssuance.schema.paths.employee.options.ref, "Employee");
});

test("category is free text (an open list), not a closed enum", () => {
  // The whole point of this field is "whatever the company hands out" —
  // confirm it was never accidentally locked down to a fixed enum.
  assert.equal(AssetIssuance.schema.paths.category.enumValues.length, 0);
});
