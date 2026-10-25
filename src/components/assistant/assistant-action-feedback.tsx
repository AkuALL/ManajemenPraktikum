import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  useColorScheme,
} from 'react-native';

export interface ActionFeedbackMessage {
  type: 'success' | 'info' | 'error';
  message: string;
  timestamp?: string;
}

export interface AssistantActionFeedbackProps {
  feedback: ActionFeedbackMessage | null;
  onDismiss: () => void;
  autoHideDurationMs?: number;
}

export function AssistantActionFeedback({
  feedback,
  onDismiss,
  autoHideDurationMs = 3500,
}: AssistantActionFeedbackProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, autoHideDurationMs);

    return () => clearTimeout(timer);
  }, [feedback, autoHideDurationMs, onDismiss]);

  if (!feedback) {
    return null;
  }

  const isSuccess = feedback.type === 'success';
  const isError = feedback.type === 'error';
  const feedbackIcon = isSuccess ? '✓' : isError ? '✕' : 'ℹ';

  return (
    <View
      style={[
        styles.container,
        isDark ? styles.containerDark : styles.containerLight,
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite">
      <View style={styles.contentRow}>
        <View style={styles.iconCircle}>
          <Text
            style={[
              styles.iconText,
              isDark ? styles.textPrimaryDark : styles.textPrimaryLight,
            ]}>
            {feedbackIcon}
          </Text>
        </View>
        <View style={styles.textColumn}>
          <Text
            style={[
              styles.messageText,
              isDark ? styles.textPrimaryDark : styles.textPrimaryLight,
            ]}>
            {feedback.message}
          </Text>
          {feedback.timestamp ? (
            <Text
              style={[
                styles.timestampText,
                isDark ? styles.textSecondaryDark : styles.textSecondaryLight,
              ]}>
              Waktu: {feedback.timestamp}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Tutup notifikasi"
          style={({ pressed }) => [
            styles.dismissButton,
            pressed && styles.dismissPressed,
          ]}>
          <Text
            style={[
              styles.dismissText,
              isDark ? styles.textSecondaryDark : styles.textSecondaryLight,
            ]}>
            Tutup
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginVertical: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  containerLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D2D2D2',
  },
  containerDark: {
    backgroundColor: '#1E1E1E',
    borderColor: '#414141',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEEEEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 13,
    fontWeight: '700',
  },
  indicator: { width: 8, height: 8, borderRadius: 4 },
  successIndicator: { backgroundColor: '#171717' },
  infoIndicator: { backgroundColor: '#666666' },
  textColumn: {
    flex: 1,
  },
  messageText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  timestampText: {
    fontSize: 11,
    marginTop: 2,
  },
  dismissButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissPressed: {
    opacity: 0.6,
  },
  dismissText: {
    fontSize: 14,
    fontWeight: '600',
  },
  textPrimaryLight: {
    color: '#171717',
  },
  textPrimaryDark: {
    color: '#F5F5F5',
  },
  textSecondaryLight: {
    color: '#666666',
  },
  textSecondaryDark: {
    color: '#A0A0A0',
  },
});
