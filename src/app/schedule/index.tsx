import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AssistantSessionActionControls } from '@/components/assistant';
import { StudentAttendanceForm } from '@/features/attendance';
import { useIdentity } from '@/features/identity';
import { ScheduleList, SessionDetailBottomSheet, useSchedule } from '@/features/schedule';

export default function ScheduleScreen() {
  const { activeIdentity } = useIdentity();
  const { getSessionById, sessions, updateSessionStatus } = useSchedule();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const selectedSession = selectedSessionId ? getSessionById(selectedSessionId) ?? null : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <Text style={styles.title}>Jadwal Praktikum</Text>
          <Text style={styles.subtitle}>
            Pilih sesi untuk melihat lokasi, waktu, dan status terkini.
          </Text>
        </View>
        <ScheduleList
          sessions={sessions}
          onSelectSession={(session) => setSelectedSessionId(session.id)}
        />
      </ScrollView>

      <SessionDetailBottomSheet
        onClose={() => setSelectedSessionId(null)}
        session={selectedSession}
        visible={selectedSession !== null}>
        {selectedSession && activeIdentity?.role === 'assistant' ? (
          <AssistantSessionActionControls
            role="assistant"
            session={selectedSession}
            onStatusChange={updateSessionStatus}
          />
        ) : selectedSession ? (
          <StudentAttendanceForm session={selectedSession} />
        ) : null}
      </SessionDetailBottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F4F7FB',
    flex: 1,
  },
  content: {
    gap: 20,
    padding: 20,
    paddingBottom: 32,
  },
  heading: {
    gap: 6,
  },
  title: {
    color: '#172033',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: '#516078',
    fontSize: 15,
    lineHeight: 22,
  },
});
