const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    res.json({
      message: "Welcome to Pro Manage",
    });
});
  
module.exports = router;