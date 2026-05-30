import api from './axiosInstance';

export const listTasks    = (params) => api.get('/tasks', { params });
export const getTask      = (id)     => api.get(`/tasks/${id}`);
export const createTask   = (data)   => api.post('/tasks', data);
export const updateTask   = (id, data) => api.patch(`/tasks/${id}`, data);
export const updateStatus = (id, status) => api.patch(`/tasks/${id}/status`, { status });
export const deleteTask   = (id)     => api.delete(`/tasks/${id}`);
