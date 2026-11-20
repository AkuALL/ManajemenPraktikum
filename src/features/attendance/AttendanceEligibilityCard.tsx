import React from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  MapPin,
  Navigation,
  Radio,
  RefreshCw,
  Settings,
} from 'lucide-react-native';

import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { showAlert } from '@/lib/cross-platform-alert';
import type { GeofenceResult, SessionLocationSummary } from '@/types';
import { formatDistanceMeters } from '@/utils/haversine';

import type {
  AttendanceEligibility,
  AttendanceLocationStatus,
  EligibilityTone,
} from './eligibility';

export interface AttendanceEligibilityCardProps {
  eligibility: AttendanceEligibility;
  geofence: GeofenceResult;
  labSummary: SessionLocationSummary;
  building: string;
  isFallbackCoords: boolean;
  locationStatus: AttendanceLocationStatus;
  lastUpdatedAt: number | null;
  isRefreshing: boolean;
  onRefreshLocation: () => void;
}

function formatCoordinatePair(
  latitude: number | undefined,
  longitude: number | undefined,
): string {
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return 'Belum terkunci';
  }
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

function formatLastUpdated(timestampMs: number | null): string {
  if (!timestampMs) return '-';
  return new Date(timestampMs).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function sensorStatusLabel(status: AttendanceLocationStatus): string {
  switch (status) {
    case 'ready':
      return 'GPS Aktif';
    case 'requesting-permission':
      return 'Meminta izin lokasi...';
    case 'acquiring':
      return 'Mencari sinyal GPS...';
    case 'permission-denied':
      return 'Izin Lokasi Ditolak';
    case 'services-disabled':
      return 'GPS Nonaktif';
    case 'timeout':
      return 'GPS Timeout';
    case 'error':
      return 'Sinyal Bermasalah';
    default:
      return 'Menunggu';
  }
}

function tonePalette(
  tone: EligibilityTone,
  colors: (typeof Colors)[keyof typeof Colors],
) {
  switch (tone) {
    case 'success':
      return {
        bg: colors.pacificSoft,
        border: colors.pacificLight,
        text: colors.pacificDark,
        dot: colors.pacific,
      };
    case 'danger':
      return {
        bg: colors.rosySoft,
        border: colors.rosyBorder,
        text: colors.rosyDark,
        dot: colors.rosy,
      };
    case 'warning':
      return {
        bg: colors.balticSoft,
        border: colors.borderStrong,
        text: colors.baltic,
        dot: colors.baltic,
      };
    default:
      return {
        bg: colors.surfaceMuted,
        border: colors.border,
        text: colors.textSecondary,
        dot: colors.textSubtle,
      };
  }
}

export function AttendanceEligibilityCard({
  eligibility,
  geofence,
  labSummary,
  building,
  isFallbackCoords,
  locationStatus,
  lastUpdatedAt,
  isRefreshing,
  onRefreshLocation,
}: AttendanceEligibilityCardProps) {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const badgeStyle = tonePalette(eligibility.tone, colors);
  const hasDistance =
    geofence.userCoords !== null && Number.isFinite(geofence.distanceMeters);

  const progressRatio = hasDistance && geofence.radiusMeters > 0
    ? Math.min(1, Math.max(0.06, geofence.distanceMeters / geofence.radiusMeters))
    : 0;
  const barColor = !hasDistance
    ? colors.borderStrong
    : geofence.isWithinRadius
      ? colors.pacific
      : colors.rosy;

  const accuracyText =
    typeof geofence.userCoords?.accuracy === 'number' &&
    Number.isFinite(geofence.userCoords.accuracy)
      ? `±${Math.round(geofence.userCoords.accuracy)} m`
      : '-';

  const renderStatusIcon = () => {
    switch (eligibility.tone) {
      case 'success':
        return <CheckCircle2 size={14} color={badgeStyle.text} strokeWidth={2.2} />;
      case 'danger':
        return <AlertCircle size={14} color={badgeStyle.text} strokeWidth={2.2} />;
      case 'warning':
        return <Clock size={14} color={badgeStyle.text} strokeWidth={2.2} />;
      default:
        return <Radio size={14} color={badgeStyle.text} strokeWidth={2.2} />;
    }
  };

  const needsSystemSettings =
    locationStatus === 'permission-denied' || locationStatus === 'services-disabled';
  const hasGpsIssue =
    needsSystemSettings || locationStatus === 'timeout' || locationStatus === 'error';

  const handleOpenSettings = () => {
    if (Platform.OS === 'web') {
      showAlert(
        'Aktifkan Izin Lokasi',
        'Buka pengaturan situs pada ikon gembok di bilah alamat browser, ubah Lokasi menjadi Izinkan (Allow), lalu tekan Coba Lagi.',
      );
      return;
    }
    void Linking.openSettings().catch(() => {
      showAlert(
        'Tidak Dapat Membuka Pengaturan',
        'Buka Pengaturan perangkat secara manual dan aktifkan izin lokasi untuk aplikasi ini.',
      );
    });
  };

  return (
    <View style={styles.wrapper}>
      {/* Kartu Perbandingan Jarak vs Radius & Status Kelayakan (FR-04) */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.headerTitleRow}>
            <MapPin size={16} color={colors.baltic} strokeWidth={2.2} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Verifikasi Radius Presensi
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: badgeStyle.bg, borderColor: badgeStyle.border },
            ]}
          >
            <View style={[styles.statusDot, { backgroundColor: badgeStyle.dot }]} />
            <Text style={[styles.statusBadgeText, { color: badgeStyle.text }]}>
              {eligibility.badgeLabel}
            </Text>
          </View>
        </View>

        <View style={styles.distanceMetrics}>
          <View style={styles.distancePrimary}>
            <Text style={[styles.metricLabel, { color: colors.textSubtle }]}>
              Jarak ke Lab
            </Text>
            <Text
              style={[
                styles.distanceValue,
                {
                  color: hasDistance
                    ? geofence.isWithinRadius
                      ? colors.pacificDark
                      : colors.rosy
                    : colors.textPrimary,
                },
              ]}
            >
              {hasDistance ? formatDistanceMeters(geofence.distanceMeters) : '--'}
            </Text>
          </View>

          <View
            style={[
              styles.radiusTargetBox,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.metricLabel, { color: colors.textSubtle }]}>
              Batas Toleransi
            </Text>
            <Text style={[styles.radiusTargetValue, { color: colors.textPrimary }]}>
              Maks. {geofence.radiusMeters} m
            </Text>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View
            style={[
              styles.progressTrack,
              { backgroundColor: colors.surfaceMuted },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: barColor,
                  width: `${Math.round(progressRatio * 100)}%`,
                },
              ]}
            />
          </View>
          <View style={styles.progressLabels}>
            <Text style={[styles.progressCaption, { color: colors.textSubtle }]}>
              0 m (Titik Lab)
            </Text>
            <Text style={[styles.progressCaption, { color: colors.textSubtle }]}>
              Batas {geofence.radiusMeters} m
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.feedbackBox,
            { backgroundColor: badgeStyle.bg, borderColor: badgeStyle.border },
          ]}
        >
          <View style={styles.feedbackTitleRow}>
            {renderStatusIcon()}
            <Text style={[styles.feedbackHeadline, { color: badgeStyle.text }]}>
              {eligibility.headline}
            </Text>
          </View>
          <Text style={[styles.feedbackReason, { color: badgeStyle.text }]}>
            {eligibility.reason}
          </Text>
        </View>
      </View>

      {/* Panel Indikator Sensor GPS & Target Lab (FR-02 & FR-03) */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.gpsHeader}>
          <View style={styles.headerTitleRow}>
            <Navigation size={15} color={colors.pacificDark} strokeWidth={2.2} />
            <Text style={[styles.gpsTitle, { color: colors.textPrimary }]}>
              Status GPS & Titik Lokasi
            </Text>
          </View>

          <View
            style={[
              styles.sensorPill,
              {
                backgroundColor:
                  locationStatus === 'ready'
                    ? colors.pacificSoft
                    : hasGpsIssue
                      ? colors.rosySoft
                      : colors.balticSoft,
              },
            ]}
          >
            <Text
              style={[
                styles.sensorPillText,
                {
                  color:
                    locationStatus === 'ready'
                      ? colors.pacificDark
                      : hasGpsIssue
                        ? colors.rosyDark
                        : colors.baltic,
                },
              ]}
            >
              {sensorStatusLabel(locationStatus)}
            </Text>
          </View>
        </View>

        <View style={[styles.coordsList, { backgroundColor: colors.background }]}>
          <View style={styles.coordRow}>
            <Text style={[styles.coordLabel, { color: colors.textSubtle }]}>
              Posisi Perangkat
            </Text>
            <Text style={[styles.coordMono, { color: colors.textPrimary }]} numberOfLines={1}>
              {formatCoordinatePair(
                geofence.userCoords?.latitude,
                geofence.userCoords?.longitude,
              )}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.coordRow}>
            <Text style={[styles.coordLabel, { color: colors.textSubtle }]}>
              Akurasi & Pembaruan
            </Text>
            <Text style={[styles.coordMono, { color: colors.textSecondary }]}>
              {accuracyText} · {formatLastUpdated(lastUpdatedAt)}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.coordRow}>
            <View style={styles.labLabelBlock}>
              <Text style={[styles.coordLabel, { color: colors.textSubtle }]}>
                Target: {labSummary.locationName}
              </Text>
              <Text style={[styles.labBuilding, { color: colors.textSubtle }]} numberOfLines={1}>
                {building}
              </Text>
            </View>
            <Text style={[styles.coordMono, { color: colors.textPrimary }]} numberOfLines={1}>
              {formatCoordinatePair(labSummary.latitude, labSummary.longitude)}
            </Text>
          </View>
        </View>

        {isFallbackCoords ? (
          <View
            style={[
              styles.fallbackNote,
              { backgroundColor: colors.balticSoft, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.fallbackNoteText, { color: colors.baltic }]}>
              Menggunakan koordinat lab default sementara (menunggu data Master Lab)
            </Text>
          </View>
        ) : null}

        <View style={styles.gpsActionsRow}>
          {needsSystemSettings ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Buka Pengaturan Lokasi"
              onPress={handleOpenSettings}
              style={({ pressed }) => [
                styles.settingsBtn,
                {
                  backgroundColor: colors.rosySoft,
                  borderColor: colors.rosyBorder,
                },
                pressed && styles.pressed,
              ]}
            >
              <Settings size={15} color={colors.rosyDark} strokeWidth={2.2} />
              <Text style={[styles.settingsBtnText, { color: colors.rosyDark }]}>
                Buka Pengaturan
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Perbarui Koordinat GPS"
            disabled={isRefreshing}
            onPress={onRefreshLocation}
            style={({ pressed }) => [
              styles.refreshBtn,
              needsSystemSettings && styles.refreshBtnFlex,
              {
                backgroundColor: colors.balticSoft,
                borderColor: colors.borderStrong,
              },
              pressed && !isRefreshing && styles.pressed,
            ]}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={colors.baltic} />
            ) : (
              <RefreshCw size={15} color={colors.baltic} strokeWidth={2.2} />
            )}
            <Text style={[styles.refreshBtnText, { color: colors.baltic }]}>
              {isRefreshing
                ? 'Memperbarui...'
                : locationStatus === 'timeout' || locationStatus === 'error'
                  ? 'Coba Lagi GPS'
                  : needsSystemSettings
                    ? 'Coba Lagi'
                    : 'Perbarui Koordinat'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 12,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },
  cardTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 15.5,
  },
  statusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
  },
  distanceMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  distancePrimary: {
    flex: 1,
    gap: 2,
  },
  metricLabel: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11.5,
  },
  distanceValue: {
    fontFamily: FontFamily.displayBold,
    fontSize: 28,
    lineHeight: 34,
    fontVariant: ['tabular-nums'],
  },
  radiusTargetBox: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'flex-end',
    gap: 2,
  },
  radiusTargetValue: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13.5,
    fontVariant: ['tabular-nums'],
  },
  progressSection: {
    gap: 6,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressCaption: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 10.5,
    fontVariant: ['tabular-nums'],
  },
  feedbackBox: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  feedbackTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feedbackHeadline: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    flex: 1,
  },
  feedbackReason: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12.5,
    lineHeight: 18,
  },
  gpsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  gpsTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 14.5,
  },
  sensorPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sensorPillText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
  },
  coordsList: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  coordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 9,
  },
  coordLabel: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
  },
  labLabelBlock: {
    flex: 1,
    gap: 1,
  },
  labBuilding: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
  },
  coordMono: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 11.5,
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height: 1,
  },
  fallbackNote: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  fallbackNoteText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11.5,
    lineHeight: 16,
  },
  gpsActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  settingsBtn: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  settingsBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12.5,
  },
  refreshBtn: {
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  refreshBtnFlex: {
    flex: 1,
  },
  refreshBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
  },
  pressed: {
    opacity: 0.78,
  },
});
