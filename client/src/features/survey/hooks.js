import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { surveyApi } from './api.js';

const SURVEY_KEYS = {
  all: ['my-surveys'],
  one: (id) => ['my-surveys', id],
};

export function useMySurveys(params = {}) {
  return useQuery({ queryKey: [...SURVEY_KEYS.all, params], queryFn: () => surveyApi.getMySurveys(params) });
}

export function useMySurvey(id) {
  return useQuery({ queryKey: SURVEY_KEYS.one(id), queryFn: () => surveyApi.getSurvey(id), enabled: !!id });
}

export function useStartSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => surveyApi.startSurvey(id),
    onSuccess: (_, id) => { qc.invalidateQueries({ queryKey: SURVEY_KEYS.one(id) }); toast.success('Survey started'); },
    onError: (e) => toast.error(e.message ?? 'Failed to start survey'),
  });
}
