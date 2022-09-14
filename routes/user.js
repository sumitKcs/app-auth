const router = require("express").Router();
const {
  signup,
  signin,
  verifyEmail,
  forgotPassword,
  resetPassword,
} = require("../controllers/user");

const { userValidator, validate } = require("../middleware/validator");
const { isResetTokenValid } = require("../middleware/user");

router.post("/signup", userValidator, validate, signup);
router.post("/signin", signin);
router.post("/verify-email", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", isResetTokenValid, resetPassword);
router.get("/verify-token", isResetTokenValid, (req, res) => {
  res.json({ success: true });
});

module.exports = router;
