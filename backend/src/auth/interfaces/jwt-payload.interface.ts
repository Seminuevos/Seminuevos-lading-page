export type AgencyRole = 'admin' | 'super_admin' | 'sales' | 'credit' | 'mechanic';

export interface JwtPayload {
  sub: string;
  email: string;
  role: AgencyRole;
  full_name: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: AgencyRole;
  full_name: string;
}
