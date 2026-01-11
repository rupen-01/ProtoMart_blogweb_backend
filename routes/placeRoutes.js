const express = require("express");
const router = express.Router();

const placeController = require("../controllers/placeController");

// Public Routes

router.get("/", placeController.getAllPlaces);
router.get("/map", placeController.getPlacesForMap);
router.get("/:id/photos", placeController.getPlacePhotos);
router.get("/hierarchy", placeController.getPlacesHierarchy);
router.get("/:id", placeController.getPlaceById);
router.get("/:id/blogs", placeController.getPlaceBlogs);

module.exports = router;
