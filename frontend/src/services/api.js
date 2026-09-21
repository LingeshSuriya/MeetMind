import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
});

export const getDashboardStats = () => api.get('/meetings/stats').then(res => res.data);
export const getMeetings = (page = 1, limit = 20) =>
  api.get(`/meetings?page=${page}&limit=${limit}`).then(res =>
    // Support both paginated {meetings:[]} and plain array responses
    Array.isArray(res.data) ? res.data : (res.data.meetings || [])
  );
export const summarizeMeeting = (id) =>
  api.post(`/meetings/${id}/summarize`).then(res => res.data);
export const getMeetingById = (id) => api.get(`/meetings/${id}`).then(res => res.data);
export const analyzeMeeting = (data) => api.post('/meetings/analyze', data).then(res => res.data);
export const deleteMeeting = (id) => api.delete(`/meetings/${id}`).then(res => res.data);
export const updateActionItemStatus = (id, status) => api.patch(`/meetings/action-items/${id}`, { status }).then(res => res.data);

export default api;
