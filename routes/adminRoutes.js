const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const { addAdmin } = require("../controllers/adminController");

router.post("/add", auth, addAdmin);

module.exports = router;
