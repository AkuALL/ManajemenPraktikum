import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, FontFamily, MaxContentWidth } from '@/constants/theme';
import { useAssistantLeaveRequests, useLeave } from '@/features/leave';
import { usePracticum } from '@/features/practicum';
import type { PracticumSession } from '@/features/practicum/types';
import type { LeaveRequest } from '@/types';

import {
  dismissForegroundEvent,
  FOREGROUND_NOTIFICATION_DURATION_MS,
  getLeaveEvents,
  getSessionEvents,
  type ForegroundEvent,
} from './foreground-events';

export function ForegroundNotificationHost({ role }: { role: 'student' | 'assistant' }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { classes, sessions, loadingClasses, loadingSessions, classesError, sessionsError } = usePracticum();
  const { requests, loading: loadingLeaves, error: leaveError } = useLeave();
  const classIds = useMemo(() => classes.map((item) => item.id), [classes]);
  const classKey = [...classIds].sort().join(',');
  const assistantLeaves = useAssistantLeaveRequests(classIds, undefined, role === 'assistant');
  const previousSessions = useRef<{ key: string; items: PracticumSession[] } | null>(null);
  const previousLeaves = useRef<{ key: string; items: LeaveRequest[] } | null>(null);
  const [queue, setQueue] = useState<ForegroundEvent[]>([]);

  useEffect(() => {
    if (role !== 'student' || loadingSessions || sessionsError) return;
    const previous = previousSessions.current;
    previousSessions.current = { key: classKey, items: sessions };
    if (previous?.key === classKey && AppState.currentState === 'active') {
      const events = getSessionEvents(previous.items, sessions);
      if (events.length) setQueue((current) => [...current, ...events]);
    }
  }, [classKey, loadingSessions, role, sessions, sessionsError]);

  useEffect(() => {
    const ready = role === 'assistant'
      ? !loadingClasses && !classesError && !assistantLeaves.loading && !assistantLeaves.error
      : !loadingLeaves && !leaveError;
    if (!ready) return;
    const items = role === 'assistant' ? assistantLeaves.requests : requests;
    const key = role === 'assistant' ? classKey : 'student';
    const previous = previousLeaves.current;
    previousLeaves.current = { key, items };
    if (previous?.key === key && AppState.currentState === 'active') {
      const events = getLeaveEvents(previous.items, items, role);
      if (events.length) setQueue((current) => [...current, ...events]);
    }
  }, [assistantLeaves.error, assistantLeaves.loading, assistantLeaves.requests, classKey, classesError, leaveError, loadingClasses, loadingLeaves, requests, role]);

  const event = queue[0];

  useEffect(() => {
    if (!event) return;
    const timer = setTimeout(() => {
      setQueue((current) => dismissForegroundEvent(current, event));
    }, FOREGROUND_NOTIFICATION_DURATION_MS);
    return () => clearTimeout(timer);
  }, [event]);

  if (!event) return null;
  const dismiss = () => setQueue((current) => dismissForegroundEvent(current, event));
  return (
    <View pointerEvents="box-none" style={[styles.container, { top: insets.top + 8 }]}>
      <View style={styles.card} accessibilityRole="alert">
        <Bell size={20} color={Colors.light.baltic} />
        <Pressable accessibilityRole="button" onPress={() => { dismiss(); if (event.sessionId) router.push({ pathname: event.route, params: { sessionId: event.sessionId } } as never); else router.push(event.route as never); }} style={styles.content}>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.message}>{event.body}</Text>
          <Text style={styles.link}>Ketuk untuk melihat</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Tutup notifikasi" onPress={dismiss} hitSlop={10}>
          <X size={20} color={Colors.light.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', left: 12, right: 12, zIndex: 100, alignItems: 'center' },
  card: { width: '100%', maxWidth: MaxContentWidth, flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: Colors.light.border, backgroundColor: Colors.light.surface, elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  content: { flex: 1, gap: 3 },
  title: { fontFamily: FontFamily.sansBold, color: Colors.light.textPrimary, fontSize: 14 },
  message: { fontFamily: FontFamily.sansRegular, color: Colors.light.textSecondary, fontSize: 12.5, lineHeight: 18 },
  link: { fontFamily: FontFamily.sansSemiBold, color: Colors.light.baltic, fontSize: 11.5 },
});
