const User = require("../model/user");
const VerificationToken = require("../model/verificationToken");
const ResetToken = require("../model/resetToken");
const { sendError, createRandomBytes } = require("../utils/helper");
const jwt = require("jsonwebtoken");
const {
  generateOTP,
  sendEmail,
  otpEmailTemplate,
  welcomeEmailTemplate,
  resetPasswordTemplate,
  paswordChnagesuccessfullTemplate,
} = require("../utils/mail");
const { isValidObjectId } = require("mongoose");
const crypto = require("crypto");

exports.signup = async (req, res) => {
  const { name, email, password } = req.body;
  const isExist = await User.findOne({ email });
  if (isExist) {
    console.log(isExist);
    return sendError(res, "This email already exists!");
  }
  const newUser = new User({
    name,
    email,
    password,
  });

  const OTP = generateOTP();
  const verificationToken = new VerificationToken({
    owner: newUser._id,
    token: OTP,
  });

  await verificationToken.save();
  await newUser.save();

  await sendEmail(email, "Verify Email", otpEmailTemplate(name, OTP));

  res.send(newUser);
};

exports.signin = async (req, res) => {
  const { email, password } = req.body;
  if (!email.trim() || !password.trim()) {
    return sendError(res, "email/password missing !");
  }
  const user = await User.findOne({ email });
  if (!user) {
    return sendError(res, "User not found!");
  }
  const isMatched = await user.comparePassword(password);
  if (!isMatched) {
    console.log(isMatched);
    return sendError(res, "wrong password!");
  }

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
  res.json({
    success: true,
    user: { name: user.name, email: user.email, id: user._id, token },
  });
};

exports.verifyEmail = async (req, res) => {
  const { userId, otp } = req.body;
  if (!userId || !otp.trim()) {
    return sendError(res, "Missing Paramters!");
  }
  if (!isValidObjectId(userId)) {
    return sendError(res, "Invalid user Id!");
  }

  const user = await User.findById(userId);
  if (!user) {
    return sendError(res, "User Not Found!");
  }

  if (user.verified) {
    return sendError(res, "User already verified!");
  }

  const token = await VerificationToken.findOne({ owner: user._id });
  if (!token) {
    return sendError(res, "User Not Found!");
  }

  const isMatched = await token.compareToken(otp);
  if (!isMatched) {
    return sendError(res, "Invalid OTP!");
  }
  user.verified = true;

  await VerificationToken.findByIdAndDelete(token._id);
  await user.save();
  await sendEmail(
    user.email,
    "Email verified successfully",
    welcomeEmailTemplate(user.name)
  );

  return res.json({
    success: true,
    message: "Email Verified Sucessfully!",
    user: { name: user.name, email: user.email, id: user._id },
  });
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return sendError(res, "Please provide a valid email!");

  const user = await User.findOne({ email });
  if (!user) return sendError(res, "User not found!");

  const token = await ResetToken.findOne({ owner: user._id });
  if (token)
    return sendError(
      res,
      "Token sent already, request another after one hours!"
    );

  const randomToken = await createRandomBytes();

  const resetToken = new ResetToken({ owner: user._id, token: randomToken });
  await resetToken.save();
  await sendEmail(
    user.email,
    "Password Change Request",
    resetPasswordTemplate(
      `${process.env.BASE_URL}/reset-password?token=${randomToken}&id=${user._id}`
    )
  );

  res.json({
    success: true,
    message: "Reset link sent to your e-mail successfully!",
  });
};

exports.resetPassword = async (req, res) => {
  const { password } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) return sendError(res, "user not found!");

  const isMatched = await user.comparePassword(password);
  if (isMatched) return sendError(res, "new password is same as old password");

  if (password.trim().length < 8 || password.trim().length > 20)
    return sendError(res, "Password must be 8 to 20 characters long!");

  user.password = password.trim();
  await user.save();

  await ResetToken.findOneAndDelete({ owner: user._id });
  await sendEmail(
    user.email,
    "Password changed successfully",
    paswordChnagesuccessfullTemplate(`${process.env.BASE_URL}/login`)
  );
  res.json({ success: true, message: "Password changed sucessfully!!" });
};
