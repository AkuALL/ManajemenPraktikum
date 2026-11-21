import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { LocateFixed, MapPin } from 'lucide-react-native';

import { Colors, FontFamily } from '@/constants/theme';
import { FSM_UNDIP_LABS } from '@/features/labs/fsm-undip-labs';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { LabCoordinatePickerProps } from './lab-coordinate-picker';

/**
 * Fallback pemilih titik koordinat untuk web (menggunakan preset titik gedung atau geolokasi browser).
 */
export function LabCoordinatePicker({
  latitude,
  longitude,
  radiusMeters,
  onSelectCoordinate,
}: LabCoordinatePickerProps) {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const presets = [
    {
      label: 'Gedung E FSM UNDIP',
      latitude: FSM_UNDIP_LABS[0].latitude,
      longitude: FSM_UNDIP_LABS[0].longitude,
    },
    {
      label: 'Dekanat FSM UNDIP',
      latitude: FSM_UNDIP_LABS[3].latitude,
      longitude: FSM_UNDIP_LABS[3].longitude,
    },
  ];

  const handleUseDeviceLocation = async () => {
    if (locating) return;
    setLocating(true);
    setGpsError(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setGpsError('Izin lokasi browser ditolak.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      onSelectCoordinate({
        latitude: Number(pos.coords.latitude.toFixed(7)),
        longitude: Number(pos.coords.longitude.toFixed(7)),
      });
    } catch {
      setGpsError('Koordinat perangkat tidak dapat diambil pada browser ini.');
    } finally {
      setLocating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.fallbackCard,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <View style={styles.coordHeader}>
          <MapPin size={16} color={colors.rosy} strokeWidth={2.2} />
          <Text style={[styles.coordLabel, { color: colors.textPrimary }]}>
            Koordinat Terpilih (Radius {radiusMeters} m)
          </Text>
        </View>
        <Text style={[styles.coordValue, { color: colors.baltic }]}>
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </Text>
        <Text style={[styles.hintText, { color: colors.textSecondary }]}>
          Peta interaktif MapLibre tersedia pada build Android/iOS. Gunakan preset gedung FSM atau
          lokasi perangkat di bawah ini:
        </Text>

        <View style={styles.presetList}>
          {presets.map((preset) => (
            <Pressable
              key={preset.label}
              accessibilityRole="button"
              onPress={() =>
                onSelectCoordinate({
                  latitude: preset.latitude,
                  longitude: preset.longitude,
                })
              }
              style={({ pressed }) => [
                styles.presetChip,
                { backgroundColor: colors.balticSoft, borderColor: colors.border },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.presetText, { color: colors.baltic }]}>
                {preset.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={locating}
          onPress={() => void handleUseDeviceLocation()}
          style={({ pressed }) => [
            styles.gpsBtn,
            { backgroundColor: colors.pacificSoft },
            pressed && styles.pressed,
          ]}
        >
          {locating ? (
            <ActivityIndicator size="small" color={colors.pacificDark} />
          ) : (
            <LocateFixed size={15} color={colors.pacificDark} strokeWidth={2.2} />
          )}
          <Text style={[styles.gpsBtnText, { color: colors.pacificDark }]}>
            Gunakan Lokasi Perangkat
          </Text>
        </Pressable>

        {gpsError ? (
          <Text style={[styles.errorText, { color: colors.rosyDark }]}>{gpsError}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  fallbackCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  coordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coordLabel: {
    fontFamily: FontFamily.displayBold,
    fontSize: 13.5,
  },
  coordValue: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  hintText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    lineHeight: 17,
  },
  presetList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  presetText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
  },
  gpsBtn: {
    height: 42,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  gpsBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12.5,
  },
  errorText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
  },
  pressed: {
    opacity: 0.78,
  },
});
