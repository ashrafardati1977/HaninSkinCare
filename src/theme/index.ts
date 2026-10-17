export const colors = {
  background: '#FDF7F5',
  surface: '#FFFFFF',
  surfaceMuted: '#F7EEF0',

  primary: '#B8446A',
  primaryDark: '#8E2F4F',
  primarySoft: '#FBE7EE',

  accent: '#6F8F7B',
  accentSoft: '#E7F0EA',

  text: '#2E2226',
  textMuted: '#8A7A80',
  textInverse: '#FFFFFF',

  border: '#EFE0E4',
  borderStrong: '#DFC8CF',

  danger: '#C0392B',
  dangerSoft: '#FBEAE8',
  warning: '#C77A21',
  warningSoft: '#FDF2E3',
  info: '#4A6FA5',
  infoSoft: '#E9EFF9',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 26,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 30, fontWeight: '700' as const, letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  heading: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.2 },
  caption: { fontSize: 12, fontWeight: '500' as const },
} as const;

export const shadow = {
  card: {
    shadowColor: '#8E2F4F',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
} as const;

export const CURRENCIES = [
  'SAR',
  'AED',
  'USD',
  'EUR',
  'GBP',
  'JOD',
  'EGP',
  'MAD',
  'TRY',
] as const;

export const DEFAULT_TREATMENT_TYPES = [
  { name: 'Facial Treatment', defaultPrice: 250, defaultDurationMinutes: 60, color: '#B8446A' },
  { name: 'HydraFacial', defaultPrice: 450, defaultDurationMinutes: 75, color: '#4A6FA5' },
  { name: 'Chemical Peel', defaultPrice: 350, defaultDurationMinutes: 45, color: '#C77A21' },
  { name: 'Laser Hair Removal', defaultPrice: 600, defaultDurationMinutes: 60, color: '#7A4AA5' },
  { name: 'Microneedling', defaultPrice: 550, defaultDurationMinutes: 90, color: '#2F8E7A' },
  { name: 'Acne Treatment', defaultPrice: 300, defaultDurationMinutes: 45, color: '#C0392B' },
  { name: 'Skin Consultation', defaultPrice: 100, defaultDurationMinutes: 30, color: '#6F8F7B' },
];
