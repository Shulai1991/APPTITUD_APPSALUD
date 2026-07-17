import type { Patient, Appointment, Professional, User } from './types';
import { ToothCondition } from './types';

export function createOdontogram(): { id: number; condition: ToothCondition }[] {
  return Array.from({ length: 32 }, (_, i) => ({
    id: i + 1,
    condition: ToothCondition.Healthy,
  }));
}

export const MOCK_PATIENTS: Patient[] = [
  {
    id: 1,
    name: 'Carlos',
    lastName: 'García',
    birthDate: '1985-05-20',
    phone: '+54 9 11 1234-5678',
    email: 'carlos.garcia@example.com',
    address: 'Av. Corrientes 1234, CABA',
    avatarUrl: 'https://picsum.photos/seed/carlos/200/200',
    dni: '29.123.456',
    healthInsurance: 'OSDE',
    insuranceId: '310-12345678-01',
    clinicalHistory: [
      { 
        date: '2023-10-15', 
        reason: 'Consulta inicial y limpieza.',
        diagnosis: 'Placa bacteriana y gingivitis leve.',
        procedures: ['Tartrectomía supragingival', 'Profilaxis'],
        suggestedTreatment: 'Mejorar técnica de cepillado y uso de hilo dental.'
      },
      { 
        date: '2023-11-02', 
        reason: 'Restauración en pieza 16.',
        diagnosis: 'Caries profunda en pieza 16.',
        procedures: ['Anestesia local', 'Aislamiento absoluto', 'Remoción de caries', 'Obturación con resina compuesta fotopolimerizable'],
        suggestedTreatment: 'Evitar masticar alimentos duros con esa pieza por 24 horas.',
        file: {name: 'radiografia_16.pdf', url: '#'} 
      },
    ],
    odontogram: createOdontogram().map(tooth => {
      if (tooth.id === 16) return { ...tooth, condition: ToothCondition.Restoration };
      if (tooth.id === 30) return { ...tooth, condition: ToothCondition.Caries };
      return tooth;
    }),
    invoices: [
      { id: 101, date: '2023-10-15', items: [{ description: 'Consulta y Limpieza', quantity: 1, price: 50 }], total: 50, status: 'paid' },
      { id: 102, date: '2023-11-02', items: [{ description: 'Restauración Composite', quantity: 1, price: 120 }], total: 120, status: 'pending' },
    ],
    prescriptions: [
        {id: 1, date: '2023-11-02', medication: 'Ibuprofeno 600mg', dosage: '1 comprimido cada 8 horas', instructions: 'Tomar después de las comidas.'}
    ],
  },
  {
    id: 2,
    name: 'Ana',
    lastName: 'Martinez',
    birthDate: '1992-09-10',
    phone: '+54 9 11 8765-4321',
    email: 'ana.martinez@example.com',
    address: 'Calle Florida 567, CABA',
    avatarUrl: 'https://picsum.photos/seed/ana/200/200',
    dni: '35.987.654',
    healthInsurance: 'Swiss Medical',
    insuranceId: 'SMG-98765432',
    clinicalHistory: [
      {
        date: '2024-01-20',
        reason: 'Dolor agudo en incisivo central superior derecho.',
        diagnosis: 'Fractura radicular vertical pieza 1.1. No restaurable.',
        procedures: ['Extracción de la pieza 1.1.'],
        suggestedTreatment: 'Analgésicos y antibióticos por 7 días. Control post-extracción en una semana.',
      },
      {
        date: '2024-03-05',
        reason: 'Control y planificación de implante.',
        diagnosis: 'Buena cicatrización del alveolo post-extracción.',
        procedures: ['Toma de tomografía computarizada (TC).', 'Planificación digital de implante.'],
        suggestedTreatment: 'Colocación de implante en 2 meses.',
      },
    ],
    odontogram: createOdontogram().map(tooth => {
      if (tooth.id === 8) return { ...tooth, condition: ToothCondition.Extraction };
      return tooth;
    }),
    invoices: [
        { id: 201, date: '2024-01-20', items: [{ description: 'Extracción Simple', quantity: 1, price: 150 }], total: 150, status: 'paid' },
    ],
    prescriptions: [],
  },
];

export const PROFESSIONALS: Professional[] = [
  {
    id: 1,
    name: 'Dra. Juliana María Peláez',
    specialty: 'Odontología General y Estética',
    license: 'MP-8432-A',
    avatar: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=200&h=200',
    slotInterval: 30,
    startHour: '08:00',
    endHour: '18:00',
    blockedRanges: [],
  },
  {
    id: 2,
    name: 'Dr. Sebastián Gómez',
    specialty: 'Ortodoncia e Implantes',
    license: 'MP-5290-B',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200&h=200',
    slotInterval: 40,
    startHour: '09:00',
    endHour: '17:00',
    blockedRanges: [],
  },
  {
    id: 3,
    name: 'Dra. Jimena Flores',
    specialty: 'Odontopediatría',
    license: 'MP-7311-C',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200&h=200',
    slotInterval: 20,
    startHour: '08:30',
    endHour: '15:30',
    blockedRanges: [],
  },
];

const today = new Date();
const formatDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const MOCK_APPOINTMENTS: Appointment[] = [
    {
        id: 1,
        patientId: 1,
        patientName: 'Carlos García',
        date: formatDate(today),
        time: '10:00',
        reason: 'Control Anual',
        status: 'scheduled',
        professionalId: 1,
        createdBy: 'Administrador Central'
    },
    {
        id: 2,
        patientId: 2,
        patientName: 'Ana Martinez',
        date: formatDate(today),
        time: '11:30',
        reason: 'Seguimiento Implante',
        status: 'scheduled',
        professionalId: 2,
        createdBy: 'Administrador Central'
    },
    {
        id: 3,
        patientId: 1,
        patientName: 'Carlos García',
        date: formatDate(new Date(new Date().setDate(today.getDate() + 2))),
        time: '15:00',
        reason: 'Molestia en molar',
        status: 'scheduled',
        professionalId: 1,
        createdBy: 'Administrador Central'
    },
    {
        id: 4,
        patientId: 2,
        patientName: 'Ana Martinez',
        date: formatDate(new Date(new Date().setDate(today.getDate() - 5))),
        time: '09:00',
        reason: 'Revisión General',
        status: 'present',
        professionalId: 3,
        createdBy: 'Administrador Central'
    }
];


// Universal Numbering System (Dentist's View) for layout purposes
export const ODONTOGRAM_LAYOUT = {
  upperRight: [1, 2, 3, 4, 5, 6, 7, 8],
  upperLeft: [9, 10, 11, 12, 13, 14, 15, 16],
  lowerLeft: [17, 18, 19, 20, 21, 22, 23, 24],
  lowerRight: [25, 26, 27, 28, 29, 30, 31, 32],
};

type ToothType = 'incisor' | 'canine' | 'premolar' | 'molar';

export const TOOTH_SVG_PATHS: Record<ToothType, {upper: string, lower: string}> = {
  incisor: {
    upper: "M15 5 L 15 25 C 15 35, 35 35, 35 25 L 35 5 C 35 -5, 15 -5, 15 5 Z M 25 35 L 25 55 L 20 60 L 30 60 Z",
    lower: "M18 15 L 18 35 C 18 45, 32 45, 32 35 L 32 15 C 32 5, 18 5, 18 15 Z M 25 45 L 25 60 L 22 65 L 28 65 Z"
  },
  canine: {
    upper: "M12 5 L 12 30 C 12 40, 38 40, 38 30 L 38 5 C 38 -5, 12 -5, 12 5 Z M 25 40 L 25 65 L 20 70 L 30 70 Z",
    lower: "M15 10 L 15 35 C 15 45, 35 45, 35 35 L 35 10 C 35 0, 15 0, 15 10 Z M 25 45 L 25 65 L 20 70 L 30 70 Z"
  },
  premolar: {
    upper: "M10 10 C 10 0, 40 0, 40 10 L 45 25 L 35 35 L 15 35 L 5 25 Z M 15 35 L 10 55 L 20 50 Z M 35 35 L 40 55 L 30 50 Z",
    lower: "M10 15 C 10 5, 40 5, 40 15 L 45 30 L 35 40 L 15 40 L 5 30 Z M 15 40 L 10 60 L 20 55 Z M 35 40 L 40 60 L 30 55 Z"
  },
  molar: {
    upper: "M5 15 C 5 5, 45 5, 45 15 L 50 30 L 40 40 L 10 40 L 0 30 Z M 10 40 L 5 60 L 15 55 Z M 25 40 L 20 60 L 30 60 Z M 40 40 L 45 60 L 35 55 Z",
    lower: "M5 20 C 5 10, 45 10, 45 20 L 50 35 L 40 45 L 10 45 L 0 35 Z M 10 45 L 5 65 L 15 60 Z M 25 45 L 20 65 L 30 65 Z M 40 45 L 45 65 L 35 60 Z"
  }
};

export const TOOTH_TYPE_MAP: Record<number, ToothType> = {
  1: 'molar', 2: 'molar', 3: 'molar', 4: 'premolar', 5: 'premolar', 6: 'canine', 7: 'incisor', 8: 'incisor',
  9: 'incisor', 10: 'incisor', 11: 'canine', 12: 'premolar', 13: 'premolar', 14: 'molar', 15: 'molar', 16: 'molar',
  17: 'molar', 18: 'molar', 19: 'molar', 20: 'premolar', 21: 'premolar', 22: 'canine', 23: 'incisor', 24: 'incisor',
  25: 'incisor', 26: 'incisor', 27: 'canine', 28: 'premolar', 29: 'premolar', 30: 'molar', 31: 'molar', 32: 'molar',
};

export const TOOTH_CONDITIONS_OPTIONS = Object.values(ToothCondition);

export const MASTER_USER: User = {
  id: 9999,
  username: "master",
  password: "123",
  fullName: "Usuario Maestro Global",
  role: "master",
  permissions: {
    canAccessBackoffice: true,
    canManageUsers: true,
    canEditSettings: true,
    canEditPatients: true,
    canManageAppointments: true,
    canViewClinicalHistory: true,
  },
  active: true,
};

export const MOCK_CENTERS: MedicalCenter[] = [
  {
    id: "sede-central",
    name: "Diseños con Apptitud - Sede Central",
    logo: null,
    address: "Av. Corrientes 1234, CABA, Argentina",
    cuil: "30-12345678-9",
    phone: "+54 11 9876-5432",
    active: true,
  },
  {
    id: "sede-recoleta",
    name: "Diseños con Apptitud - Recoleta",
    logo: null,
    address: "Av. Las Heras 2345, CABA, Argentina",
    cuil: "30-87654321-9",
    phone: "+54 11 4444-5555",
    active: true,
  },
  {
    id: "sede-belgrano",
    name: "Diseños con Apptitud - Belgrano",
    logo: null,
    address: "Juramento 1520, Belgrano, CABA",
    cuil: "30-99988877-9",
    phone: "+54 11 3211-9988",
    active: false, // Starts inactive to demonstrate active/inactive filter state
  }
];

export const MOCK_USERS: User[] = [
  {
    id: 1,
    username: "admin",
    password: "123",
    fullName: "Administrador General",
    role: "admin",
    permissions: {
      canAccessBackoffice: true,
      canManageUsers: true,
      canEditSettings: true,
      canEditPatients: true,
      canManageAppointments: true,
      canViewClinicalHistory: true,
    },
    active: true,
    centerId: "sede-central",
  },
  {
    id: 2,
    username: "dra.juliana",
    password: "123",
    fullName: "Dra. Juliana María Peláez",
    role: "odontologist",
    permissions: {
      canAccessBackoffice: false,
      canManageUsers: false,
      canEditSettings: false,
      canEditPatients: true,
      canManageAppointments: true,
      canViewClinicalHistory: true,
    },
    active: true,
    centerId: "sede-central",
    license: "MP-8432-A",
  },
  {
    id: 3,
    username: "recepcion",
    password: "123",
    fullName: "Secretaría S.A.",
    role: "receptionist",
    permissions: {
      canAccessBackoffice: false,
      canManageUsers: false,
      canEditSettings: false,
      canEditPatients: true,
      canManageAppointments: true,
      canViewClinicalHistory: false,
    },
    active: true,
    centerId: "sede-central",
  },
  // Recoleta users
  {
    id: 4,
    username: "admin.recoleta",
    password: "123",
    fullName: "Admin Recoleta",
    role: "admin",
    permissions: {
      canAccessBackoffice: true,
      canManageUsers: true,
      canEditSettings: true,
      canEditPatients: true,
      canManageAppointments: true,
      canViewClinicalHistory: true,
    },
    active: true,
    centerId: "sede-recoleta",
  },
  {
    id: 5,
    username: "dr.gomez",
    password: "123",
    fullName: "Dr. Leandro Gómez",
    role: "odontologist",
    permissions: {
      canAccessBackoffice: false,
      canManageUsers: false,
      canEditSettings: false,
      canEditPatients: true,
      canManageAppointments: true,
      canViewClinicalHistory: true,
    },
    active: true,
    centerId: "sede-recoleta",
    license: "MP-5290-B",
  },
  {
    id: 6,
    username: "recepcion.recoleta",
    password: "123",
    fullName: "Secretaría Recoleta",
    role: "receptionist",
    permissions: {
      canAccessBackoffice: false,
      canManageUsers: false,
      canEditSettings: false,
      canEditPatients: true,
      canManageAppointments: true,
      canViewClinicalHistory: false,
    },
    active: true,
    centerId: "sede-recoleta",
  }
];

