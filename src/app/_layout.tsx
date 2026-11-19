import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppShellSkeleton } from '@/components/ui/skeleton';
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

  if (status === 'loading') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top', 'bottom']}>
        <AppShellSkeleton />
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
});
