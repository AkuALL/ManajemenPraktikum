import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronDown, ListFilter, Search, X } from 'lucide-react-native';

import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type SearchFilterBarProps = {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  searchPlaceholder?: string;
  filterLabel: string;
  onPressFilter: () => void;
  isFilterActive?: boolean;
  onResetFilter?: () => void;
};

export function SearchFilterBar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Cari...',
  filterLabel,
  onPressFilter,
  isFilterActive = false,
  onResetFilter,
}: SearchFilterBarProps) {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.searchPill,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Search size={15} color={colors.textSubtle} strokeWidth={2} />
        <TextInput
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder}
          placeholderTextColor={colors.textSubtle}
          style={[styles.searchInput, { color: colors.textPrimary }]}
          returnKeyType="search"
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Filter: ${filterLabel}`}
        onPress={onPressFilter}
        style={({ pressed }) => [
          styles.filterPill,
          {
            backgroundColor: isFilterActive ? colors.pacificSoft : colors.surface,
            borderColor: isFilterActive ? colors.pacific : colors.border,
          },
          pressed && styles.pressed,
        ]}
      >
        <ListFilter
          size={15}
          color={isFilterActive ? colors.pacificDark : colors.baltic}
          strokeWidth={2.1}
        />
        <Text
          style={[
            styles.filterText,
            { color: isFilterActive ? colors.pacificDark : colors.baltic },
          ]}
          numberOfLines={1}
        >
          {filterLabel}
        </Text>
        <ChevronDown
          size={14}
          color={isFilterActive ? colors.pacificDark : colors.baltic}
          strokeWidth={2.2}
        />
      </Pressable>

      {isFilterActive && onResetFilter ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset filter ke semua"
          onPress={onResetFilter}
          style={({ pressed }) => [
            styles.resetFilterBtn,
            { backgroundColor: colors.rosySoft, borderColor: colors.rosyBorder },
            pressed && styles.pressed,
          ]}
        >
          <X size={15} color={colors.rosy} strokeWidth={2.3} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchPill: {
    flex: 1,
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
  filterPill: {
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  filterText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    lineHeight: 16,
  },
  resetFilterBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.78,
  },
});
