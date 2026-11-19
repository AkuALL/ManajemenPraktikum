import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check, Search } from 'lucide-react-native';

import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { FlyAwayBottomSheet } from './fly-away-bottom-sheet';

export type PickerOption = {
  value: string;
  label: string;
  subtitle?: string;
};

type PickerBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  options: PickerOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
};

export function PickerBottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  options,
  selectedValue,
  onSelect,
  searchable = true,
  searchPlaceholder = 'Cari pilihan...',
  emptyText = 'Tidak ada pilihan yang cocok.',
}: PickerBottomSheetProps) {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const [query, setQuery] = useState('');

  const filteredOptions = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(trimmed) ||
        option.subtitle?.toLowerCase().includes(trimmed),
    );
  }, [options, query]);

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  return (
    <FlyAwayBottomSheet
      visible={visible}
      onClose={handleClose}
      title={title}
      subtitle={subtitle ?? 'Ketuk salah satu untuk mengganti tampilan'}
      maxHeight="78%"
    >
      <View style={styles.container}>
        {searchable && options.length > 4 ? (
          <View
            style={[
              styles.searchBox,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            <Search size={15} color={colors.textSubtle} strokeWidth={2} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor={colors.textSubtle}
              style={[styles.searchInput, { color: colors.textPrimary }]}
            />
          </View>
        ) : null}

        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {filteredOptions.length === 0 ? (
            <View
              style={[
                styles.emptyBox,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{emptyText}</Text>
            </View>
          ) : (
            filteredOptions.map((option) => {
              const selected = option.value === selectedValue;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    onSelect(option.value);
                    handleClose();
                  }}
                  style={({ pressed }) => [
                    styles.optionRow,
                    {
                      backgroundColor: selected ? colors.pacificSoft : colors.background,
                      borderColor: selected ? colors.pacific : colors.border,
                      borderWidth: selected ? 1.5 : 1,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.optionText}>
                    <Text
                      style={[
                        styles.optionLabel,
                        { color: selected ? colors.pacificDark : colors.textPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      {option.label}
                    </Text>
                    {option.subtitle ? (
                      <Text
                        style={[styles.optionSubtitle, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {option.subtitle}
                      </Text>
                    ) : null}
                  </View>

                  {selected ? (
                    <View style={[styles.selectedBadge, { backgroundColor: colors.pacific }]}>
                      <Check size={12} color="#FCFCFA" strokeWidth={2.6} />
                    </View>
                  ) : null}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>
    </FlyAwayBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    paddingBottom: 6,
  },
  searchBox: {
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    paddingVertical: 0,
  },
  listScroll: {
    maxHeight: 340,
  },
  listContent: {
    gap: 8,
    paddingBottom: 4,
  },
  optionRow: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    lineHeight: 19,
  },
  optionSubtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    lineHeight: 16,
  },
  selectedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
  },
  pressed: {
    opacity: 0.78,
  },
});
