import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import { useColorScheme, SafeAreaView, StyleSheet, View } from 'react-native';

import { IdentityProvider, IdentitySelectionModal, IdentityBar, useIdentity } from '@/features/identity';
import { RoleTabBar } from '@/features/navigation';
import { ScheduleProvider } from '@/features/schedule';
import { Colors } from '@/constants/theme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <IdentityProvider>
        <ScheduleProvider>
          <RoleAwareApp backgroundColor={colors.background} />
        </ScheduleProvider>
      </IdentityProvider>
    </ThemeProvider>
  );
}

function RoleAwareApp({ backgroundColor }: { backgroundColor: string }) {
  const { activeIdentity } = useIdentity();
  const isAssistant = activeIdentity?.role === 'assistant';
  const isStudent = activeIdentity?.role === 'student';
  const hasIdentity = activeIdentity !== null;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
      <IdentityBar />
      <View style={styles.content}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Protected guard={hasIdentity} redirectTo="/">
            <Stack.Screen name="schedule" />
          </Stack.Protected>
          <Stack.Protected guard={isAssistant} redirectTo="/">
            <Stack.Screen name="rekap" />
          </Stack.Protected>
          <Stack.Protected guard={isStudent} redirectTo="/">
            <Stack.Screen name="kehadiran" />
          </Stack.Protected>
        </Stack>
      </View>
      <RoleTabBar />
      <IdentitySelectionModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
