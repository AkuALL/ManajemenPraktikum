import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import { useColorScheme, SafeAreaView, StyleSheet, View } from 'react-native';

import { IdentityProvider, IdentitySelectionModal, IdentityBar } from '@/features/identity';
import { RoleTabBar } from '@/features/navigation';
import { Colors } from '@/constants/theme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <IdentityProvider>
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
          <IdentityBar />
          <View style={styles.content}>
            <Stack screenOptions={{ headerShown: false }} />
          </View>
          <RoleTabBar />
          <IdentitySelectionModal />
        </SafeAreaView>
      </IdentityProvider>
    </ThemeProvider>
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
