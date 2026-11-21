import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

import { APP_ROUTES } from '@/features/navigation';

export default function PresensiScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const cleanSessionId = typeof sessionId === 'string' && sessionId.trim() ? sessionId.trim() : undefined;

  return (
    <Redirect
      href={{
        pathname: APP_ROUTES.SCAN,
        params: cleanSessionId ? { sessionId: cleanSessionId } : undefined,
      } as never}
    />
  );
}
