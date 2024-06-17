const express = require("express");
const router = express.Router();

router.get("/home/:id", (req, res, next) => {
  console.log(req.session.player);
  return res.render("game", { user: req.session.player });
});

module.exports = router;
