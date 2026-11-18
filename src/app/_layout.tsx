import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { AttendanceProvider } from '@/features/attendance';
import { AccountBar, AuthProvider, useAuth } from '@/features/auth';
import { LeaveProvider } from '@/features/leave';
import { RoleTabBar } from '@/features/navigation';
import { PracticumProvider } from '@/features/practicum';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AttendanceProvider>
          <PracticumProvider>
            <LeaveProvider>
              <RoleAwareApp backgroundColor={colors.background} />
            </LeaveProvider>
          </PracticumProvider>
        </AttendanceProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function RoleAwareApp({ backgroundColor }: { backgroundColor: string }) {
  const { status, user } = useAuth();
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  if (status === 'loading') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="small" color={colors.textPrimary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Memeriksa sesi
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isAuthenticated = status === 'authenticated' && user !== null;
  const isAssistant = isAuthenticated && user.role === 'assistant';
  const isStudent = isAuthenticated && user.role === 'student';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top', 'bottom']}>
      {isAuthenticated ? <AccountBar /> : null}
      <View style={styles.content}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={!isAuthenticated} redirectTo="/">
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
          </Stack.Protected>
          <Stack.Protected guard={isAuthenticated} redirectTo="/login">
            <Stack.Screen name="index" />
            <Stack.Screen name="schedule" />
          </Stack.Protected>
          <Stack.Protected guard={isAssistant} redirectTo={isAuthenticated ? '/' : '/login'}>
            <Stack.Screen name="classes" />
            <Stack.Screen name="rekap" />
            <Stack.Screen name={'review-izin' as never} />
            <Stack.Screen name="assistant-actions-demo" />
          </Stack.Protected>
          <Stack.Protected guard={isStudent} redirectTo={isAuthenticated ? '/' : '/login'}>
            <Stack.Screen name="kehadiran" />
            <Stack.Screen name={'izin' as never} />
          </Stack.Protected>
        </Stack>
      </View>
      {isAuthenticated ? <RoleTabBar /> : null}
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
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '400',
  },
});
