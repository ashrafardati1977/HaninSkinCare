import assert from 'node:assert/strict';
import test from 'node:test';

import type { AppData, Patient, Session, TreatmentType } from '../src/types';
import { diffData, isEmptyDiff } from '../src/storage/diff';
import {
  patientToRow,
  rowToPatient,
  rowToSession,
  rowToSettings,
  rowToTreatmentType,
  sessionToRow,
  settingsToRow,
  treatmentTypeToRow,
} from '../src/storage/rows';

function session(id: string, overrides: Partial<Session> = {}): Session {
  return {
    id,
    patientId: 'pat_1',
    patientName: 'Layla Al-Harbi',
    typeId: 'type_1',
    typeName: 'HydraFacial',
    startAt: '2026-05-01T10:00:00.000Z',
    endAt: '2026-05-01T11:00:00.000Z',
    price: 250,
    paid: false,
    createdAt: '2026-05-01T09:00:00.000Z',
    updatedAt: '2026-05-01T09:00:00.000Z',
    ...overrides,
  };
}

function patient(id: string, overrides: Partial<Patient> = {}): Patient {
  return { id, name: 'Layla Al-Harbi', createdAt: '2026-05-01T09:00:00.000Z', ...overrides };
}

function type(id: string, overrides: Partial<TreatmentType> = {}): TreatmentType {
  return {
    id,
    name: 'HydraFacial',
    defaultPrice: 250,
    defaultDurationMinutes: 60,
    color: '#F4C7C3',
    ...overrides,
  };
}

function data(overrides: Partial<AppData> = {}): AppData {
  return {
    sessions: [session('ses_1'), session('ses_2')],
    patients: [patient('pat_1')],
    treatmentTypes: [type('type_1')],
    settings: { clinicName: 'Hanin Skincare', currency: 'USD', locale: 'en' },
    ...overrides,
  };
}

test('no changes produces an empty diff', () => {
  const a = data();
  // Structurally identical but a different object, as the provider always creates.
  const b = data();
  assert.ok(isEmptyDiff(diffData(a, b)));
});

test('editing one session upserts only that session', () => {
  const before = data();
  const after = data({
    sessions: [session('ses_1', { price: 300 }), session('ses_2')],
  });

  const diff = diffData(before, after);
  assert.equal(diff.sessions.upsert.length, 1);
  assert.equal(diff.sessions.upsert[0].id, 'ses_1');
  assert.equal(diff.sessions.deleteIds.length, 0);
});

test('adding a session upserts only the new one', () => {
  const before = data();
  const after = data({ sessions: [session('ses_3'), session('ses_1'), session('ses_2')] });

  const diff = diffData(before, after);
  assert.deepEqual(
    diff.sessions.upsert.map((s) => s.id),
    ['ses_3'],
  );
});

test('removing a session records its id for deletion', () => {
  const before = data();
  const after = data({ sessions: [session('ses_1')] });

  const diff = diffData(before, after);
  assert.equal(diff.sessions.upsert.length, 0);
  assert.deepEqual(diff.sessions.deleteIds, ['ses_2']);
});

test('a change to one table does not touch the others', () => {
  const before = data();
  const after = data({ patients: [patient('pat_1', { name: 'Layla H.' })] });

  const diff = diffData(before, after);
  assert.equal(diff.patients.upsert.length, 1);
  assert.equal(diff.sessions.upsert.length, 0);
  assert.equal(diff.treatmentTypes.upsert.length, 0);
  assert.equal(diff.settingsChanged, false);
});

test('settings change is detected and carried in the diff', () => {
  const before = data();
  const after = data({
    settings: { clinicName: 'Hanin Skincare', currency: 'SAR', locale: 'en' },
  });

  const diff = diffData(before, after);
  assert.equal(diff.settingsChanged, true);
  assert.equal(diff.settingsValue.currency, 'SAR');
});

test('identical settings do not report a change', () => {
  const diff = diffData(data(), data());
  assert.equal(diff.settingsChanged, false);
});

test('removing every record deletes every id', () => {
  const before = data();
  const after = data({ sessions: [], patients: [], treatmentTypes: [] });

  const diff = diffData(before, after);
  assert.deepEqual(diff.sessions.deleteIds.sort(), ['ses_1', 'ses_2']);
  assert.deepEqual(diff.patients.deleteIds, ['pat_1']);
  assert.deepEqual(diff.treatmentTypes.deleteIds, ['type_1']);
});

test('an unchanged session is not rewritten when another changes', () => {
  const before = data();
  const after = data({
    sessions: [session('ses_1', { paid: true }), session('ses_2')],
  });

  const diff = diffData(before, after);
  assert.equal(diff.sessions.upsert.length, 1);
  assert.equal(diff.sessions.upsert[0].id, 'ses_1');
});

test('session rows round-trip through the mapper', () => {
  const original = session('ses_1', { notes: 'Follow-up', paid: true });
  assert.deepEqual(rowToSession(sessionToRow(original)), original);
});

test('an absent optional note round-trips as undefined, not null', () => {
  const original = session('ses_1');
  assert.equal(original.notes, undefined);
  assert.equal(rowToSession(sessionToRow(original)).notes, undefined);
});

test('paid false round-trips through the integer column', () => {
  const original = session('ses_1', { paid: false });
  const row = sessionToRow(original);
  assert.equal(row.paid, 0);
  assert.equal(rowToSession(row).paid, false);
});

test('a zero price is preserved and not treated as missing', () => {
  const original = session('ses_1', { price: 0 });
  assert.equal(rowToSession(sessionToRow(original)).price, 0);
});

test('patient rows round-trip with and without contact details', () => {
  const full = patient('pat_1', { phone: '+966 55 000 0000', email: 'a@b.com', notes: 'VIP' });
  assert.deepEqual(rowToPatient(patientToRow(full)), full);

  const bare = patient('pat_2');
  assert.deepEqual(rowToPatient(patientToRow(bare)), bare);
});

test('treatment type rows round-trip', () => {
  const original = type('type_1', { defaultDurationMinutes: 45, defaultPrice: 0 });
  assert.deepEqual(rowToTreatmentType(treatmentTypeToRow(original)), original);
});

test('settings rows round-trip', () => {
  const original = { clinicName: 'Hanin', currency: 'SAR', locale: 'ar' };
  assert.deepEqual(rowToSettings(settingsToRow(original)), original);
});
