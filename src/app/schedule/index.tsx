import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScheduleList, useSchedule } from '@/features/schedule';

export default function ScheduleScreen() {
  const router = useRouter();
  const { sessions } = useSchedule();

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
          onSelectSession={(session) =>
            router.push({ pathname: '/schedule/[sessionId]', params: { sessionId: session.id } })
          }
        />
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
