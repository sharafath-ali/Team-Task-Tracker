const authService = require("./auth.service");
const { sendSuccess } = require("../../utils/response.utils");

const register = async (req, res, next) => {
  try {
    const { org, user } = await authService.register(req.body);
    sendSuccess(res, { org, user }, 201);
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = await authService.login(
      req.body,
    );
    sendSuccess(res, { user, accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { accessToken, refreshToken } = await authService.refresh(
      req.body.refreshToken,
    );
    sendSuccess(res, { accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    await authService.logout(req.body.refreshToken);
    sendSuccess(res, { message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
};

const me = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    sendSuccess(res, { user });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refresh, logout, me };
