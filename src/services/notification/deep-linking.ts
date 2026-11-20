import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

import type { UserRole } from '@/types';

import {
  resolveNotificationTargetRoute,
  type DeepLinkTarget,
} from './deep-linking-resolver';

export { resolveNotificationTargetRoute, type DeepLinkTarget };

let handlerConfigured = false;

/**
 * Mengonfigurasi perilaku tampilan banner notifikasi saat aplikasi berada di foreground.
 */
export function configureForegroundNotificationHandler(): void {
  if (Platform.OS === 'web' || handlerConfigured) {
    return;
  }
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function readNotificationData(
  response: Notifications.NotificationResponse | null | undefined,
): Record<string, unknown> | null {
  const raw = response?.notification?.request?.content?.data;
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  return raw as Record<string, unknown>;
}

/**
 * Hook listener interaksi notifikasi (foreground, background, & cold start) untuk deep linking (FR-15).
 */
export function useNotificationDeepLinking(options: {
  enabled: boolean;
  role?: UserRole;
}): void {
  const router = useRouter();
  const { enabled, role } = options;

  useEffect(() => {
    if (!enabled || Platform.OS === 'web') {
      return;
    }

    const navigateFromResponse = (
      response: Notifications.NotificationResponse | null | undefined,
    ) => {
      const data = readNotificationData(response);
      const target = resolveNotificationTargetRoute(data, role);
      if (!target) return;

      if (target.params) {
        router.push({
          pathname: target.pathname,
          params: target.params,
        } as never);
      } else {
        router.push(target.pathname as never);
      }
      Notifications.clearLastNotificationResponse();
    };

    const initialResponse = Notifications.getLastNotificationResponse();
    if (initialResponse) {
      navigateFromResponse(initialResponse);
    }

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        navigateFromResponse(response);
      },
    );

    return () => {
      subscription.remove();
    };
  }, [enabled, role, router]);
}
