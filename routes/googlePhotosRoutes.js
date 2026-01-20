const express = require("express");
const router = express.Router();
const googlePhotosController = require("../controllers/googlePhotosController");
const { protect } = require("../middlewares/authMiddleware");

router.post("/validate-link", protect, googlePhotosController.validateLink);
router.post("/sync", protect, googlePhotosController.syncFromLink);
router.get("/sync-status", protect, googlePhotosController.getSyncStatus);

module.exports = router;
