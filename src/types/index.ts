export interface TreatmentType {
  id: string;
  name: string;
  defaultPrice: number;
  /** Default appointment length in minutes, used to auto-fill the end time. */
  defaultDurationMinutes: number;
  color: string;
}

export interface Patient {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  createdAt: string;
}

export interface Session {
  id: string;
  patientId: string;
  /** Denormalised so a session stays readable if the patient is later removed. */
  patientName: string;
  typeId: string;
  typeName: string;
  /** ISO 8601 timestamps. */
  startAt: string;
  endAt: string;
  price: number;
  paid: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  clinicName: string;
  currency: string;
  locale: string;
}

export interface AppData {
  sessions: Session[];
  patients: Patient[];
  treatmentTypes: TreatmentType[];
  settings: Settings;
}

export type SessionStatus = 'upcoming' | 'in-progress' | 'completed';

export interface SessionInput {
  patientId: string;
  patientName: string;
  typeId: string;
  typeName: string;
  startAt: Date;
  endAt: Date;
  price: number;
  paid: boolean;
  notes?: string;
}
