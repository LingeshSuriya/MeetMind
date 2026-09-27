import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({ baseURL: API_URL });

export const getDashboardStats      = ()           => api.get('/meetings/stats').then(r => r.data);
export const getMeetings            = (page=1,limit=20) => api.get(`/meetings?page=${page}&limit=${limit}`).then(r => Array.isArray(r.data) ? r.data : (r.data.meetings||[]));
export const getMeetingById         = (id)         => api.get(`/meetings/${id}`).then(r => r.data);
export const analyzeMeeting         = (data)       => api.post('/meetings/analyze', data).then(r => r.data);
export const deleteMeeting          = (id)         => api.delete(`/meetings/${id}`).then(r => r.data);
export const updateActionItemStatus = (id,status)  => api.patch(`/meetings/action-items/${id}`, { status }).then(r => r.data);
export const summarizeMeeting       = (id)         => api.post(`/meetings/${id}/summarize`).then(r => r.data);
export const getAllActionItems       = (status)     => api.get('/meetings/action-items', { params: status ? { status } : {} }).then(r => r.data);
export const getAllDeadlines         = ()           => api.get('/meetings/deadlines').then(r => r.data);

export default api;
