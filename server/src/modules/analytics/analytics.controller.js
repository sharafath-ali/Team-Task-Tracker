const analyticsService = require("./analytics.service");
const { sendSuccess } = require("../../utils/response.utils");

const overdue = async (req, res, next) => {
  try {
    const data = await analyticsService.getOverdueTasks({
      orgId: req.user.org_id,
    });
    sendSuccess(res, { overdue: data });
  } catch (err) {
    next(err);
  }
};

const completionTime = async (req, res, next) => {
  try {
    const data = await analyticsService.getAvgCompletionTime({
      orgId: req.user.org_id,
    });
    sendSuccess(res, { completion: data });
  } catch (err) {
    next(err);
  }
};

module.exports = { overdue, completionTime };
