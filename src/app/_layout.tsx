import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Baloo2_600SemiBold,
  Baloo2_700Bold,
} from '@expo-google-fonts/baloo-2';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import {
  Rubik_400Regular,
  Rubik_500Medium,
  Rubik_600SemiBold,
  Rubik_700Bold,
} from '@expo-google-fonts/rubik';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppShellSkeleton } from '@/components/ui/skeleton';
import { ConfirmDialogHost } from '@/components/ui/confirm-dialog-host';
import { Colors } from '@/constants/theme';
import { AttendanceProvider } from '@/features/attendance';
import { AuthProvider, useAuth } from '@/features/auth';
import { LeaveProvider } from '@/features/leave';
import { RoleTabBar } from '@/features/navigation';
import { PracticumProvider } from '@/features/practicum';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  configureForegroundNotificationHandler,
  useNotificationDeepLinking,
} from '@/services/notification/deep-linking';
import { ForegroundNotificationHost } from '@/services/notification/foreground-notification-host';
import { registerDevicePushToken } from '@/services/notification/token-service';
import { subscribeWebPush } from '@/services/notification/web-push';

void SplashScreen.preventAutoHideAsync();
configureForegroundNotificationHandler();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const [fontsLoaded, fontError] = useFonts({
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    Rubik_400Regular,
    Rubik_500Medium,
    Rubik_600SemiBold,
    Rubik_700Bold,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

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
      <ConfirmDialogHost />
    </ThemeProvider>
  );
}

function RoleAwareApp({ backgroundColor }: { backgroundColor: string }) {
  const { status, user } = useAuth();
  const pathname = usePathname();
  const isScanScreen = pathname === '/scan';
  const containerBg = isScanScreen ? Colors.light.dockBg : backgroundColor;
  const isAuthenticated = status === 'authenticated' && user !== null;

  useNotificationDeepLinking({
    enabled: isAuthenticated,
    role: user?.role,
  });

  useEffect(() => {
    if (!isAuthenticated || !user?.uid) return;
    void subscribeWebPush(user.uid);
    void registerDevicePushToken(user.uid).then((result) => {
      if (!result.ok && result.reason !== 'unsupported') {
        console.warn(`Registrasi notifikasi tidak berhasil: ${result.reason}`);
      }
    });
  }, [isAuthenticated, user?.uid]);

  if (status === 'loading') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top', 'bottom']}>
        <AppShellSkeleton />
      </SafeAreaView>
    );
  }

  const isAssistant = isAuthenticated && user.role === 'assistant';
  const isStudent = isAuthenticated && user.role === 'student';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: containerBg }]} edges={['top']}>
      <StatusBar style={isScanScreen ? 'light' : 'auto'} />
      <View style={styles.content}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={!isAuthenticated} redirectTo="/">
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
          </Stack.Protected>
          <Stack.Protected guard={isAuthenticated} redirectTo="/login">
            <Stack.Screen name="index" />
            <Stack.Screen name="schedule" />
            <Stack.Screen name={'maps' as never} />
            <Stack.Screen name={'profil' as never} />
          </Stack.Protected>
          <Stack.Protected guard={isAssistant} redirectTo={isAuthenticated ? '/' : '/login'}>
            <Stack.Screen name="classes" />
            <Stack.Screen name="rekap" />
            <Stack.Screen name={'review-izin' as never} />
            <Stack.Screen name={'master-lab' as never} />
            <Stack.Screen name="assistant-actions-demo" />
          </Stack.Protected>
          <Stack.Protected guard={isStudent} redirectTo={isAuthenticated ? '/' : '/login'}>
            <Stack.Screen name="kehadiran" />
            <Stack.Screen name={'presensi' as never} />
            <Stack.Screen name={'izin' as never} />
            <Stack.Screen name={'scan' as never} />
          </Stack.Protected>
        </Stack>
      </View>
      {isAuthenticated ? <RoleTabBar /> : null}
      {isAuthenticated ? <ForegroundNotificationHost key={`${user.uid}:${user.role}`} role={user.role} /> : null}
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
