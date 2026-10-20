import type { Patient, Session, Settings, TreatmentType } from '../types';

/**
 * Row shapes mirror the SQLite columns (snake_case). The mappers are pure so they
 * can be unit tested under Node, where the native SQLite module is unavailable.
 */

export interface SessionRow {
  id: string;
  patient_id: string;
  patient_name: string;
  type_id: string;
  type_name: string;
  start_at: string;
  end_at: string;
  price: number;
  paid: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function sessionToRow(session: Session): SessionRow {
  return {
    id: session.id,
    patient_id: session.patientId,
    patient_name: session.patientName,
    type_id: session.typeId,
    type_name: session.typeName,
    start_at: session.startAt,
    end_at: session.endAt,
    price: session.price,
    paid: session.paid ? 1 : 0,
    notes: session.notes ?? null,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
  };
}

export function rowToSession(row: SessionRow): Session {
  const session: Session = {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patient_name,
    typeId: row.type_id,
    typeName: row.type_name,
    startAt: row.start_at,
    endAt: row.end_at,
    price: row.price,
    paid: row.paid === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  // Omit the key entirely rather than setting it to undefined, so the object shape
  // (and therefore the serialised backup) matches what the app produced before.
  if (row.notes != null) session.notes = row.notes;
  return session;
}

export interface PatientRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

export function patientToRow(patient: Patient): PatientRow {
  return {
    id: patient.id,
    name: patient.name,
    phone: patient.phone ?? null,
    email: patient.email ?? null,
    notes: patient.notes ?? null,
    created_at: patient.createdAt,
  };
}

export function rowToPatient(row: PatientRow): Patient {
  const patient: Patient = { id: row.id, name: row.name, createdAt: row.created_at };
  if (row.phone != null) patient.phone = row.phone;
  if (row.email != null) patient.email = row.email;
  if (row.notes != null) patient.notes = row.notes;
  return patient;
}

export interface TreatmentTypeRow {
  id: string;
  name: string;
  default_price: number;
  default_duration_minutes: number;
  color: string;
}

export function treatmentTypeToRow(type: TreatmentType): TreatmentTypeRow {
  return {
    id: type.id,
    name: type.name,
    default_price: type.defaultPrice,
    default_duration_minutes: type.defaultDurationMinutes,
    color: type.color,
  };
}

export function rowToTreatmentType(row: TreatmentTypeRow): TreatmentType {
  return {
    id: row.id,
    name: row.name,
    defaultPrice: row.default_price,
    defaultDurationMinutes: row.default_duration_minutes,
    color: row.color,
  };
}

export interface SettingsRow {
  clinic_name: string;
  currency: string;
  locale: string;
}

export function settingsToRow(settings: Settings): SettingsRow {
  return {
    clinic_name: settings.clinicName,
    currency: settings.currency,
    locale: settings.locale,
  };
}

export function rowToSettings(row: SettingsRow): Settings {
  return {
    clinicName: row.clinic_name,
    currency: row.currency,
    locale: row.locale,
  };
}
