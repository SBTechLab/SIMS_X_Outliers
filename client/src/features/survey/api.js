import { api, postForm } from '@/lib/api.js';

export const surveyApi = {
  getMySurveys: (params) => api.get('/surveys', { params }),
  getSurvey: (id) => api.get(`/surveys/${id}`),
  startSurvey: (id) => api.post(`/surveys/${id}/start`, {}),
  submitReport: (id, formData) => postForm(`/surveys/${id}/report`, formData),
};
