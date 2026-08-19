import { apiFetch } from './api';

export interface AuthUserResponse {
  id: number;
  username: string;
  email?: string | null;
  nombreCompleto?: string | null;
  telefono?: string | null;
  proveedorId?: number | null;
  companiaId?: number | string | null;
  rmsSerialpersona?: string | null;
  activo?: boolean;
  ultimoAccesoEn?: string | null;
  roles: string[];
}

export function normalizeAuthUser(user: AuthUserResponse): AuthUserResponse {
  return {
    ...user,
    id: Number(user.id),
    proveedorId: user.proveedorId != null ? Number(user.proveedorId) : null,
    companiaId: user.companiaId != null ? Number(user.companiaId) : null,
  };
}

export interface LoginResponse {
  token: string;
  user: AuthUserResponse;
}

export interface CompaniaResponse {
  id: number;
  codigo: string;
  nombre: string;
}

export async function loginApi(username: string, password: string): Promise<LoginResponse> {
  const res = await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }, { auth: false });
  return { ...res, user: normalizeAuthUser(res.user) };
}

export type SignupPortalTipo = 'ASEGURADO' | 'PROVEEDOR_SERVICIOS';
export type PerfilAsegurado = 'TITULAR' | 'BENEFICIARIO';

export interface SignupDocumentoPayload {
  companiaId: number;
  tipo: SignupPortalTipo;
  nacionalidad: string;
  cedrif: number;
  correlativo: number;
  perfilAsegurado?: PerfilAsegurado;
  titularNacionalidad?: string;
  titularCedrif?: number;
}

export interface SignupIdentidadResponse {
  serialpersona: string;
  nacionalidad: string;
  cedrif: string;
  correlativo: string;
  nombreCompleto: string;
  email: string | null;
  telefono: string | null;
  numrif: string | null;
}

export interface SignupVerificacionResponse {
  elegible: boolean;
  mensaje: string;
  tipo: SignupPortalTipo;
  perfilAsegurado?: PerfilAsegurado;
  identidad: SignupIdentidadResponse;
}

export interface SignupPortalPayload extends SignupDocumentoPayload {
  email: string;
  confirmEmail?: string;
  username: string;
  password: string;
}

export async function verificarSignup(
  payload: SignupDocumentoPayload,
): Promise<SignupVerificacionResponse> {
  return apiFetch<SignupVerificacionResponse>(
    '/auth/signup/verificar',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    { auth: false },
  );
}

export async function signupPortalApi(
  payload: SignupPortalPayload,
): Promise<LoginResponse> {
  const res = await apiFetch<LoginResponse>(
    '/auth/signup',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    { auth: false },
  );
  return { ...res, user: normalizeAuthUser(res.user) };
}

// ── Forgot password (step 1: request OTP) ──

export interface ForgotPasswordPayload {
  companiaId: number;
  identifier: string;
}

export interface ForgotPasswordResponse {
  mensaje: string;
}

export async function forgotPasswordApi(
  payload: ForgotPasswordPayload,
): Promise<ForgotPasswordResponse> {
  return apiFetch<ForgotPasswordResponse>(
    '/auth/password/forgot',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    { auth: false },
  );
}

// ── Verify OTP (step 2: validate code) ──

export interface VerifyOtpPayload {
  companiaId: number;
  identifier: string;
  codigo: string;
}

export interface VerifyOtpResponse {
  token: string;
}

export async function verifyOtpApi(
  payload: VerifyOtpPayload,
): Promise<VerifyOtpResponse> {
  return apiFetch<VerifyOtpResponse>(
    '/auth/password/verify-otp',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    { auth: false },
  );
}

// ── Reset password (step 3: set new password with JWT) ──

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export interface ResetPasswordResponse {
  mensaje: string;
  username: string;
}

export async function resetPasswordApi(
  payload: ResetPasswordPayload,
): Promise<ResetPasswordResponse> {
  return apiFetch<ResetPasswordResponse>(
    '/auth/password/reset',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    { auth: false },
  );
}

export async function meApi(): Promise<AuthUserResponse> {
  const user = await apiFetch<AuthUserResponse>('/auth/me');
  return normalizeAuthUser(user);
}

export async function fetchCompanias(): Promise<CompaniaResponse[]> {
  return apiFetch<CompaniaResponse[]>('/configuracion/companias?activo=true', {}, { auth: false });
}

export async function getPolizaCompleta(id: number) {
  return apiFetch<Record<string, unknown>>(`/polizas/${id}/completo`);
}
