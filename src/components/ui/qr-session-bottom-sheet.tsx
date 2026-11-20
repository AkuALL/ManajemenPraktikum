import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { FlyAwayBottomSheet } from './fly-away-bottom-sheet';

export function generateSessionQrCode(seed: string): string {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const c1 = letters[Math.abs(hash) % letters.length];
  const c2 = letters[Math.abs(hash >> 5) % letters.length];
  const c3 = letters[Math.abs(hash >> 10) % letters.length];
  const digits = String(Math.abs(hash >> 3) % 900 + 100);
  return `${c1}${c2}${c3}-${digits}`;
}

function buildQrModules(seed: string): { size: number; cells: { x: number; y: number; tone: 'dark' | 'pacific' }[] } {
  const size = 11;
  let state = 0x9e3779b9;
  for (let i = 0; i < seed.length; i += 1) {
    state = Math.imul(state ^ seed.charCodeAt(i), 16777619);
  }

  const inFinder = (x: number, y: number) =>
    (x < 4 && y < 4) || (x >= size - 4 && y < 4) || (x < 4 && y >= size - 4);

  const cells: { x: number; y: number; tone: 'dark' | 'pacific' }[] = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (inFinder(x, y)) continue;
      state = Math.imul(state ^ (x * 31 + y * 17 + 7), 2246822519);
      const val = Math.abs(state) % 10;
      if (val < 5) {
        cells.push({ x, y, tone: val === 0 ? 'pacific' : 'dark' });
      }
    }
  }
  return { size, cells };
}

type QrSessionBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  sessionId: string;
  sessionTitle: string;
  subtitle: string;
  sessionStatus?: 'scheduled' | 'open' | 'closed';
  onOpenSession?: () => Promise<void>;
};

export function QrSessionBottomSheet({
  visible,
  onClose,
  sessionId,
  sessionTitle,
  subtitle,
  sessionStatus = 'open',
  onOpenSession,
}: QrSessionBottomSheetProps) {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const [secondsLeft, setSecondsLeft] = useState(45);
  const [rotationTick, setRotationTick] = useState(0);
  const [openingSession, setOpeningSession] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRotationTick((t) => t + 1);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [visible]);

  const code = useMemo(() => generateSessionQrCode(sessionId), [sessionId]);
  const qr = useMemo(() => buildQrModules(`${sessionId}:${rotationTick}`), [rotationTick, sessionId]);

  const boxSize = 148;
  const padding = 10;
  const cellPx = (boxSize - padding * 2) / qr.size;

  const renderFinder = (ox: number, oy: number) => (
    <>
      <Rect
        x={padding + ox * cellPx}
        y={padding + oy * cellPx}
        width={cellPx * 3.2}
        height={cellPx * 3.2}
        rx={4}
        fill="#0D2336"
      />
      <Rect
        x={padding + (ox + 0.55) * cellPx}
        y={padding + (oy + 0.55) * cellPx}
        width={cellPx * 2.1}
        height={cellPx * 2.1}
        rx={2.5}
        fill="#FCFCFA"
      />
      <Rect
        x={padding + (ox + 1.1) * cellPx}
        y={padding + (oy + 1.1) * cellPx}
        width={cellPx}
        height={cellPx}
        rx={1.5}
        fill="#1FA7C1"
      />
    </>
  );

  return (
    <FlyAwayBottomSheet
      visible={visible}
      onClose={onClose}
      title="QR Presensi Sesi"
      subtitle={`${sessionTitle} · ${subtitle}`}
    >
      <View style={styles.content}>
        <View
          style={[
            styles.qrPanel,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.qrFrame,
              { backgroundColor: '#FCFCFA', borderColor: colors.border },
            ]}
          >
            <Svg width={boxSize} height={boxSize} viewBox={`0 0 ${boxSize} ${boxSize}`}>
              {renderFinder(0, 0)}
              {renderFinder(qr.size - 3.2, 0)}
              {renderFinder(0, qr.size - 3.2)}
              {qr.cells.map((cell) => (
                <Rect
                  key={`${cell.x}-${cell.y}`}
                  x={padding + cell.x * cellPx}
                  y={padding + cell.y * cellPx}
                  width={cellPx * 0.82}
                  height={cellPx * 0.82}
                  rx={2}
                  fill={cell.tone === 'pacific' ? '#1FA7C1' : '#0D2336'}
                />
              ))}
            </Svg>
          </View>

          <Text style={[styles.codeText, { color: colors.textPrimary }]}>
            Kode Sesi: {code}
          </Text>

          <View style={[styles.timerPill, { backgroundColor: colors.pacificSoft }]}>
            <View style={[styles.timerDot, { backgroundColor: colors.pacific }]} />
            <Text style={[styles.timerText, { color: colors.pacificDark }]}>
              Rotasi otomatis dalam {secondsLeft} dtk
            </Text>
          </View>
        </View>

        {sessionStatus === 'scheduled' && onOpenSession ? (
          <Pressable
            accessibilityRole="button"
            disabled={openingSession}
            onPress={() => {
              void (async () => {
                setOpeningSession(true);
                try {
                  await onOpenSession();
                } finally {
                  setOpeningSession(false);
                }
              })();
            }}
            style={({ pressed }) => [
              styles.openBtn,
              { backgroundColor: colors.rosy },
              pressed && styles.pressed,
            ]}
          >
            {openingSession ? (
              <ActivityIndicator size="small" color="#FCFCFA" />
            ) : (
              <Text style={styles.openBtnText}>Buka Sesi & Aktifkan Presensi</Text>
            )}
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [
            styles.closeActionBtn,
            { backgroundColor: colors.surfaceMuted },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.closeActionText, { color: colors.textPrimary }]}>Tutup QR</Text>
        </Pressable>
      </View>
    </FlyAwayBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
    paddingBottom: 6,
  },
  qrPanel: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 12,
  },
  qrFrame: {
    padding: 8,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  codeText: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 13.5,
    fontVariant: ['tabular-nums'],
  },
  timerPill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  timerText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11.5,
    fontVariant: ['tabular-nums'],
  },
  openBtn: {
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13.5,
    color: '#FCFCFA',
  },
  closeActionBtn: {
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeActionText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13.5,
  },
  pressed: {
    opacity: 0.8,
  },
});
