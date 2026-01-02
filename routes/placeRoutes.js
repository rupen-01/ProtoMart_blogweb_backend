const express = require("express");
const router = express.Router();

const placeController = require("../controllers/placeController");

// Public Routes
router.get("/", placeController.getAllPlaces);
router.get("/map", placeController.getPlacesForMap);
router.get("/:id/photos", placeController.getPlacePhotos);
router.get("/:id", placeController.getPlaceById);

module.exports = router;
