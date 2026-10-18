import assert from 'node:assert/strict';
import test from 'node:test';

import type { AppData, Patient, Session, TreatmentType } from '../src/types';
import {
  applyImport,
  describeImport,
  parseBackup,
  serialiseBackup,
} from '../src/storage/backup';

const SETTINGS = { clinicName: 'Hanin Skincare', currency: 'USD', locale: 'en' };

function session(id: string, overrides: Partial<Session> = {}): Session {
  return {
    id,
    patientId: 'pat_1',
    patientName: 'Layla Al-Harbi',
    typeId: 'type_1',
    typeName: 'HydraFacial',
    startAt: '2026-10-18T10:00:00.000Z',
    endAt: '2026-10-18T11:00:00.000Z',
    price: 150,
    paid: false,
    createdAt: '2026-10-18T09:00:00.000Z',
    updatedAt: '2026-10-18T09:00:00.000Z',
    ...overrides,
  };
}

function patient(id: string, overrides: Partial<Patient> = {}): Patient {
  return { id, name: 'Layla Al-Harbi', createdAt: '2026-10-18T09:00:00.000Z', ...overrides };
}

const TYPE: TreatmentType = {
  id: 'type_1',
  name: 'HydraFacial',
  defaultPrice: 150,
  defaultDurationMinutes: 60,
  color: '#B8446A',
};

function data(partial: Partial<AppData> = {}): AppData {
  return {
    sessions: [],
    patients: [],
    treatmentTypes: [TYPE],
    settings: { ...SETTINGS },
    ...partial,
  };
}

test('round-trips through serialise and parse', () => {
  const original = data({ sessions: [session('ses_1')], patients: [patient('pat_1')] });
  const restored = parseBackup(serialiseBackup(original));
  assert.deepEqual(restored.sessions, original.sessions);
  assert.deepEqual(restored.patients, original.patients);
});

test('parseBackup accepts a bare AppData object without the envelope', () => {
  const restored = parseBackup(JSON.stringify(data({ sessions: [session('ses_1')] })));
  assert.equal(restored.sessions.length, 1);
});

test('parseBackup rejects malformed JSON with a readable message', () => {
  assert.throws(() => parseBackup('{not json'), /not valid JSON/);
});

test('parseBackup rejects a file with no usable records', () => {
  assert.throws(
    () => parseBackup(JSON.stringify({ format: 'hanin-skincare-backup', version: 1, data: {} })),
    /does not contain any sessions or patients/,
  );
});

test('parseBackup drops records that fail validation but keeps the good ones', () => {
  const raw = JSON.stringify({
    format: 'hanin-skincare-backup',
    version: 1,
    data: {
      sessions: [session('ses_good'), { id: 'ses_bad', patientName: 'X' }],
      patients: [patient('pat_1')],
      treatmentTypes: [TYPE],
      settings: SETTINGS,
    },
  });
  const restored = parseBackup(raw);
  assert.deepEqual(restored.sessions.map((s) => s.id), ['ses_good']);
});

test('merge adds records that are not already present', () => {
  const current = data({ sessions: [session('ses_1')], patients: [patient('pat_1')] });
  const incoming = data({ sessions: [session('ses_2')], patients: [patient('pat_1')] });

  const { data: merged, summary } = applyImport(current, incoming, 'merge');

  assert.equal(merged.sessions.length, 2);
  assert.equal(summary.sessionsAdded, 1);
  assert.equal(summary.patientsAdded, 0);
});

test('merge keeps the newer copy of a record that exists on both sides', () => {
  const current = data({
    sessions: [session('ses_1', { price: 150, updatedAt: '2026-10-18T09:00:00.000Z' })],
  });
  const incoming = data({
    sessions: [session('ses_1', { price: 200, updatedAt: '2026-10-19T09:00:00.000Z' })],
  });

  const { data: merged, summary } = applyImport(current, incoming, 'merge');

  assert.equal(merged.sessions.length, 1);
  assert.equal(merged.sessions[0].price, 200, 'the newer edit should win');
  assert.equal(summary.sessionsUpdated, 1);
});

test('merge does not let an older backup overwrite a newer local edit', () => {
  const current = data({
    sessions: [session('ses_1', { price: 200, updatedAt: '2026-10-19T09:00:00.000Z' })],
  });
  const incoming = data({
    sessions: [session('ses_1', { price: 150, updatedAt: '2026-10-18T09:00:00.000Z' })],
  });

  const { data: merged } = applyImport(current, incoming, 'merge');

  assert.equal(merged.sessions[0].price, 200, 'stale backup must not win');
});

test('merge never deletes local records that are absent from the backup', () => {
  const current = data({ sessions: [session('ses_1'), session('ses_2')] });
  const incoming = data({ sessions: [session('ses_3')] });

  const { data: merged } = applyImport(current, incoming, 'merge');

  assert.deepEqual(
    merged.sessions.map((s) => s.id).sort(),
    ['ses_1', 'ses_2', 'ses_3'],
  );
});

test('merge keeps the local clinic identity rather than the backup one', () => {
  const current = data({ settings: { ...SETTINGS, clinicName: 'This Clinic', currency: 'USD' } });
  const incoming = data({
    sessions: [session('ses_1')],
    settings: { ...SETTINGS, clinicName: 'Other Clinic' },
  });

  const { data: merged } = applyImport(current, incoming, 'merge');

  assert.equal(merged.settings.clinicName, 'This Clinic');
});

test('replace discards local data entirely', () => {
  const current = data({ sessions: [session('ses_1')], patients: [patient('pat_1')] });
  const incoming = data({ sessions: [session('ses_9')], patients: [patient('pat_9')] });

  const { data: replaced, summary } = applyImport(current, incoming, 'replace');

  assert.deepEqual(replaced.sessions.map((s) => s.id), ['ses_9']);
  assert.deepEqual(replaced.patients.map((p) => p.id), ['pat_9']);
  assert.equal(summary.mode, 'replace');
});

test('merging an empty backup leaves existing data untouched', () => {
  const current = data({ sessions: [session('ses_1')], patients: [patient('pat_1')] });
  const { data: merged, summary } = applyImport(current, data(), 'merge');

  assert.equal(merged.sessions.length, 1);
  assert.equal(merged.patients.length, 1);
  assert.equal(summary.sessionsAdded, 0);
});

test('merge handles records with no timestamps without losing either copy', () => {
  const noStamp = {
    ...session('ses_1'),
    updatedAt: undefined,
    createdAt: undefined,
  } as unknown as Session;
  const current = data({ sessions: [noStamp] });
  const incoming = data({ sessions: [session('ses_1', { price: 300 })] });

  const { data: merged } = applyImport(current, incoming, 'merge');

  assert.equal(merged.sessions.length, 1);
});

test('describeImport reports counts the user can act on', () => {
  const summary = applyImport(data(), data({ sessions: [session('ses_1')] }), 'merge').summary;
  assert.match(describeImport(summary), /1 new sessions/);
});

test('a backup containing only patients is accepted', () => {
  const restored = parseBackup(
    JSON.stringify({
      format: 'hanin-skincare-backup',
      version: 1,
      data: { patients: [patient('pat_1')] },
    }),
  );
  assert.equal(restored.patients.length, 1);
});
