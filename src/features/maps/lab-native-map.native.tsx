import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Crosshair, MapPin, RefreshCw, Settings } from 'lucide-react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FSM_UNDIP_MAP_CAMERA } from '@/features/labs/fsm-undip-labs';
import { useMapLocation } from './use-map-location';

export type MappedLab = {
  id: string;
  name: string;
  building: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActiveNow: boolean;
};

type LabNativeMapProps = {
  labs: MappedLab[];
  selectedLabId: string | null;
  onSelectLab: (labId: string) => void;
};

/** Peta react-native-maps untuk Android/iOS; dapat diuji langsung dengan Expo Go. */
export function LabNativeMap({ labs, selectedLabId, onSelectLab }: LabNativeMapProps) {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const location = useMapLocation();

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={styles.mapViewport}>
        <MapView
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: FSM_UNDIP_MAP_CAMERA.coordinates.latitude,
            longitude: FSM_UNDIP_MAP_CAMERA.coordinates.longitude,
            latitudeDelta: 0.006,
            longitudeDelta: 0.006,
          }}
          showsUserLocation={Boolean(location.coordinates)}
          showsMyLocationButton={Boolean(location.coordinates)}
          showsCompass
          zoomEnabled
          scrollEnabled
        >
          {labs.map((lab) => {
            const selected = lab.id === selectedLabId;
            const markerColor = lab.isActiveNow ? colors.rosy : colors.baltic;

            return (
              <Marker
                key={lab.id}
                coordinate={{ latitude: lab.latitude, longitude: lab.longitude }}
                title={lab.name}
                description={`${lab.building} · ${lab.isActiveNow ? 'Sedang digunakan' : 'Tersedia'}`}
                pinColor={markerColor}
                onPress={() => onSelectLab(lab.id)}
              >
                <View
                  style={[
                    styles.labMarker,
                    {
                      backgroundColor: selected ? colors.pacific : markerColor,
                      borderColor: '#FCFCFA',
                    },
                  ]}
                >
                  <MapPin size={18} color="#FCFCFA" strokeWidth={2.8} />
                </View>
              </Marker>
            );
          })}

          {labs.map((lab) => (
            <Circle
              key={`radius-${lab.id}`}
              center={{ latitude: lab.latitude, longitude: lab.longitude }}
              radius={lab.radiusMeters}
              strokeColor={lab.id === selectedLabId ? colors.baltic : colors.pacific}
              fillColor={lab.id === selectedLabId ? 'rgba(18, 89, 127, 0.18)' : 'rgba(78, 144, 177, 0.08)'}
              strokeWidth={lab.id === selectedLabId ? 2 : 1}
            />
          ))}
        </MapView>
      </View>

      <View style={[styles.legend, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <View style={styles.legendCopy}>
          <View style={styles.legendTitleRow}>
            <MapPin size={15} color={colors.baltic} strokeWidth={2.4} />
            <Text style={[styles.legendTitle, { color: colors.textPrimary }]}>Peta lokasi lab</Text>
          </View>
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>{location.message}</Text>
        </View>

        {location.status === 'ready' ? (
          <View style={[styles.liveBadge, { backgroundColor: colors.pacificSoft }]}>
            <Crosshair size={13} color={colors.pacificDark} strokeWidth={2.4} />
            <Text style={[styles.liveText, { color: colors.pacificDark }]}>Live</Text>
          </View>
        ) : location.status === 'checking' ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={location.status === 'denied' ? 'Buka pengaturan izin lokasi' : 'Coba lagi mengambil lokasi'}
            onPress={location.status === 'denied' ? location.openSettings : location.retry}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: colors.balticSoft },
              pressed && styles.pressed,
            ]}
          >
            {location.status === 'denied' ? (
              <Settings size={14} color={colors.baltic} strokeWidth={2.2} />
            ) : (
              <RefreshCw size={14} color={colors.baltic} strokeWidth={2.2} />
            )}
            <Text style={[styles.actionText, { color: colors.baltic }]}>
              {location.status === 'denied' ? 'Pengaturan' : 'Coba lagi'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, borderWidth: 1, overflow: 'hidden' },
  mapViewport: { height: 310, backgroundColor: '#DCEBF1' },
  labMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: { borderTopWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  legendCopy: { flex: 1, gap: 3 },
  legendTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendTitle: { fontFamily: FontFamily.sansBold, fontSize: 12.5 },
  legendText: { fontFamily: FontFamily.sansRegular, fontSize: 11.5, lineHeight: 16 },
  liveBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveText: { fontFamily: FontFamily.sansBold, fontSize: 11.5 },
  actionButton: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionText: { fontFamily: FontFamily.sansBold, fontSize: 11.5 },
  pressed: { opacity: 0.76 },
});
