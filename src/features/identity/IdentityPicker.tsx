import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { UserRole } from '@/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IdentityFixtureItem } from './types';
import { getIdentitiesByRole } from './fixtures';

interface IdentityPickerProps {
  role: UserRole;
  selectedIdentityId: string | null;
  onSelectIdentity: (item: IdentityFixtureItem) => void;
}

export function IdentityPicker({
  role,
  selectedIdentityId,
  onSelectIdentity,
}: IdentityPickerProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const identities = getIdentitiesByRole(role);
  const sectionLabel = role === 'assistant' ? 'IDENTITAS ASISTEN' : 'IDENTITAS PRAKTIKAN';

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{sectionLabel}</Text>

      {identities.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: colors.surfaceMuted }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Belum ada identitas dummy untuk peran ini.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {identities.map((item) => {
            const isSelected = selectedIdentityId === item.id;

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                accessibilityRole="radio"
                accessibilityLabel={`${item.name}, ${item.identifier}`}
                accessibilityState={{ selected: isSelected }}
                onPress={() => onSelectIdentity(item)}
                style={[
                  styles.itemCard,
                  {
                    backgroundColor: isSelected ? colors.surfaceMuted : colors.surface,
                    borderColor: isSelected ? colors.actionPrimary : colors.border,
                  },
                ]}
              >
                {/* Radio Circle Indicator */}
                <View
                  style={[
                    styles.radioOuter,
                    { borderColor: isSelected ? colors.actionPrimary : colors.border },
                  ]}
                >
                  {isSelected && (
                    <View
                      style={[
                        styles.radioInner,
                        { backgroundColor: colors.actionPrimary },
                      ]}
                    />
                  )}
                </View>

                {/* Identity Information */}
                <View style={styles.textContainer}>
                  <Text style={[styles.nameText, { color: colors.textPrimary }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.identifierText, { color: colors.textSecondary }]}>
                    {item.identifier}
                    {item.description ? ` · ${item.description}` : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  list: {
    gap: 8,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 52, // Target sentuh minimal mobile
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  textContainer: {
    flex: 1,
  },
  nameText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  identifierText: {
    fontSize: 13,
  },
  emptyContainer: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
});
