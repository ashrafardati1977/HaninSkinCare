import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from './types';

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
