import { AgencyRole } from '../../auth/interfaces/jwt-payload.interface';

export interface AgencyUserRecord {
  id: string;
  full_name: string;
  email: string;
  password_hash: string | null;
  phone: string | null;
  role: AgencyRole;
  branch: string | null;
  status: 'active' | 'inactive';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type SafeAgencyUser = Omit<AgencyUserRecord, 'password_hash'>;

export function toSafeUser(user: AgencyUserRecord): SafeAgencyUser {
  const { password_hash: _passwordHash, ...safe } = user;
  return safe;
}
