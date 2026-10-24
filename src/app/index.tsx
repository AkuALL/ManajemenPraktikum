import React, { useState } from 'react';
import * as Device from 'expo-device';
import { Link } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedIcon } from '@/components/animated-icon';
import { AssistantSessionActionControls } from '@/components/assistant';
import { HintRow } from '@/components/hint-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WebBadge } from '@/components/web-badge';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { LabSession } from '@/types';

function getDevMenuHint() {
  if (Platform.OS === 'web') {
    return <ThemedText type="small">use browser devtools</ThemedText>;
  }
  if (Device.isDevice) {
    return (
      <ThemedText type="small">
        shake device or press <ThemedText type="code">m</ThemedText> in terminal
      </ThemedText>
    );
  }
  const shortcut = Platform.OS === 'android' ? 'cmd+m (or ctrl+m)' : 'cmd+d';
  return (
    <ThemedText type="small">
      press <ThemedText type="code">{shortcut}</ThemedText>
    </ThemedText>
  );
}

export default function HomeScreen() {
  const [session, setSession] = useState<LabSession>({
    id: 'ses-live-01',
    practicumName: 'Basis Data',
    courseClass: 'Kelas B',
    location: 'Lab Komputer 2',
    startsAt: '13.00',
    endsAt: '15.00',
    status: 'upcoming',
  });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={{ width: '100%' }}
          contentContainerStyle={{ alignItems: 'center', gap: Spacing.three, paddingBottom: BottomTabInset + Spacing.four }}
          showsVerticalScrollIndicator={false}>
          <ThemedView style={styles.heroSection}>
            <AnimatedIcon />
            <ThemedText type="title" style={styles.title}>
              Manajemen Praktikum
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
              Sprint 1 · Domain Kaka (Merdeka Dewa Zuliyanto)
            </ThemedText>
          </ThemedView>

          {/* Interactive Live Assistant Action Component on Home */}
          <ThemedView type="backgroundElement" style={styles.liveCardContainer}>
            <ThemedText type="smallBold" style={{ marginBottom: 4 }}>
              ⚡ Live Test: Kontrol Sesi Asisten
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={{ marginBottom: 8 }}>
              Status Sesi: {session.status.toUpperCase()} ({session.practicumName})
            </ThemedText>
            <AssistantSessionActionControls
              role="assistant"
              session={session}
              onStatusChange={(_, newStatus) => {
                setSession((prev) => ({ ...prev, status: newStatus }));
              }}
              hideWhenStudent={false}
            />
          </ThemedView>

          {/* Akses Cepat ke Layar Demo Lengkap */}
          <Link href="/assistant-actions-demo" asChild>
            <Pressable style={styles.featureButton}>
              <ThemedView type="backgroundElement" style={styles.featureCard}>
                <ThemedText type="smallBold">
                  📱 Buka Layar Demo Lengkap (/assistant-actions-demo) ›
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Simulasi 3 Sesi Kanonis, Switch Peran Praktikan & Guard
                </ThemedText>
              </ThemedView>
            </Pressable>
          </Link>

          <ThemedView type="backgroundElement" style={styles.stepContainer}>
            <HintRow
              title="Fitur Kaka"
              hint={<ThemedText type="code">src/components/assistant/</ThemedText>}
            />
            <HintRow
              title="Tab Navigasi"
              hint={<ThemedText type="code">Aksi Asisten</ThemedText>}
            />
            <HintRow title="Dev tools" hint={getDevMenuHint()} />
          </ThemedView>

          {Platform.OS === 'web' && <WebBadge />}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  title: {
    textAlign: 'center',
  },
  code: {
    textTransform: 'uppercase',
  },
  stepContainer: {
    gap: Spacing.three,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
  },
  featureButton: {
    alignSelf: 'stretch',
  },
  featureCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: 4,
    borderWidth: 1,
    borderColor: '#D2D2D2',
  },
  liveCardContainer: {
    alignSelf: 'stretch',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: '#D2D2D2',
  },
});
