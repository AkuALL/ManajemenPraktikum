import * as Device from 'expo-device';
import { Link } from 'expo-router';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedIcon } from '@/components/animated-icon';
import { HintRow } from '@/components/hint-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WebBadge } from '@/components/web-badge';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

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
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.heroSection}>
          <AnimatedIcon />
          <ThemedText type="title" style={styles.title}>
            Manajemen Praktikum
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
            Sprint 1 · Domain Kaka (Merdeka Dewa Zuliyanto)
          </ThemedText>
        </ThemedView>

        {/* Akses Cepat ke Fitur Aksi Sesi Asisten */}
        <Link href="/assistant-actions-demo" asChild>
          <Pressable style={styles.featureButton}>
            <ThemedView type="backgroundElement" style={styles.featureCard}>
              <ThemedText type="smallBold">
                ▶ Aksi Sesi Asisten (FR-05 & FR-06)
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Buka / Tutup Sesi & Konfirmasi Modal
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
            title="Demo Screen"
            hint={<ThemedText type="code">/assistant-actions-demo</ThemedText>}
          />
          <HintRow title="Dev tools" hint={getDevMenuHint()} />
        </ThemedView>

        {Platform.OS === 'web' && <WebBadge />}
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
});
