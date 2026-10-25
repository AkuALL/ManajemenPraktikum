import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { UserIdentity, UserRole } from '@/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useIdentity } from './context';
import { RolePicker } from './RolePicker';
import { IdentityPicker } from './IdentityPicker';
import { IdentityFixtureItem } from './types';
import { ASSISTANT_FIXTURES, STUDENT_FIXTURES } from './fixtures';

export function IdentitySelectionModal() {
  const {
    activeIdentity,
    selectIdentity,
    isSelectingIdentity,
    closeIdentitySelector,
  } = useIdentity();

  const canCancel = activeIdentity !== null;

  return (
    <Modal
      visible={isSelectingIdentity}
      animationType="slide"
      transparent={false}
      onRequestClose={() => {
        if (canCancel) {
          closeIdentitySelector();
        }
      }}
    >
      <IdentitySelectionContent
        key={`${activeIdentity?.role ?? 'new'}-${activeIdentity?.userId ?? 'identity'}-${isSelectingIdentity ? 'open' : 'closed'}`}
        activeIdentity={activeIdentity}
        closeIdentitySelector={closeIdentitySelector}
        selectIdentity={selectIdentity}
      />
    </Modal>
  );
}

type IdentitySelectionContentProps = {
  activeIdentity: UserIdentity | null;
  closeIdentitySelector: () => void;
  selectIdentity: (identity: UserIdentity) => void;
};

function IdentitySelectionContent({
  activeIdentity,
  closeIdentitySelector,
  selectIdentity,
}: IdentitySelectionContentProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const initialFixture = activeIdentity
    ? (activeIdentity.role === 'assistant' ? ASSISTANT_FIXTURES : STUDENT_FIXTURES).find(
        (item) => item.id === activeIdentity.userId
      ) ?? null
    : null;
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(activeIdentity?.role ?? null);
  const [selectedFixture, setSelectedFixture] = useState<IdentityFixtureItem | null>(initialFixture);
  const canCancel = activeIdentity !== null;

  const handleSelectRole = (role: UserRole) => {
    if (role !== selectedRole) {
      setSelectedRole(role);
      setSelectedFixture(null);
    }
  };

  const handleSelectIdentity = (item: IdentityFixtureItem) => {
    setSelectedFixture(item);
  };

  const handleConfirm = () => {
    if (!selectedRole || !selectedFixture) return;

    selectIdentity({
      role: selectedRole,
      userId: selectedFixture.id,
      displayName: selectedFixture.name,
      identifier: selectedFixture.identifier,
    });
  };

  const isConfirmDisabled = !selectedRole || !selectedFixture;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
          {/* Top Bar / Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.brandText, { color: colors.textPrimary }]}>Praktikum</Text>
            {canCancel ? (
              <TouchableOpacity
                onPress={closeIdentitySelector}
                accessibilityRole="button"
                accessibilityLabel="Batal ganti identitas"
                style={styles.cancelButton}
              >
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
                  Batal
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.stepIndicator, { color: colors.textSecondary }]}>
                {selectedRole ? '2 / 2' : '1 / 2'}
              </Text>
            )}
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Title & Subtitle */}
            <View style={styles.titleSection}>
              <Text style={[styles.heading, { color: colors.textPrimary }]}>
                Pilih peran Anda
              </Text>
              <Text style={[styles.subheading, { color: colors.textSecondary }]}>
                Pilih peran dan identitas untuk melanjutkan.
              </Text>
            </View>

            {/* Role Picker (GA-02) */}
            <RolePicker
              selectedRole={selectedRole}
              onSelectRole={handleSelectRole}
            />

            {/* Identity Picker (GA-03) */}
            {selectedRole && (
              <IdentityPicker
                role={selectedRole}
                selectedIdentityId={selectedFixture?.id ?? null}
                onSelectIdentity={handleSelectIdentity}
              />
            )}

            {/* Confirmation & Disclaimer Button */}
            <View style={styles.actionSection}>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={isConfirmDisabled}
                onPress={handleConfirm}
                accessibilityRole="button"
                accessibilityLabel="Lanjutkan dengan identitas terpilih"
                style={[
                  styles.continueButton,
                  {
                    backgroundColor: isConfirmDisabled
                      ? colors.disabledSurface
                      : colors.actionPrimary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.continueButtonText,
                    {
                      color: isConfirmDisabled
                        ? colors.disabledText
                        : isDark
                        ? Colors.light.textPrimary
                        : Colors.dark.textPrimary,
                    },
                  ]}
                >
                  Lanjutkan
                </Text>
              </TouchableOpacity>

              <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
                Demo lokal · perubahan tidak disimpan setelah aplikasi tutup
              </Text>
            </View>
          </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brandText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  stepIndicator: {
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  titleSection: {
    marginBottom: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 28,
  },
  subheading: {
    fontSize: 15,
    lineHeight: 22,
  },
  actionSection: {
    marginTop: 24,
  },
  continueButton: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  disclaimerText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
