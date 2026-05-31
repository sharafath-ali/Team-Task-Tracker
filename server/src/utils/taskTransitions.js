/**
 * Task Status Transition State Machine
 *
 * Allowed flows:
 *   TODO        → IN_PROGRESS, BLOCKED
 *   IN_PROGRESS → IN_REVIEW,   BLOCKED
 *   IN_REVIEW   → DONE, IN_PROGRESS, BLOCKED
 *   BLOCKED     → TODO, IN_PROGRESS
 *   DONE        → (terminal — no further transitions)
 *
 * Only the assignee or a MANAGER/ADMIN can trigger transitions.
 * This is enforced in tasks.service.js, not here.
 */
const VALID_TRANSITIONS = {
  TODO: ["IN_PROGRESS", "BLOCKED"],
  IN_PROGRESS: ["IN_REVIEW", "BLOCKED"],
  IN_REVIEW: ["DONE", "IN_PROGRESS", "BLOCKED"],
  BLOCKED: ["TODO", "IN_PROGRESS"],
  DONE: [], // terminal
};

/**
 * @param {string} from  Current status
 * @param {string} to    Desired status
 * @returns {boolean}
 */
const isValidTransition = (from, to) => {
  const allowed = VALID_TRANSITIONS[from] ?? [];
  return allowed.includes(to);
};

/**
 * @param {string} status
 * @returns {string[]} Allowed next statuses
 */
const getAllowedTransitions = (status) => VALID_TRANSITIONS[status] ?? [];

module.exports = {
  VALID_TRANSITIONS,
  isValidTransition,
  getAllowedTransitions,
};
