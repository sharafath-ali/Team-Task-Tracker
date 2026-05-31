const membersService = require("./project-members.service");
const { sendSuccess } = require("../../utils/response.utils");

const list = async (req, res, next) => {
  try {
    const members = await membersService.listMembers({
      projectId: req.params.id,
      orgId: req.user.org_id,
    });
    sendSuccess(res, { members });
  } catch (err) {
    next(err);
  }
};

const add = async (req, res, next) => {
  try {
    const member = await membersService.addMember({
      projectId: req.params.id,
      orgId: req.user.org_id,
      userId: req.body.user_id,
      projectRole: req.body.project_role,
    });
    sendSuccess(res, { member }, 201);
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await membersService.removeMember({
      projectId: req.params.id,
      orgId: req.user.org_id,
      userId: req.params.userId,
    });
    sendSuccess(res, { message: "Member removed from project" });
  } catch (err) {
    next(err);
  }
};

const updateRole = async (req, res, next) => {
  try {
    const member = await membersService.updateMemberRole({
      projectId: req.params.id,
      orgId: req.user.org_id,
      userId: req.params.userId,
      projectRole: req.body.project_role,
    });
    sendSuccess(res, { member });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, add, remove, updateRole };
