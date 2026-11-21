import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  query,
  serverTimestamp,
  setDoc,
  terminate,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

function readEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Env ${name} belum diisi. Jalankan dengan node --env-file=.env scripts/seed-firestore.mjs`);
  }
  return value;
}

const SEED_PASSWORD = 'Password123!';

const SEED_ACCOUNTS = [
  {
    email: 'asisten1@praktikum.ac.id',
    password: SEED_PASSWORD,
    displayName: 'Galang Bintang',
    role: 'assistant',
    identifier: '2402030101',
  },
  {
    email: 'asisten2@praktikum.ac.id',
    password: SEED_PASSWORD,
    displayName: 'Anintya Abhi',
    role: 'assistant',
    identifier: '2402030102',
  },
  {
    email: 'praktikan1@praktikum.ac.id',
    password: SEED_PASSWORD,
    displayName: 'Al Rivaldi',
    role: 'student',
    identifier: '2402030201',
  },
  {
    email: 'praktikan2@praktikum.ac.id',
    password: SEED_PASSWORD,
    displayName: 'Wawan Sumanto',
    role: 'student',
    identifier: '2402030202',
  },
];

const SEED_LABS = [
  {
    id: 'lab-informatika-b',
    name: 'Lab Informatika B',
    building: 'Gedung E FSM UNDIP',
    floor: 2,
    capacity: 32,
    latitude: -7.0482375,
    longitude: 110.440765625,
    radiusMeters: 10,
    isActive: true,
    plusCode: '6P4GXC2R+P82',
    pointType: 'building_map_reference',
    roomCenterVerified: false,
  },
  {
    id: 'lab-informatika-c',
    name: 'Lab Informatika C',
    building: 'Gedung E FSM UNDIP',
    floor: 2,
    capacity: 32,
    latitude: -7.0482375,
    longitude: 110.440765625,
    radiusMeters: 10,
    isActive: true,
    plusCode: '6P4GXC2R+P82',
    pointType: 'building_map_reference',
    roomCenterVerified: false,
  },
  {
    id: 'lab-informatika-d',
    name: 'Lab Informatika D',
    building: 'Gedung E FSM UNDIP',
    floor: 2,
    capacity: 32,
    latitude: -7.0482375,
    longitude: 110.440765625,
    radiusMeters: 10,
    isActive: true,
    plusCode: '6P4GXC2R+P82',
    pointType: 'building_map_reference',
    roomCenterVerified: false,
  },
  {
    id: 'dekanat-fsm',
    name: 'Dekanat FSM UNDIP',
    building: 'Gedung Dekanat FSM UNDIP',
    floor: null,
    capacity: 32,
    latitude: -7.0490375,
    longitude: 110.441484375,
    radiusMeters: 10,
    isActive: true,
    plusCode: '6P4GXC2R+9HQ',
    pointType: 'building_map_reference',
    roomCenterVerified: false,
  },
];

const SEED_PRACTICUM_COURSES = [
  { courseName: 'Sistem Operasi', className: 'A1', labId: 'lab-informatika-b', lab: 'Lab Informatika B' },
  { courseName: 'Pengembangan Platform Khusus', className: 'A2', labId: 'lab-informatika-c', lab: 'Lab Informatika C' },
  { courseName: 'Pembelajaran Mesin', className: 'B1', labId: 'lab-informatika-d', lab: 'Lab Informatika D' },
  { courseName: 'Struktur Data', className: 'B2', labId: 'lab-informatika-b', lab: 'Lab Informatika B' },
  { courseName: 'Basis Data', className: 'A1', labId: 'lab-informatika-c', lab: 'Lab Informatika C' },
  { courseName: 'Algoritma Pemrograman', className: 'A2', labId: 'lab-informatika-d', lab: 'Lab Informatika D' },
  { courseName: 'Dasar Sistem', className: 'B1', labId: 'lab-informatika-b', lab: 'Lab Informatika B' },
  { courseName: 'Dasar Pemrograman', className: 'B2', labId: 'lab-informatika-c', lab: 'Lab Informatika C' },
];

async function ensureAccount(auth, db, account) {
  let credential;
  let status = 'created';

  try {
    credential = await createUserWithEmailAndPassword(auth, account.email, account.password);
  } catch (error) {
    if (error?.code !== 'auth/email-already-in-use') {
      throw error;
    }
    credential = await signInWithEmailAndPassword(auth, account.email, account.password);
    status = 'existing';
  }

  const uid = credential.user.uid;
  const tokenEmail = credential.user.email ?? account.email;
  const userRef = doc(db, 'users', uid);
  const existingProfile = await getDoc(userRef);

  if (!existingProfile.exists()) {
    await setDoc(userRef, {
      uid,
      displayName: account.displayName,
      email: tokenEmail,
      role: account.role,
      identifier: account.identifier,
      createdAt: serverTimestamp(),
    });
  } else {
    const data = existingProfile.data();
    if (data.displayName !== account.displayName || data.identifier !== account.identifier) {
      await updateDoc(userRef, {
        displayName: account.displayName,
        identifier: account.identifier,
        updatedAt: serverTimestamp(),
      });
    }
  }

  await signOut(auth);
  return { ...account, uid, status };
}

async function main() {
  const firebaseConfig = {
    apiKey: readEnv('EXPO_PUBLIC_FIREBASE_API_KEY'),
    authDomain: readEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
    projectId: readEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
    storageBucket: readEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: readEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
    appId: readEnv('EXPO_PUBLIC_FIREBASE_APP_ID'),
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    console.log('1. Membuat / memverifikasi 4 akun (2 Asisten, 2 Praktikan)...');
    const seededAccounts = [];
    for (const account of SEED_ACCOUNTS) {
      const seeded = await ensureAccount(auth, db, account);
      seededAccounts.push(seeded);
    }

    const assistants = seededAccounts.filter((acc) => acc.role === 'assistant');
    const students = seededAccounts.filter((acc) => acc.role === 'student');
    const primaryAssistant = assistants[0];
    const assistantIds = assistants.map((a) => a.uid);

    await signInWithEmailAndPassword(auth, primaryAssistant.email, primaryAssistant.password);

    console.log('2. Membuat / memverifikasi master data laboratorium (koleksi labs)...');
    const labById = new Map(SEED_LABS.map((lab) => [lab.id, lab]));
    for (const lab of SEED_LABS) {
      await setDoc(
        doc(db, 'labs', lab.id),
        {
          ...lab,
          createdBy: primaryAssistant.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }

    const existingClassesSnap = await getDocs(
      query(collection(db, 'classes'), where('assistantIds', 'array-contains', primaryAssistant.uid)),
    );
    const existingByName = new Map(
      existingClassesSnap.docs.map((d) => [d.data().practicumName, { id: d.id, ...d.data() }]),
    );

    const seededClasses = [];

    console.log('3. Membuat / memverifikasi 8 mata kuliah praktikum...');
    for (let index = 0; index < SEED_PRACTICUM_COURSES.length; index += 1) {
      const course = SEED_PRACTICUM_COURSES[index];
      const existing = existingByName.get(course.courseName);
      let classId = existing?.id;
      let classState = 'existing';

      if (!classId) {
        const docRef = await addDoc(collection(db, 'classes'), {
          practicumName: course.courseName,
          className: course.className,
          lab: course.lab,
          assistantIds,
          memberUids: students.map((s) => s.identifier),
          createdBy: primaryAssistant.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        classId = docRef.id;
        classState = 'created';
      }

      // Sinkronkan kedua praktikan sebagai anggota kelas berbasis NIM & bersihkan member UID lama bila ada
      for (const student of students) {
        const nimDocRef = doc(db, 'classes', classId, 'members', student.identifier);
        const uidDocRef = doc(db, 'classes', classId, 'members', student.uid);
        const [nimSnap, uidSnap] = await Promise.all([getDoc(nimDocRef), getDoc(uidDocRef)]);

        if (!nimSnap.exists()) {
          const batch = writeBatch(db);
          batch.set(nimDocRef, {
            userId: student.identifier,
            role: 'student',
            displayName: student.displayName,
            identifier: student.identifier,
            joinedAt: serverTimestamp(),
          });
          batch.update(doc(db, 'classes', classId), {
            memberUids: arrayUnion(student.identifier),
            updatedAt: serverTimestamp(),
          });
          if (uidSnap.exists() && student.uid !== student.identifier) {
            batch.delete(uidDocRef);
          }
          await batch.commit();
        } else {
          if (nimSnap.data().displayName !== student.displayName) {
            await updateDoc(nimDocRef, { displayName: student.displayName });
          }
          if (!existing?.memberUids?.includes(student.identifier)) {
            await updateDoc(doc(db, 'classes', classId), {
              memberUids: arrayUnion(student.identifier),
              updatedAt: serverTimestamp(),
            });
          }
          if (uidSnap.exists() && student.uid !== student.identifier) {
            await deleteDoc(uidDocRef);
          }
        }
      }

      // Buat 1 sesi awal jika kelas belum punya sesi
      const existingSessions = await getDocs(
        query(collection(db, 'sessions'), where('classId', '==', classId), limit(1)),
      );
      let sessionCreated = false;
      if (existingSessions.empty) {
        const start = new Date();
        start.setDate(start.getDate() + index + 1);
        start.setHours(8, 0, 0, 0);
        const end = new Date(start);
        end.setHours(10, 0, 0, 0);
        const labData = labById.get(course.labId) ?? SEED_LABS[0];

        await addDoc(collection(db, 'sessions'), {
          classId,
          title: `Pertemuan 1 - Pengenalan ${course.courseName}`,
          location: labData.name,
          labId: labData.id,
          locationName: labData.name,
          latitude: labData.latitude,
          longitude: labData.longitude,
          radiusMeters: labData.radiusMeters,
          startsAt: Timestamp.fromDate(start),
          endsAt: Timestamp.fromDate(end),
          status: 'scheduled',
          createdBy: primaryAssistant.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        sessionCreated = true;
      }

      seededClasses.push({
        classId,
        courseName: course.courseName,
        className: course.className,
        lab: course.lab,
        state: classState,
        session: sessionCreated ? 'created' : 'existing',
      });
    }

    await signOut(auth);

    console.log('\n=== RINGKASAN AKUN SEEDED ===');
    console.table(
      seededAccounts.map(({ role, displayName, identifier, email, password, uid, status }) => ({
        role,
        displayName,
        identifier,
        email,
        password,
        uid,
        status,
      })),
    );

    console.log('\n=== RINGKASAN 8 MATA KULIAH PRAKTIKUM ===');
    console.table(seededClasses);
  } finally {
    await terminate(db).catch(() => undefined);
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seeder gagal:', error);
    process.exit(1);
  });
