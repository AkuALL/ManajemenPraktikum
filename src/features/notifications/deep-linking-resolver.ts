import type { NotificationType, UserRole } from '@/types';

export type DeepLinkTarget = {
  pathname: string;
  params?: Record<string, string>;
};

const ALLOWED_STATIC_ROUTES = new Set([
  '/',
  '/presensi',
  '/kehadiran',
  '/schedule',
  '/izin',
  '/maps',
  '/review-izin',
  '/classes',
  '/rekap',
]);

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function isNotificationType(value: unknown): value is NotificationType {
  return (
    value === 'SESSION_OPENED' ||
    value === 'SCHEDULE_CHANGED' ||
    value === 'LEAVE_SUBMITTED' ||
    value === 'LEAVE_APPROVED' ||
    value === 'LEAVE_REJECTED'
  );
}

/**
 * Memetakan data payload push notification menjadi rute Expo Router tujuan (FR-15).
 */
export function resolveNotificationTargetRoute(
  data: Record<string, unknown> | null | undefined,
  role?: UserRole,
): DeepLinkTarget | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const type = isNotificationType(data.type) ? data.type : undefined;
  const sessionId = readString(data.sessionId);
  const rawRoute = readString(data.route);

  if (type === 'SESSION_OPENED') {
    if (role === 'assistant') {
      return sessionId
        ? { pathname: '/schedule/[sessionId]', params: { sessionId } }
        : { pathname: '/schedule' };
    }
    return sessionId
      ? { pathname: '/presensi', params: { sessionId } }
      : { pathname: '/presensi' };
  }

  if (type === 'LEAVE_SUBMITTED') {
    if (role === 'student') {
      return { pathname: '/kehadiran' };
    }
    return { pathname: '/review-izin' };
  }

  if (type === 'LEAVE_APPROVED' || type === 'LEAVE_REJECTED') {
    if (role === 'assistant') {
      return { pathname: '/review-izin' };
    }
    return { pathname: '/kehadiran' };
  }

  if (type === 'SCHEDULE_CHANGED') {
    return sessionId
      ? { pathname: '/schedule/[sessionId]', params: { sessionId } }
      : { pathname: '/schedule' };
  }

  if (rawRoute && ALLOWED_STATIC_ROUTES.has(rawRoute)) {
    if (rawRoute === '/presensi' && sessionId) {
      return { pathname: '/presensi', params: { sessionId } };
    }
    if (rawRoute === '/schedule' && sessionId) {
      return { pathname: '/schedule/[sessionId]', params: { sessionId } };
    }
    return { pathname: rawRoute };
  }

  return null;
}
