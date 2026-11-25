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

/**
 * Format NIM tetap 14 karakter (Char(14)):
 * [6 digit tetap: 240601][2 digit angkatan][3 digit jalur masuk][3 digit nomor absen dalam angkatan]
 * Contoh praktikan angkatan 24: 24060124130101
 * Contoh asprak angkatan 23   : 24060123130101
 */
function formatNim(angkatan, jalurMasuk, nomorAbsen) {
  const angkatanPart = String(angkatan).padStart(2, '0');
  const jalurPart = String(jalurMasuk).padStart(3, '0');
  const absenPart = String(nomorAbsen).padStart(3, '0');
  const nim = `240601${angkatanPart}${jalurPart}${absenPart}`;

  if (nim.length !== 14) {
    throw new Error(`NIM ${nim} harus tepat 14 karakter.`);
  }
  return nim;
}

const JALUR_RANGES = {
  '120': { min: 1, max: 55 },
  '130': { min: 56, max: 122 },
  '140': { min: 123, max: 202 },
};

const SEED_ASPRAK = [
  {
    key: 'al',
    email: 'asprak.al@praktikum.ac.id',
    password: SEED_PASSWORD,
    displayName: 'Al Rivaldi',
    role: 'assistant',
    angkatan: 22,
    jalurMasuk: '120',
    nomorAbsen: 1,
    identifier: formatNim(22, '120', 1), // 24060122120001
  },
  {
    key: 'qila',
    email: 'asprak.qila@praktikum.ac.id',
    password: SEED_PASSWORD,
    displayName: 'Qila Azzahra',
    role: 'assistant',
    angkatan: 22,
    jalurMasuk: '130',
    nomorAbsen: 56,
    identifier: formatNim(22, '130', 56), // 24060122130056
  },
  {
    key: 'galang',
    email: 'asprak.galang@praktikum.ac.id',
    password: SEED_PASSWORD,
    displayName: 'Galang Bintang',
    role: 'assistant',
    angkatan: 22,
    jalurMasuk: '140',
    nomorAbsen: 123,
    identifier: formatNim(22, '140', 123), // 24060122140123
  },
  {
    key: 'abhi',
    email: 'asprak.abhi@praktikum.ac.id',
    password: SEED_PASSWORD,
    displayName: 'Anintya Abhi',
    role: 'assistant',
    angkatan: 23,
    jalurMasuk: '130',
    nomorAbsen: 101,
    identifier: formatNim(23, '130', 101), // 24060123130101
  },
  {
    key: 'raka',
    email: 'asprak.raka@praktikum.ac.id',
    password: SEED_PASSWORD,
    displayName: 'Raka Pratama',
    role: 'assistant',
    angkatan: 23,
    jalurMasuk: '120',
    nomorAbsen: 12,
    identifier: formatNim(23, '120', 12), // 24060123120012
  },
  {
    key: 'nadia',
    email: 'asprak.nadia@praktikum.ac.id',
    password: SEED_PASSWORD,
    displayName: 'Nadia Kusuma',
    role: 'assistant',
    angkatan: 23,
    jalurMasuk: '140',
    nomorAbsen: 145,
    identifier: formatNim(23, '140', 145), // 24060123140145
  },
];

// 90 Praktikan konkret (tanpa gabungan angkatan dalam satu lab):
// - 54 praktikan angkatan 24 (jalur 120: 001..018, jalur 130: 056..073, jalur 140: 123..140) -> 3 lab @ 18 praktikan
// - 36 praktikan angkatan 25 (jalur 120: 001..012, jalur 130: 056..067, jalur 140: 123..134) -> 2 lab @ 18 praktikan
// Total pengguna: 6 Asprak + 90 Praktikan = 96 data pengguna (rentang 50 - 100)
const STUDENT_PROFILES_24 = [
  ['Wawan Sumanto', '130'],
  ['Siti Rahmawati', '120'],
  ['Bagas Saputra', '140'],
  ['Dewi Lestari', '130'],
  ['Fajar Nugroho', '120'],
  ['Intan Permata', '130'],
  ['Dimas Prasetyo', '140'],
  ['Aulia Maharani', '120'],
  ['Rizky Ramadhan', '130'],
  ['Putri Wulandari', '140'],
  ['Hendra Wijaya', '120'],
  ['Nabila Khairunnisa', '130'],
  ['Yoga Pangestu', '140'],
  ['Tari Melati', '120'],
  ['Ilham Firmansyah', '130'],
  ['Citra Ayuningtyas', '140'],
  ['Bayu Setiawan', '120'],
  ['Larissa Anggraini', '130'],
  ['Rendra Mahendra', '140'],
  ['Salma Salsabila', '120'],
  ['Kevin Kurniawan', '130'],
  ['Dinda Puspita', '140'],
  ['Aditya Fauzan', '120'],
  ['Maya Kartika', '130'],
  ['Taufik Hidayat', '140'],
  ['Zahra Amalia', '120'],
  ['Naufal Hakim', '130'],
  ['Vina Oktaviani', '140'],
  ['Farhan Akbar', '120'],
  ['Rania Safitri', '130'],
  ['Gilang Perdana', '140'],
  ['Anisa Fitriani', '120'],
  ['Arif Budiman', '130'],
  ['Sekar Ayu', '140'],
  ['Irfan Maulana', '120'],
  ['Melisa Gunawan', '130'],
  ['Daffa Pratama', '140'],
  ['Kania Pratiwi', '120'],
  ['Zaki Mubaraq', '130'],
  ['Salsa Nabila', '140'],
  ['Bima Santoso', '120'],
  ['Febriana Putri', '130'],
  ['Raditya Putra', '140'],
  ['Alifia Rahma', '120'],
  ['Reza Pahlevi', '130'],
  ['Novianti Dewi', '140'],
  ['Eko Susanto', '120'],
  ['Tiara Kusuma', '130'],
  ['Galih Permana', '140'],
  ['Hanifah Azzahra', '120'],
  ['Pandu Wibowo', '130'],
  ['Amira Syifa', '140'],
  ['Cahyo Utomo', '120'],
  ['Yuliana Sari', '130'],
];

const STUDENT_PROFILES_25 = [
  ['Arya Dwi Putra', '120'],
  ['Kirana Larasati', '130'],
  ['Fikri Haikal', '140'],
  ['Shafa Azzahra', '120'],
  ['Damar Wicaksono', '130'],
  ['Talitha Zahrani', '140'],
  ['Rafi Alfarizi', '120'],
  ['Naila Syakira', '130'],
  ['Teguh Prasetya', '140'],
  ['Alya Nurhaliza', '120'],
  ['Hafiz Ramadhan', '130'],
  ['Celine Angelica', '140'],
  ['Muhammad Faris', '120'],
  ['Bunga Cahyani', '130'],
  ['Yusuf Mawardi', '140'],
  ['Nadira Maharani', '120'],
  ['Akmal Zulfikar', '130'],
  ['Vania Putri', '140'],
  ['Rivaldi Pratama', '120'],
  ['Syifa Khoirunnisa', '130'],
  ['Naufal Azizi', '140'],
  ['Khansa Maulida', '120'],
  ['Bagus Prakoso', '130'],
  ['Aurelia Jasmine', '140'],
  ['Rasyid Ridho', '120'],
  ['Cinta Permatasari', '130'],
  ['Fadel Muhammad', '140'],
  ['Kayla Renata', '120'],
  ['Sultan Alamsyah', '130'],
  ['Nadine Aurelia', '140'],
  ['Iqbal Maulana', '120'],
  ['Zalfa Nuraini', '130'],
  ['Hanif Hidayat', '140'],
  ['Clarissa Tanuwijaya', '120'],
  ['Aldi Kurnia', '130'],
  ['Mutiara Sani', '140'],
];

function buildStudentsForAngkatan(angkatan, profiles) {
  const nextAbsenByJalur = {
    '120': JALUR_RANGES['120'].min,
    '130': JALUR_RANGES['130'].min,
    '140': JALUR_RANGES['140'].min,
  };

  return profiles.map(([displayName, jalurMasuk]) => {
    const nomorAbsen = nextAbsenByJalur[jalurMasuk];
    if (nomorAbsen === undefined) {
      throw new Error(`Jalur masuk tidak dikenal: ${jalurMasuk}`);
    }
    nextAbsenByJalur[jalurMasuk] += 1;
    const absenStr = String(nomorAbsen).padStart(3, '0');
    const nim = formatNim(angkatan, jalurMasuk, nomorAbsen);
    return {
      email: `praktikan${angkatan}.${absenStr}@praktikum.ac.id`,
      password: SEED_PASSWORD,
      displayName,
      role: 'student',
      angkatan,
      jalurMasuk,
      nomorAbsen,
      identifier: nim,
    };
  });
}

const SEED_STUDENTS = [
  ...buildStudentsForAngkatan(24, STUDENT_PROFILES_24),
  ...buildStudentsForAngkatan(25, STUDENT_PROFILES_25),
];

const SEED_ACCOUNTS = [...SEED_ASPRAK, ...SEED_STUDENTS];

const SEED_LABS = [
  {
    id: 'lab-informatika-a',
    name: 'Lab Informatika A',
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
    name: 'Lab AP (Dekanat FSM UNDIP)',
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

// Distribusi 5 lab praktikum (tanpa gabungan angkatan praktikan & pasangan asprak seangkatan):
// - Setiap lab memiliki tepat 2 asprak dengan angkatan SAMA & 18 praktikan dari 1 angkatan yang sama
// - Pasangan Asprak Angkatan 22: (Al & Qila), (Al & Galang), (Qila & Galang)
// - Pasangan Asprak Angkatan 23: (Abhi & Raka), (Abhi & Nadia)
// - Daspro A1 (Al, Qila) dan Daspro A2 (Abhi, Raka) tidak memiliki asprak yang sama
const SEED_PRACTICUM_COURSES = [
  {
    courseName: 'Dasar Pemrograman',
    className: 'A1',
    labId: 'lab-informatika-b',
    lab: 'Lab Informatika B',
    asprakKeys: ['al', 'qila'], // keduanya angkatan 22
    studentRange: [0, 18], // 18 praktikan murni angkatan 24
  },
  {
    courseName: 'Dasar Pemrograman',
    className: 'A2',
    labId: 'lab-informatika-c',
    lab: 'Lab Informatika C',
    asprakKeys: ['abhi', 'raka'], // keduanya angkatan 23
    studentRange: [18, 36], // 18 praktikan murni angkatan 24
  },
  {
    courseName: 'Struktur Data',
    className: 'B1',
    labId: 'lab-informatika-d',
    lab: 'Lab Informatika D',
    asprakKeys: ['al', 'galang'], // keduanya angkatan 22
    studentRange: [36, 54], // 18 praktikan murni angkatan 24
  },
  {
    courseName: 'Basis Data',
    className: 'B2',
    labId: 'dekanat-fsm',
    lab: 'Lab AP (Dekanat FSM UNDIP)',
    asprakKeys: ['qila', 'galang'], // keduanya angkatan 22
    studentRange: [54, 72], // 18 praktikan murni angkatan 25
  },
  {
    courseName: 'Sistem Operasi',
    className: 'A1',
    labId: 'lab-informatika-a',
    lab: 'Lab Informatika A',
    asprakKeys: ['abhi', 'nadia'], // keduanya angkatan 23
    studentRange: [72, 90], // 18 praktikan murni angkatan 25
  },
];

function assertSeedDatasetIntegrity() {
  const nimSet = new Set();
  const absenPerAngkatan = new Map();

  for (const acc of SEED_ACCOUNTS) {
    if (typeof acc.identifier !== 'string' || acc.identifier.length !== 14) {
      throw new Error(`NIM invalid untuk ${acc.displayName}: ${acc.identifier}`);
    }
    if (!acc.identifier.startsWith('240601')) {
      throw new Error(`Prefix NIM harus 240601 untuk ${acc.displayName}: ${acc.identifier}`);
    }
    if (nimSet.has(acc.identifier)) {
      throw new Error(`NIM duplikat ditemukan di seeder: ${acc.identifier}`);
    }
    nimSet.add(acc.identifier);

    const range = JALUR_RANGES[acc.jalurMasuk];
    if (!range || acc.nomorAbsen < range.min || acc.nomorAbsen > range.max) {
      throw new Error(
        `Nomor absen ${acc.nomorAbsen} di luar rentang jalur ${acc.jalurMasuk} untuk ${acc.displayName} (${acc.identifier}).`,
      );
    }

    if (!absenPerAngkatan.has(acc.angkatan)) {
      absenPerAngkatan.set(acc.angkatan, new Set());
    }
    const angkatanAbsenSet = absenPerAngkatan.get(acc.angkatan);
    if (angkatanAbsenSet.has(acc.nomorAbsen)) {
      throw new Error(`Nomor absen duplikat (${acc.nomorAbsen}) pada angkatan ${acc.angkatan}.`);
    }
    angkatanAbsenSet.add(acc.nomorAbsen);
  }

  const asprakByKey = new Map(SEED_ASPRAK.map((a) => [a.key, a]));
  const pairSet = new Set();
  const courseAsprakMap = new Map();

  for (const cls of SEED_PRACTICUM_COURSES) {
    if (cls.asprakKeys.length !== 2) {
      throw new Error(`Kelas ${cls.courseName} ${cls.className} harus dipegang tepat 2 asprak.`);
    }
    const pairKey = [...cls.asprakKeys].sort().join('+');
    if (pairSet.has(pairKey)) {
      throw new Error(`Pasangan asprak berulang di seeder: ${pairKey}`);
    }
    pairSet.add(pairKey);

    const asprakAngkatanSet = new Set(cls.asprakKeys.map((k) => asprakByKey.get(k).angkatan));
    if (asprakAngkatanSet.size !== 1) {
      throw new Error(
        `Pasangan asprak di kelas ${cls.courseName} ${cls.className} harus berada pada angkatan yang sama (${[...asprakAngkatanSet].join(', ')}).`,
      );
    }

    if (!courseAsprakMap.has(cls.courseName)) {
      courseAsprakMap.set(cls.courseName, new Set());
    }
    const courseSet = courseAsprakMap.get(cls.courseName);
    for (const k of cls.asprakKeys) {
      if (courseSet.has(k)) {
        throw new Error(`Asprak ${k} mengasprak mata kuliah sama (${cls.courseName}) di kelas berbeda.`);
      }
      courseSet.add(k);
    }

    const [startIdx, endIdx] = cls.studentRange;
    const classStudents = SEED_STUDENTS.slice(startIdx, endIdx);
    const angkatanSet = new Set(classStudents.map((s) => s.angkatan));
    if (angkatanSet.size !== 1) {
      throw new Error(
        `Kelas ${cls.courseName} ${cls.className} harus berisi 1 angkatan praktikan tanpa gabungan (${[...angkatanSet].join(', ')}).`,
      );
    }

    for (const k of cls.asprakKeys) {
      const asprak = asprakByKey.get(k);
      for (const student of classStudents) {
        if (asprak.angkatan > student.angkatan - 1) {
          throw new Error(
            `Angkatan asprak ${asprak.displayName} (${asprak.angkatan}) tidak >= 1 tahun di atas praktikan ${student.displayName} (${student.angkatan}).`,
          );
        }
      }
    }
  }
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

function buildDryRunSummary() {
  const asprakByKey = new Map(SEED_ASPRAK.map((a) => [a.key, a]));
  const classesSummary = SEED_PRACTICUM_COURSES.map((cls) => {
    const [startIdx, endIdx] = cls.studentRange;
    const students = SEED_STUDENTS.slice(startIdx, endIdx);
    const aspraks = cls.asprakKeys.map((k) => {
      const a = asprakByKey.get(k);
      return `${a.displayName} (${a.identifier})`;
    });
    return {
      mataKuliah: cls.courseName,
      kelas: cls.className,
      lab: cls.lab,
      angkatanAsprak: asprakByKey.get(cls.asprakKeys[0])?.angkatan,
      angkatanPraktikan: students[0]?.angkatan,
      jumlahPraktikan: students.length,
      asprak: aspraks.join(' & '),
    };
  });

  return {
    totalUsers: SEED_ACCOUNTS.length,
    totalAsprak: SEED_ASPRAK.length,
    totalPraktikan: SEED_STUDENTS.length,
    totalLabs: SEED_LABS.length,
    totalClasses: SEED_PRACTICUM_COURSES.length,
    classesSummary,
  };
}

async function main() {
  assertSeedDatasetIntegrity();

  const isDryRun = process.argv.includes('--dry-run');
  if (isDryRun) {
    const summary = buildDryRunSummary();
    console.log('=== DRY RUN VERIFIKASI SEEDER ===');
    console.log(
      `Total Akun: ${summary.totalUsers} (${summary.totalAsprak} Asprak, ${summary.totalPraktikan} Praktikan)`,
    );
    console.log(`Total Lab Fisik: ${summary.totalLabs}, Total Kelas Praktikum: ${summary.totalClasses}`);
    console.log('\n=== CONTOH AKUN ASPRAK (CHAR 14) ===');
    console.table(
      SEED_ASPRAK.map(({ displayName, angkatan, identifier, email }) => ({
        displayName,
        angkatan,
        nim: identifier,
        panjangNim: identifier.length,
        email,
      })),
    );
    console.log('\n=== CONTOH 10 AKUN PRAKTIKAN PERTAMA (CHAR 14) ===');
    console.table(
      SEED_STUDENTS.slice(0, 10).map(({ displayName, angkatan, identifier, email }) => ({
        displayName,
        angkatan,
        nim: identifier,
        panjangNim: identifier.length,
        email,
      })),
    );
    console.log(`\n=== RINGKASAN PEMBAGIAN ${SEED_PRACTICUM_COURSES.length} LAB PRAKTIKUM ===`);
    console.table(summary.classesSummary);
    return;
  }

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
    console.log(
      `1. Membuat / memverifikasi ${SEED_ACCOUNTS.length} akun (${SEED_ASPRAK.length} Asprak, ${SEED_STUDENTS.length} Praktikan)...`,
    );
    const seededAccounts = [];
    for (const account of SEED_ACCOUNTS) {
      const seeded = await ensureAccount(auth, db, account);
      seededAccounts.push(seeded);
    }

    const assistants = seededAccounts.filter((acc) => acc.role === 'assistant');
    const students = seededAccounts.filter((acc) => acc.role === 'student');
    const assistantByKey = new Map(assistants.map((a) => [a.key, a]));
    const primaryAssistant = assistants[0];

    await signInWithEmailAndPassword(auth, primaryAssistant.email, primaryAssistant.password);

    console.log(`2. Membuat / memverifikasi ${SEED_LABS.length} master data laboratorium (koleksi labs)...`);
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
    await signOut(auth);

    const seededClasses = [];
    console.log(`3. Membuat / memverifikasi ${SEED_PRACTICUM_COURSES.length} kelas praktikum beserta ~20 praktikan & 2 asprak...`);

    for (let index = 0; index < SEED_PRACTICUM_COURSES.length; index += 1) {
      const course = SEED_PRACTICUM_COURSES[index];
      const classAssistants = course.asprakKeys.map((key) => assistantByKey.get(key));
      const leadAssistant = classAssistants[0];
      const classAssistantIds = classAssistants.map((a) => a.uid);

      const [startIdx, endIdx] = course.studentRange;
      const classStudents = students.slice(startIdx, endIdx);
      const classStudentNims = classStudents.map((s) => s.identifier);

      await signInWithEmailAndPassword(auth, leadAssistant.email, leadAssistant.password);

      const existingClassesSnap = await getDocs(
        query(collection(db, 'classes'), where('assistantIds', 'array-contains', leadAssistant.uid)),
      );
      const existing = existingClassesSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .find(
          (d) =>
            d.archived !== true &&
            d.practicumName === course.courseName &&
            d.className === course.className,
        );

      let classId = existing?.id;
      let classState = 'existing';

      if (!classId) {
        const docRef = await addDoc(collection(db, 'classes'), {
          practicumName: course.courseName,
          className: course.className,
          lab: course.lab,
          assistantIds: classAssistantIds,
          memberUids: classStudentNims,
          createdBy: leadAssistant.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        classId = docRef.id;
        classState = 'created';
      }

      const memberBatch = writeBatch(db);
      let hasBatchOps = false;

      for (const student of classStudents) {
        const nimDocRef = doc(db, 'classes', classId, 'members', student.identifier);
        const uidDocRef = doc(db, 'classes', classId, 'members', student.uid);
        const [nimSnap, uidSnap] = await Promise.all([getDoc(nimDocRef), getDoc(uidDocRef)]);

        if (!nimSnap.exists()) {
          memberBatch.set(nimDocRef, {
            userId: student.identifier,
            role: 'student',
            displayName: student.displayName,
            identifier: student.identifier,
            joinedAt: serverTimestamp(),
          });
          memberBatch.update(doc(db, 'classes', classId), {
            memberUids: arrayUnion(student.identifier),
            updatedAt: serverTimestamp(),
          });
          if (uidSnap.exists() && student.uid !== student.identifier) {
            memberBatch.delete(uidDocRef);
          }
          hasBatchOps = true;
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

      if (hasBatchOps) {
        await memberBatch.commit();
      }

      const existingSessions = await getDocs(
        query(collection(db, 'sessions'), where('classId', '==', classId)),
      );
      const hasActiveSession = existingSessions.docs.some((d) => d.data().status !== 'cancelled');
      let sessionCreated = false;
      if (!hasActiveSession) {
        const start = new Date();
        start.setDate(start.getDate() + index + 1);
        start.setHours(8, 0, 0, 0);
        const end = new Date(start);
        end.setHours(10, 0, 0, 0);
        const labData = labById.get(course.labId) ?? SEED_LABS[0];

        await addDoc(collection(db, 'sessions'), {
          classId,
          title: `Pertemuan 1 - Pengenalan ${course.courseName} (${course.className})`,
          location: labData.name,
          labId: labData.id,
          locationName: labData.name,
          latitude: labData.latitude,
          longitude: labData.longitude,
          radiusMeters: labData.radiusMeters,
          startsAt: Timestamp.fromDate(start),
          endsAt: Timestamp.fromDate(end),
          status: 'scheduled',
          createdBy: leadAssistant.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        sessionCreated = true;
      }

      await signOut(auth);

      seededClasses.push({
        classId,
        courseName: course.courseName,
        className: course.className,
        lab: course.lab,
        asprak: classAssistants.map((a) => `${a.displayName} (${a.identifier})`).join(' & '),
        jumlahPraktikan: classStudents.length,
        state: classState,
        session: sessionCreated ? 'created' : 'existing',
      });
    }

    console.log('\n=== RINGKASAN AKUN ASPRAK SEEDED ===');
    console.table(
      assistants.map(({ displayName, angkatan, identifier, email, password, status }) => ({
        displayName,
        angkatan,
        nim: identifier,
        email,
        password,
        status,
      })),
    );

    console.log(`\n=== RINGKASAN PRAKTIKAN SEEDED (TOTAL ${students.length} AKUN, MENAMPILKAN 10 PERTAMA) ===`);
    console.table(
      students.slice(0, 10).map(({ displayName, angkatan, identifier, email, status }) => ({
        displayName,
        angkatan,
        nim: identifier,
        email,
        status,
      })),
    );

    console.log(`\n=== RINGKASAN ${SEED_PRACTICUM_COURSES.length} LAB PRAKTIKUM ===`);
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
