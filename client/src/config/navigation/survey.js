import { ClipboardList, CalendarDays, User } from 'lucide-react';

/** Field layout — three items at the bottom. */
export const surveyNav = [
  { to: '/field/surveys', label: 'My day', icon: ClipboardList },
  { to: '/field/surveys/upcoming', label: 'Upcoming', icon: CalendarDays },
  { to: '/field/profile', label: 'Profile', icon: User },
];
