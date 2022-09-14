const { isValidObjectId } = require("mongoose");
const { sendError } = require("../utils/helper");
const User = require("../model/user");
const ResetToken = require("../model/resetToken");

exports.isResetTokenValid = async (req, res, next) => {
  const { token, id } = req.query;
  if (!token || !id) return sendError(res, "missing parameters");

  if (!isValidObjectId(id)) return sendError(res, "invalid user id!");

  const user = await User.findById(id);
  if (!user) return sendError(res, "invalid user!");

  const resetToken = await ResetToken.findOne({ owner: user._id });
  if (!resetToken) return sendError(res, "no token found!");

  const isValid = await resetToken.compareToken(token);
  if (!isValid) return sendError(res, "invalid token!");

  req.user = user;
  next();
};
