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
    identifier: 'AS-202401',
  },
  {
    email: 'asisten2@praktikum.ac.id',
    password: SEED_PASSWORD,
    displayName: 'Anintya Abhi',
    role: 'assistant',
    identifier: 'AS-202402',
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

const SEED_PRACTICUM_COURSES = [
  { courseName: 'Sistem Operasi', className: 'Kelas A', lab: 'Lab Sistem & Jaringan' },
  { courseName: 'Pengembangan Platform Khusus', className: 'Kelas A', lab: 'Lab Mobile & IoT' },
  { courseName: 'Pembelajaran Mesin', className: 'Kelas A', lab: 'Lab Kecerdasan Buatan' },
  { courseName: 'Struktur Data', className: 'Kelas A', lab: 'Lab Pemrograman 1' },
  { courseName: 'Basis Data', className: 'Kelas A', lab: 'Lab Basis Data' },
  { courseName: 'Algoritma Pemrograman', className: 'Kelas A', lab: 'Lab Pemrograman 2' },
  { courseName: 'Dasar Sistem', className: 'Kelas A', lab: 'Lab Arsitektur Komputer' },
  { courseName: 'Dasar Pemrograman', className: 'Kelas A', lab: 'Lab Dasar Komputasi' },
];

function isPermissionDenied(error) {
  return typeof error === 'object' && error !== null && error.code === 'permission-denied';
}

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

    const existingClassesSnap = await getDocs(
      query(collection(db, 'classes'), where('assistantIds', 'array-contains', primaryAssistant.uid)),
    );
    const existingByName = new Map(
      existingClassesSnap.docs.map((d) => [d.data().practicumName, { id: d.id, ...d.data() }]),
    );

    let rulesWarningLogged = false;
    const seededClasses = [];

    console.log('2. Membuat / memverifikasi 8 mata kuliah praktikum...');
    for (let index = 0; index < SEED_PRACTICUM_COURSES.length; index += 1) {
      const course = SEED_PRACTICUM_COURSES[index];
      const existing = existingByName.get(course.courseName);
      let classId = existing?.id;
      let classState = 'existing';

      if (!classId) {
        const baseClassPayload = {
          practicumName: course.courseName,
          className: course.className,
          lab: course.lab,
          assistantIds,
          createdBy: primaryAssistant.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        try {
          const docRef = await addDoc(collection(db, 'classes'), {
            ...baseClassPayload,
            memberUids: students.map((s) => s.identifier),
          });
          classId = docRef.id;
          classState = 'created';
        } catch (error) {
          if (!isPermissionDenied(error)) throw error;
          if (!rulesWarningLogged) {
            console.warn(
              '   [Catatan] firestore.rules di server belum mengizinkan memberUids/NIM-as-memberId; fallback ke format rules lama.',
            );
            rulesWarningLogged = true;
          }
          const docRef = await addDoc(collection(db, 'classes'), baseClassPayload);
          classId = docRef.id;
          classState = 'created (legacy-rules)';
        }
      }

      // Tambahkan kedua praktikan sebagai anggota kelas
      for (const student of students) {
        const nimDocRef = doc(db, 'classes', classId, 'members', student.identifier);
        const uidDocRef = doc(db, 'classes', classId, 'members', student.uid);
        const nimExists = (await getDoc(nimDocRef)).exists();

        if (!nimExists) {
          try {
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
            await batch.commit();
          } catch (error) {
            if (!isPermissionDenied(error)) throw error;
            if (!rulesWarningLogged) {
              console.warn(
                '   [Catatan] firestore.rules di server belum di-deploy dengan NIM memberId; fallback ke member UID auth.',
              );
              rulesWarningLogged = true;
            }
            const uidExists = (await getDoc(uidDocRef)).exists();
            if (!uidExists) {
              await setDoc(uidDocRef, {
                userId: student.uid,
                role: 'student',
                displayName: student.displayName,
                identifier: student.identifier,
                joinedAt: serverTimestamp(),
              });
            }
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

        await addDoc(collection(db, 'sessions'), {
          classId,
          title: `Pertemuan 1 - Pengenalan ${course.courseName}`,
          location: course.lab,
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
