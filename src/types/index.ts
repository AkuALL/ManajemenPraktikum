export * from './session';

export interface UserIdentity {
  role: import('./session').UserRole;
  userId: string;
  displayName: string;
  identifier?: string;
}
