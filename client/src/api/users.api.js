import api from "./axiosInstance";

export const listUsers = (params) => api.get("/users", { params });
export const getUser = (id) => api.get(`/users/${id}`);
export const createUser = (data) => api.post("/users", data);
export const updateUser = (id, data) => api.patch(`/users/${id}`, data);
export const deactivateUser = (id) => api.delete(`/users/${id}`);

export const getOverdue = () => api.get("/analytics/overdue");
export const getCompletionTime = () => api.get("/analytics/completion-time");
