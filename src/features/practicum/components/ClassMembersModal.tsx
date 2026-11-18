import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { PracticumClass, ClassMember, AddMemberInput } from '../types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ClassMembersModalProps {
  visible: boolean;
  practicumClass: PracticumClass | null;
  onClose: () => void;
  fetchMembers: (classId: string) => Promise<ClassMember[]>;
  onAddMember: (classId: string, input: AddMemberInput) => Promise<ClassMember>;
  onRemoveMember: (classId: string, memberId: string) => Promise<void>;
}

function ClassMembersContent({
  practicumClass,
  onClose,
  fetchMembers,
  onAddMember,
  onRemoveMember,
}: {
  practicumClass: PracticumClass;
  onClose: () => void;
  fetchMembers: (classId: string) => Promise<ClassMember[]>;
  onAddMember: (classId: string, input: AddMemberInput) => Promise<ClassMember>;
  onRemoveMember: (classId: string, memberId: string) => Promise<void>;
}) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const [members, setMembers] = useState<ClassMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [addingMember, setAddingMember] = useState<boolean>(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  // Form states
  const [studentName, setStudentName] = useState('');
  const [studentNIM, setStudentNIM] = useState('');
  const [studentUid, setStudentUid] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let isCancelled = false;

    fetchMembers(practicumClass.id)
      .then((data) => {
        if (!isCancelled) {
          setMembers(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setLoadError(err instanceof Error ? err.message : 'Gagal memuat daftar anggota');
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [fetchMembers, practicumClass.id, reloadKey]);

  const handleAddSubmit = async () => {
    if (addingMember) return;
    if (studentName.trim().length < 2) {
      setFormError('Nama praktikan minimal 2 karakter');
      return;
    }
    if (studentNIM.trim().length < 3) {
      setFormError('NIM praktikan minimal 3 karakter');
      return;
    }
    if (studentUid.trim().length < 3) {
      setFormError('UID Praktikan wajib diisi dan minimal 3 karakter');
      return;
    }

    const uid = studentUid.trim();

    try {
      setAddingMember(true);
      setFormError('');
      const newMember = await onAddMember(practicumClass.id, {
        userId: uid,
        displayName: studentName.trim(),
        identifier: studentNIM.trim(),
      });
      setMembers((prev) => [...prev, newMember]);
      setStudentName('');
      setStudentNIM('');
      setStudentUid('');
      setShowAddForm(false);
    } catch (err: any) {
      setFormError(err.message ?? 'Gagal menambah anggota');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemove = (member: ClassMember) => {
    if (removingMemberId) return;

    Alert.alert(
      'Hapus Anggota',
      `Keluarkan ${member.displayName} (${member.identifier}) dari kelas ini?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            if (removingMemberId) return;
            try {
              setRemovingMemberId(member.userId);
              await onRemoveMember(practicumClass.id, member.userId);
              setMembers((prev) => prev.filter((m) => m.userId !== member.userId));
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Gagal menghapus anggota');
            } finally {
              setRemovingMemberId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.overlay}>
      <View
        style={[
          styles.container,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Daftar Anggota Kelas
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {practicumClass.className} - {practicumClass.courseName}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={{ color: colors.textSecondary, fontSize: 18, fontWeight: '700' }}>
              ✕
            </Text>
          </TouchableOpacity>
        </View>

        {showAddForm ? (
          <View style={[styles.addFormCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Text style={[styles.formTitle, { color: colors.textPrimary }]}>
              Tambah Praktikan Baru
            </Text>
            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="Nama Lengkap Praktikan *"
              placeholderTextColor={colors.textSecondary}
              value={studentName}
              onChangeText={(value) => {
                setStudentName(value);
                setFormError('');
              }}
              editable={!addingMember}
              maxLength={120}
            />
            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="NIM / Identifier *"
              placeholderTextColor={colors.textSecondary}
              value={studentNIM}
              onChangeText={(value) => {
                setStudentNIM(value);
                setFormError('');
              }}
              editable={!addingMember}
              maxLength={40}
            />
            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="UID akun Praktikan *"
              placeholderTextColor={colors.textSecondary}
              value={studentUid}
              onChangeText={(value) => {
                setStudentUid(value);
                setFormError('');
              }}
              editable={!addingMember}
              maxLength={128}
            />

            <View style={styles.formButtonRow}>
              <TouchableOpacity
                style={[styles.smallBtn, { borderColor: colors.border }]}
                onPress={() => setShowAddForm(false)}
                disabled={addingMember}
              >
                <Text style={{ color: colors.textSecondary }}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallBtn, { backgroundColor: colors.actionPrimary }]}
                onPress={handleAddSubmit}
                disabled={addingMember}
              >
                {addingMember ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Simpan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.addNewButton, { borderColor: colors.actionPrimary }]}
            onPress={() => setShowAddForm(true)}
            disabled={loading || Boolean(removingMemberId)}
          >
            <Text style={[styles.addNewText, { color: colors.actionPrimary }]}>
              + Tambah Praktikan
            </Text>
          </TouchableOpacity>
        )}

        {loading ? (
          <ActivityIndicator style={{ marginVertical: 30 }} size="large" color={colors.actionPrimary} />
        ) : loadError ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{loadError}</Text>
            <TouchableOpacity
              style={[styles.retryBtn, { borderColor: colors.actionPrimary }]}
              onPress={() => {
                setLoading(true);
                setLoadError('');
                setReloadKey((value) => value + 1);
              }}
            >
              <Text style={{ color: colors.actionPrimary, fontWeight: '700' }}>Coba lagi</Text>
            </TouchableOpacity>
          </View>
        ) : members.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Belum ada praktikan terdaftar di kelas ini.
            </Text>
          </View>
        ) : (
          <FlatList
            data={members}
            keyExtractor={(item) => item.userId}
            style={{ maxHeight: 340 }}
            renderItem={({ item }) => (
              <View style={[styles.memberRow, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.memberName, { color: colors.textPrimary }]}>
                    {item.displayName}
                  </Text>
                  <Text style={[styles.memberNIM, { color: colors.textSecondary }]}>
                    {item.identifier}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemove(item)}
                  disabled={Boolean(removingMemberId)}
                >
                  <Text style={styles.removeText}>
                    {removingMemberId === item.userId ? 'Menghapus...' : 'Hapus'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

export function ClassMembersModal({
  visible,
  practicumClass,
  onClose,
  fetchMembers,
  onAddMember,
  onRemoveMember,
}: ClassMembersModalProps) {
  if (!visible || !practicumClass) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <ClassMembersContent
        key={practicumClass.id}
        practicumClass={practicumClass}
        onClose={onClose}
        fetchMembers={fetchMembers}
        onAddMember={onAddMember}
        onRemoveMember={onRemoveMember}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  addNewButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 14,
  },
  addNewText: {
    fontWeight: '700',
    fontSize: 14,
  },
  addFormCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    gap: 8,
  },
  formTitle: {
    fontWeight: '700',
    fontSize: 14,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  formButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  smallBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  retryBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
  },
  memberNIM: {
    fontSize: 12,
    marginTop: 2,
  },
  removeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  removeText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
});
