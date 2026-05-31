import api from "./axiosInstance";

export const listProjects = (params) => api.get("/projects", { params });
export const getProject = (id) => api.get(`/projects/${id}`);
export const createProject = (data) => api.post("/projects", data);
export const updateProject = (id, data) => api.patch(`/projects/${id}`, data);
export const deleteProject = (id) => api.delete(`/projects/${id}`);

// Project Members
export const getProjectMembers = (projectId) =>
  api.get(`/projects/${projectId}/members`);
export const addProjectMember = (projectId, data) =>
  api.post(`/projects/${projectId}/members`, data);
export const removeProjectMember = (projectId, userId) =>
  api.delete(`/projects/${projectId}/members/${userId}`);
export const updateProjectMember = (projectId, userId, data) =>
  api.patch(`/projects/${projectId}/members/${userId}`, data);
