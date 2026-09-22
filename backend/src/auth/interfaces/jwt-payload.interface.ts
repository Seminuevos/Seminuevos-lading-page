export type AgencyRole =
  | 'admin'
  | 'super_admin'
  | 'sales'
  | 'credit'
  | 'mechanic'
  | 'concesionario';

export interface JwtPayload {
  sub: string;
  email: string;
  role: AgencyRole;
  full_name: string;
  concesionario_id?: number | null;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: AgencyRole;
  full_name: string;
  concesionario_id?: number | null;
}
