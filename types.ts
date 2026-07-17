export type View = 'patient_list' | 'patient_detail' | 'billing' | 'dashboard' | 'settings' | 'calendar' | 'backoffice' | 'master_backoffice' | 'price_list' | 'clinical_history_search' | 'telemedicine' | 'whatsapp_bot';

export type UserRole = 'master' | 'admin' | 'odontologist' | 'specialist' | 'receptionist' | 'assistant' | 'patient';

export interface MedicalCenter {
  id: string;
  name: string;
  logo: string | null; // Base64 data URL
  address: string;
  cuil: string;
  phone: string;
  active: boolean;
  loginBannerDesktop?: string | null;
  loginBannerMobile?: string | null;
}

export interface UserPermissions {
  canAccessBackoffice: boolean;
  canManageUsers: boolean;
  canEditSettings: boolean;
  canEditPatients: boolean;
  canManageAppointments: boolean;
  canViewClinicalHistory: boolean;
}

export interface User {
  id: number;
  username: string;
  password?: string;
  fullName: string;
  role: UserRole;
  permissions: UserPermissions;
  active: boolean;
  centerId?: string; // Scoped to a medical center (null or empty for master users with global access)
  license?: string; // Matrícula Provincial
}

export enum ToothCondition {
  Healthy = 'Sano',
  Caries = 'Caries',
  Extraction = 'Extracción',
  Implant = 'Implante',
  Crown = 'Corona',
  Restoration = 'Restauración',
}

export interface ToothHistoryEntry {
  date: string;
  condition: ToothCondition;
  professionalName?: string;
  professionalLicense?: string;
}

export interface Tooth {
  id: number;
  condition: ToothCondition;
  history?: ToothHistoryEntry[];
}

export interface ClinicalHistoryEntry {
  id?: number; // Opcional para poder identificar de forma única para ediciones
  date: string;
  time?: string; // Hora de la atención
  createdAtISO?: string; // ISO de creación para control de 24hs
  description?: string; // For simple/file entries
  reason?: string; // Motivo de consulta
  diagnosis?: string;
  procedures?: string[];
  suggestedTreatment?: string;
  file?: {
    name: string;
    url: string; // In a real app, this would be a URL to the file
  };
  isConsent?: boolean;
  consentTitle?: string;
  consentText?: string;
  signatureImage?: string; // Base64 data-url from canvas
  signatureName?: string; // Clarificación
  signatureDni?: string; // DNI del firmante
  signatureTimestamp?: string; // Timestamp exacto de la firma
  isConsentDeleted?: boolean;
  consentDeletionReason?: string;
  consentDeletionTimestamp?: string;
  professionalName?: string;
  professionalLicense?: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  price: number;
}

export interface InvoicePayment {
  amount: number;
  method: 'efectivo' | 'transferencia' | 'qr' | 'tarjeta' | 'otro';
  transactionNumber?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
}

export interface Invoice {
  id: number;
  date: string;
  items: InvoiceItem[];
  total: number;
  status: 'paid' | 'pending' | 'partial';
  payments?: InvoicePayment[];
}

export interface Prescription {
  id: number;
  date: string;
  medication: string;
  dosage: string;
  instructions: string;
}

export interface Certificate {
  id: number;
  date: string;       // YYYY-MM-DD
  time: string;       // HH:mm
  diagnosis: string;  // Space/text for diagnostic
  restDays?: number;  // Optional rest days recommended
  professionalName: string;   // Automatically signed
  professionalLicense?: string; // Professional's matricula
}

export type AppointmentStatus = 'scheduled' | 'present' | 'absent' | 'cancelled';

export interface BlockedTimeRange {
  id: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startTime?: string; // HH:mm (opcional)
  endTime?: string; // HH:mm (opcional)
  reason: 'vacation' | 'sickness' | 'personal' | 'other';
  comment?: string;
}

export interface DaySchedule {
  dayOfWeek: number; // 0 = Domingo, 1 = Lunes, 2 = Martes, 3 = Miércoles, 4 = Jueves, 5 = Viernes, 6 = Sábado
  enabled: boolean;
  startHour: string;
  endHour: string;
}

export interface Professional {
  id: number;
  name: string;
  specialty: string;
  license?: string; // Matrícula Provincial
  avatar: string;
  slotInterval: 15 | 20 | 30 | 40 | 60;
  startHour: string; // e.g. "08:00"
  endHour: string; // e.g. "18:00"
  blockedRanges: BlockedTimeRange[];
  weeklySchedule?: DaySchedule[];
  telemedicineWeeklySchedule?: DaySchedule[];
  telemedicineEnabled?: boolean; // Habilitado para telemedicina
}

export interface Appointment {
  id: number;
  patientId: number;
  patientName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  reason: string;
  status: AppointmentStatus;
  professionalId: number;
  centerId?: string; // Associated medical center
  createdBy?: string; // Operator/user who granted/scheduled this appointment
  cancellationReason?: string; // Reason why the appointment was cancelled
  telemedicine?: boolean; // ¿Es un turno virtual/telemedicina?
  jitsiRoomUrl?: string; // URL de la sala de Jitsi
}

export interface Patient {
  id: number;
  name: string;
  lastName: string;
  birthDate?: string;
  phone: string;
  email?: string;
  address?: string;
  avatarUrl: string;
  dni: string;
  gender?: 'M' | 'F' | 'X';
  validationStatus?: 'unvalidated' | 'validated_sintys' | 'failed_sintys';
  validation_details?: string;
  validation_timestamp?: string;
  healthInsurance: string;
  insuranceId: string;
  clinicalHistory: ClinicalHistoryEntry[];
  odontogram: Tooth[];
  invoices: Invoice[];
  prescriptions: Prescription[];
  certificates?: Certificate[];
  centerId?: string; // Associated medical center
}

export interface ClinicSettings {
  name: string;
  logo: string | null; // Base64 data URL
  address: string;
  cuil: string;
  phone: string;
  consentTemplate?: string;
  telemedicineModuleActive?: boolean; // Módulo de telemedicina opcional activo
}
