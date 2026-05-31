const { sendError } = require("../utils/response.utils");

/**
 * Role-Based Access Control middleware factory.
 * RBAC is enforced 100% here — zero role checks inside controllers.
 *
 * Usage:  router.get('/', authenticate, authorize('ADMIN', 'MANAGER'), controller.list)
 *
 * @param {...string} roles - Allowed roles (e.g. 'ADMIN', 'MANAGER', 'MEMBER')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, "UNAUTHORIZED", "Authentication required");
    }
    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        403,
        "FORBIDDEN",
        `Access denied. Required role(s): ${roles.join(", ")}. Your role: ${req.user.role}`,
      );
    }
    next();
  };
};

/**
 * Allows access only to the resource owner OR users with elevated roles.
 * Used for MEMBER self-access patterns.
 *
 * @param {...string} roles - Roles that bypass ownership check
 */
const authorizeOwnerOrRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, "UNAUTHORIZED", "Authentication required");
    }
    const isElevated = roles.includes(req.user.role);
    const isOwner = req.resourceOwnerId && req.resourceOwnerId === req.user.id;

    if (!isElevated && !isOwner) {
      return sendError(
        res,
        403,
        "FORBIDDEN",
        "You do not have permission to access this resource",
      );
    }
    next();
  };
};

module.exports = { authorize, authorizeOwnerOrRoles };
