import { Stack } from 'expo-router';

import { ScheduleProvider } from '@/features/schedule';

export default function ScheduleLayout() {
  return (
    <ScheduleProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ScheduleProvider>
  );
}
