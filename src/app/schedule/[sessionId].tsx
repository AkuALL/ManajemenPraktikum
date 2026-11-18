import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useIdentity } from '@/features/identity';
import { SessionDetail, useSchedule } from '@/features/schedule';
import { StudentAttendanceForm } from '@/features/attendance';
import {
  formatSessionDate,
  formatSessionTime,
  SessionLifecycleButtons,
  usePracticum,
} from '@/features/practicum';
import { LabSession } from '@/types';

export default function SessionDetailScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { activeIdentity } = useIdentity();
  const isAssistant = activeIdentity?.role === 'assistant';

  const { sessions: practicumSessions, openSession, closeSession, deleteSession } = usePracticum();
  const { getSessionById } = useSchedule();

  const practicumSession = practicumSessions.find((s) => s.id === sessionId);
  const fallbackSession = getSessionById(sessionId);

  // Normalisasi ke LabSession untuk kompatibilitas dengan komponen turunan
  const session: LabSession | null = practicumSession
    ? {
        id: practicumSession.id,
        classId: practicumSession.classId,
        practicumName: practicumSession.title,
        courseClass: practicumSession.className
          ? `${practicumSession.className} - ${practicumSession.courseName ?? ''}`
          : practicumSession.courseName ?? 'Kelas Praktikum',
        location: practicumSession.location,
        date: formatSessionDate(practicumSession.date, practicumSession.startsAt),
        startsAt: formatSessionTime(practicumSession.startsAt),
        endsAt: formatSessionTime(practicumSession.endsAt),
        status:
          practicumSession.status === 'scheduled'
            ? 'upcoming'
            : practicumSession.status === 'open'
              ? 'open'
              : 'closed',
        assistantName: practicumSession.assistantName ?? 'Asisten Praktikum',
      }
    : fallbackSession ?? null;

  const handleDeleteSession = async (id: string) => {
    await deleteSession(id);
    router.replace('/schedule');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali ke jadwal praktikum"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
        >
          <Text style={styles.backButtonText}>← Kembali ke jadwal</Text>
        </Pressable>

        {session ? (
          <>
            <SessionDetail session={session} />

            {/* Lifecycle Buka & Tutup Sesi untuk Asisten (GA-04 / FR-07) */}
            {practicumSession && isAssistant && (
              <SessionLifecycleButtons
                session={practicumSession}
                isAssistant={isAssistant}
                onOpenSession={openSession}
                onCloseSession={closeSession}
                onDeleteSession={handleDeleteSession}
              />
            )}

            {/* Form Presensi Mahasiswa untuk Praktikan (FR-08) */}
            {!isAssistant && <StudentAttendanceForm session={session} />}
          </>
        ) : (
          <View style={styles.notFound}>
            <Text style={styles.notFoundTitle}>Sesi tidak ditemukan</Text>
            <Text style={styles.notFoundDescription}>
              Sesi yang dipilih sudah tidak tersedia pada jadwal ini.
            </Text>
          </View>
        )}
      </ScrollView>
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
  backButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingRight: 12,
  },
  backButtonPressed: {
    opacity: 0.65,
  },
  backButtonText: {
    color: '#0369A1',
    fontSize: 15,
    fontWeight: '700',
  },
  notFound: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D9E1EC',
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    padding: 24,
  },
  notFoundTitle: {
    color: '#172033',
    fontSize: 17,
    fontWeight: '700',
  },
  notFoundDescription: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
