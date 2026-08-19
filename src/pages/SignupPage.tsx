import type { FormEvent } from 'react';
import { useState } from 'react';
import { ArrowLeft, Loader2, Search, UserPlus } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AuroraBackground } from '@/components/layout/AuroraBackground';
import { BrandLockup } from '@/components/ui/Brand';
import { Button } from '@/components/ui/Button';
import { ValidationAlert } from '@/components/ui/ValidationAlert';
import { CedulaInput } from '@/components/ui/CedulaInput';
import { Input, Label, Select } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { ApiError } from '@/lib/api';
import {
  signupPortalApi,
  verificarSignup,
  type PerfilAsegurado,
  type SignupDocumentoPayload,
  type SignupPortalTipo,
  type SignupVerificacionResponse,
} from '@/lib/auth-api';
import { parseDocumentForRms } from '@/lib/cedula.util';
import { homePathForRole } from '@/lib/roles';
import type { UserRole } from '@/lib/types';
import { useAuth } from '@/stores/useStore';

const SIGNUP_OPTIONS: Array<{
  tipo: SignupPortalTipo;
  label: string;
  portalRole: UserRole;
  description: string;
}> = [
  {
    tipo: 'ASEGURADO',
    label: 'Asegurado',
    portalRole: 'asegurado',
    description: 'Cliente con póliza registrado en La Mundial',
  },
  {
    tipo: 'PROVEEDOR_SERVICIOS',
    label: 'Proveedor de servicios',
    portalRole: 'clinica',
    description: 'Clínica, farmacia u otro proveedor en La Mundial',
  },
];

type SignupStep = 'perfil' | 'titular' | 'beneficiario' | 'credenciales';

function portalRoleForTipo(tipo: SignupPortalTipo): UserRole {
  return SIGNUP_OPTIONS.find((option) => option.tipo === tipo)?.portalRole ?? 'asegurado';
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function stepLabel(step: SignupStep, isBeneficiario: boolean): string {
  if (step === 'perfil') return 'Tipo de cuenta';
  if (step === 'titular') {
    return isBeneficiario
      ? 'Cédula del asegurado titular'
      : 'Cédula del asegurado titular';
  }
  if (step === 'beneficiario') return 'Cédula del beneficiario';
  return 'Correo y contraseña';
}

export function SignupPage() {
  const navigate = useNavigate();
  const { selectedCompania, user, isHydrating, establishSession } = useAuth();

  const [tipo, setTipo] = useState<SignupPortalTipo>('ASEGURADO');
  const [perfilAsegurado, setPerfilAsegurado] = useState<PerfilAsegurado>('TITULAR');
  const [step, setStep] = useState<SignupStep>('perfil');
  const [titularDocumentInput, setTitularDocumentInput] = useState('');
  const [documentInput, setDocumentInput] = useState('');
  const [titularVerified, setTitularVerified] = useState(false);
  const [titularNombre, setTitularNombre] = useState('');
  const [verification, setVerification] = useState<SignupVerificacionResponse | null>(null);
  const [documentPayload, setDocumentPayload] = useState<SignupDocumentoPayload | null>(null);

  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedOption = SIGNUP_OPTIONS.find((option) => option.tipo === tipo)!;
  const isAsegurado = tipo === 'ASEGURADO';
  const isBeneficiario = isAsegurado && perfilAsegurado === 'BENEFICIARIO';

  if (isHydrating) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }

  if (!selectedCompania) {
    return <Navigate to="/" replace />;
  }

  const resetAfterPerfil = () => {
    setStep('perfil');
    setTitularVerified(false);
    setTitularNombre('');
    setVerification(null);
    setDocumentPayload(null);
    setError('');
    setEmail('');
    setConfirmEmail('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleTipoChange = (nextTipo: SignupPortalTipo) => {
    setTipo(nextTipo);
    setPerfilAsegurado('TITULAR');
    setTitularDocumentInput('');
    setDocumentInput('');
    resetAfterPerfil();
  };

  const handlePerfilChange = (next: PerfilAsegurado) => {
    setPerfilAsegurado(next);
    setTitularDocumentInput('');
    setDocumentInput('');
    resetAfterPerfil();
  };

  const goToDocumentStep = () => {
    setError('');
    if (isAsegurado && perfilAsegurado === 'BENEFICIARIO') {
      setStep('titular');
      return;
    }
    // Titular o proveedor: un solo documento
    setStep('titular');
  };

  /** i. Beneficiario / Titular: validar cédula del asegurado titular. */
  const handleVerifyTitular = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (isBeneficiario) {
      const parsedTitular = parseDocumentForRms(titularDocumentInput);
      if (!parsedTitular) {
        setError('Ingrese el número de cédula del asegurado titular.');
        return;
      }

      setLoading(true);
      try {
        // Valida existencia del titular antes de pedir cédula del beneficiario.
        const result = await verificarSignup({
          companiaId: selectedCompania.id,
          tipo: 'ASEGURADO',
          perfilAsegurado: 'TITULAR',
          nacionalidad: parsedTitular.nacionalidad,
          cedrif: parsedTitular.cedrif,
          correlativo: 0,
        });
        setTitularVerified(true);
        setTitularNombre(result.identidad.nombreCompleto);
        setDocumentInput('');
        setVerification(null);
        setDocumentPayload(null);
        setStep('beneficiario');
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : 'No se encontró el asegurado titular. Verifique la cédula.',
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    // Titular o proveedor: verificar y pasar a credenciales.
    const parsed = parseDocumentForRms(documentInput);
    if (!parsed) {
      setError(
        isAsegurado
          ? 'Ingrese el número de cédula del asegurado titular.'
          : 'Ingrese una cédula o RIF válido (ej. V-12345678).',
      );
      return;
    }

    const payload: SignupDocumentoPayload = isAsegurado
      ? {
          companiaId: selectedCompania.id,
          tipo,
          perfilAsegurado: 'TITULAR',
          nacionalidad: parsed.nacionalidad,
          cedrif: parsed.cedrif,
          correlativo: 0,
        }
      : {
          companiaId: selectedCompania.id,
          tipo,
          nacionalidad: parsed.nacionalidad,
          cedrif: parsed.cedrif,
          correlativo: parsed.correlativo,
        };

    setLoading(true);
    try {
      const result = await verificarSignup(payload);
      setVerification(result);
      setDocumentPayload(payload);
      setEmail(result.identidad.email?.trim() || '');
      setConfirmEmail(result.identidad.email?.trim() || '');
      setUsername(
        result.identidad.nombreCompleto
          .toLowerCase()
          .replace(/\s+/g, '.')
          .replace(/[^a-z0-9.]/g, '') ||
          `${payload.nacionalidad.toLowerCase()}${payload.cedrif}`,
      );
      setStep('credenciales');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se encontró la cédula en La Mundial para el tipo de cuenta seleccionado.',
      );
    } finally {
      setLoading(false);
    }
  };

  /** ii. Beneficiario: tras titular válido, solicitar y verificar cédula del beneficiario. */
  const handleVerifyBeneficiario = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!titularVerified) {
      setError('Debe verificar primero la cédula del asegurado titular.');
      setStep('titular');
      return;
    }

    const parsedTitular = parseDocumentForRms(titularDocumentInput);
    const parsedBenef = parseDocumentForRms(documentInput);
    if (!parsedTitular) {
      setError('Ingrese el número de cédula del asegurado titular.');
      setStep('titular');
      return;
    }
    if (!parsedBenef) {
      setError('Ingrese el número de cédula del beneficiario.');
      return;
    }

    const payload: SignupDocumentoPayload = {
      companiaId: selectedCompania.id,
      tipo: 'ASEGURADO',
      perfilAsegurado: 'BENEFICIARIO',
      nacionalidad: parsedBenef.nacionalidad,
      cedrif: parsedBenef.cedrif,
      correlativo: 0,
      titularNacionalidad: parsedTitular.nacionalidad,
      titularCedrif: parsedTitular.cedrif,
    };

    setLoading(true);
    try {
      const result = await verificarSignup(payload);
      setVerification(result);
      setDocumentPayload(payload);
      setEmail(result.identidad.email?.trim() || '');
      setConfirmEmail(result.identidad.email?.trim() || '');
      setUsername(
        result.identidad.nombreCompleto
          .toLowerCase()
          .replace(/\s+/g, '.')
          .replace(/[^a-z0-9.]/g, '') ||
          `${payload.nacionalidad.toLowerCase()}${payload.cedrif}`,
      );
      setStep('credenciales');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se encontró el beneficiario. Verifique la cédula.',
      );
    } finally {
      setLoading(false);
    }
  };

  /** iii. Crear usuario con correo validado y contraseña. */
  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!documentPayload || !verification) {
      setError('Debe verificar su cédula antes de crear la cuenta.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Ingrese un correo electrónico válido.');
      return;
    }
    if (email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
      setError('El correo electrónico y su confirmación no coinciden.');
      return;
    }
    if (!username.trim()) {
      setError('Ingrese un nombre de usuario.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const { token, user: apiUser } = await signupPortalApi({
        ...documentPayload,
        email: email.trim().toLowerCase(),
        confirmEmail: confirmEmail.trim().toLowerCase(),
        username: username.trim().toLowerCase(),
        password,
      });

      const path = establishSession(token, apiUser, portalRoleForTipo(documentPayload.tipo));
      if (!path) {
        setError('Cuenta creada, pero no se pudo iniciar sesión automáticamente.');
        return;
      }
      navigate(path);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  const verifiedLabel = (() => {
    if (tipo === 'PROVEEDOR_SERVICIOS') return 'Proveedor verificado en La Mundial';
    if (verification?.perfilAsegurado === 'BENEFICIARIO' || perfilAsegurado === 'BENEFICIARIO') {
      return 'Beneficiario verificado en La Mundial';
    }
    return 'Asegurado titular verificado en La Mundial';
  })();

  const totalSteps = isBeneficiario ? 4 : 3;
  const currentStepNumber =
    step === 'perfil'
      ? 1
      : step === 'titular'
        ? 2
        : step === 'beneficiario'
          ? 3
          : isBeneficiario
            ? 4
            : 3;

  return (
    <div className="relative flex min-h-screen items-center justify-center p-5">
      <AuroraBackground />

      <div className="relative z-10 w-full max-w-[480px] step-enter">
        <Link
          to="/login"
          className="mb-6 inline-flex items-center gap-2 text-[13px] font-medium text-on-surface-variant transition-colors hover:text-primary"
        >
          <ArrowLeft size={16} />
          Volver al login
        </Link>

        <div className="surface-card p-8 md:p-10">
          <div className="mb-8 flex flex-col items-center text-center">
            <BrandLockup size="md" tone="dark" logoSize={44} />
            <h1 className="mt-4 text-[1.5rem] font-bold tracking-tight text-primary">
              Regístrate
            </h1>
            <p className="section-subtitle mt-1">{selectedCompania.nombre}</p>
            <p className="mt-1 text-[11px] text-on-surface-variant">
              Paso {currentStepNumber} de {totalSteps} · {stepLabel(step, isBeneficiario)}
            </p>
          </div>

          {step === 'perfil' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                goToDocumentStep();
              }}
              className="flex flex-col gap-5"
            >
              <div>
                <Label htmlFor="tipo">Tipo de cuenta</Label>
                <Select
                  id="tipo"
                  value={tipo}
                  onChange={(e) => handleTipoChange(e.target.value as SignupPortalTipo)}
                >
                  {SIGNUP_OPTIONS.map((option) => (
                    <option key={option.tipo} value={option.tipo}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <p className="mt-1.5 text-[12px] text-on-surface-variant">
                  {selectedOption.description}
                </p>
              </div>

              {isAsegurado && (
                <div>
                  <Label htmlFor="perfilAsegurado">Perfil del asegurado</Label>
                  <Select
                    id="perfilAsegurado"
                    value={perfilAsegurado}
                    onChange={(e) => handlePerfilChange(e.target.value as PerfilAsegurado)}
                  >
                    <option value="TITULAR">Soy el asegurado titular</option>
                    <option value="BENEFICIARIO">Soy beneficiario de la póliza</option>
                  </Select>
                  <p className="mt-1.5 text-[12px] text-on-surface-variant">
                    {perfilAsegurado === 'TITULAR'
                      ? 'Se solicitará su cédula como titular y luego correo y contraseña.'
                      : 'Primero se valida al titular, luego la cédula del beneficiario, y finalmente correo y contraseña.'}
                  </p>
                </div>
              )}

              {error && <ValidationAlert messages={error} />}

              <Button type="submit" className="w-full">
                Continuar
              </Button>
            </form>
          )}

          {step === 'titular' && (
            <form onSubmit={(e) => void handleVerifyTitular(e)} className="flex flex-col gap-5">
              {isBeneficiario ? (
                <div>
                  <Label htmlFor="titularDocument">Cédula del asegurado titular</Label>
                  <CedulaInput
                    id="titularDocument"
                    placeholder="12345678"
                    value={titularDocumentInput}
                    onChange={setTitularDocumentInput}
                    required
                  />
                  <p className="mt-1.5 text-[12px] text-on-surface-variant">
                    Solo el número. El tipo (V/E) y correlativo 0 se aplican automáticamente.
                  </p>
                </div>
              ) : isAsegurado ? (
                <div>
                  <Label htmlFor="document">Cédula del asegurado titular</Label>
                  <CedulaInput
                    id="document"
                    placeholder="12345678"
                    value={documentInput}
                    onChange={setDocumentInput}
                    required
                  />
                  <p className="mt-1.5 text-[12px] text-on-surface-variant">
                    Solo el número. El tipo (V/E) y correlativo 0 se aplican automáticamente.
                  </p>
                </div>
              ) : (
                <div>
                  <Label htmlFor="document">Cédula de identidad o RIF</Label>
                  <Input
                    id="document"
                    placeholder="V-12.345.678 o J-031225887-0"
                    value={documentInput}
                    onChange={(e) => setDocumentInput(e.target.value)}
                    required
                  />
                  <p className="mt-1.5 text-[12px] text-on-surface-variant">
                    Validaremos que exista en La Mundial como proveedor. Para RIF puede incluir el
                    correlativo (ej. J-031225887-0).
                  </p>
                </div>
              )}

              {error && <ValidationAlert messages={error} />}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                  onClick={() => {
                    setStep('perfil');
                    setError('');
                  }}
                >
                  Anterior
                </Button>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Search size={16} />
                  )}
                  {loading
                    ? 'Verificando…'
                    : isBeneficiario
                      ? 'Verificar titular'
                      : 'Verificar cédula'}
                </Button>
              </div>
            </form>
          )}

          {step === 'beneficiario' && (
            <form
              onSubmit={(e) => void handleVerifyBeneficiario(e)}
              className="flex flex-col gap-5"
            >
              <div className="rounded-2xl border border-success-container bg-success-container/60 p-4 text-[13px] text-on-success-container">
                <p className="font-bold">Asegurado titular verificado</p>
                {titularNombre && <p className="mt-1">{titularNombre}</p>}
                <p className="mt-1">Documento: {titularDocumentInput.trim()}</p>
              </div>

              <div>
                <Label htmlFor="benefDocument">Cédula del beneficiario</Label>
                <CedulaInput
                  id="benefDocument"
                  placeholder="12345678"
                  value={documentInput}
                  onChange={setDocumentInput}
                  required
                />
                <p className="mt-1.5 text-[12px] text-on-surface-variant">
                  Solo el número del beneficiario. El tipo (V/E) se aplica automáticamente.
                </p>
              </div>

              {error && <ValidationAlert messages={error} />}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                  onClick={() => {
                    setStep('titular');
                    setTitularVerified(false);
                    setTitularNombre('');
                    setError('');
                  }}
                >
                  Anterior
                </Button>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Search size={16} />
                  )}
                  {loading ? 'Verificando…' : 'Verificar beneficiario'}
                </Button>
              </div>
            </form>
          )}

          {step === 'credenciales' && verification && (
            <form onSubmit={(e) => void handleSignup(e)} className="flex flex-col gap-5">
              <div className="rounded-2xl border border-success-container bg-success-container/60 p-4 text-[13px] text-on-success-container">
                <p className="font-bold">{verifiedLabel}</p>
                <p className="mt-1">{verification.identidad.nombreCompleto}</p>
                <p className="mt-1">
                  Documento: {verification.identidad.nacionalidad}-{verification.identidad.cedrif}
                  {verification.identidad.correlativo !== '0'
                    ? `-${verification.identidad.correlativo}`
                    : ''}
                </p>
                {verification.identidad.numrif && (
                  <p className="mt-1">RIF: {verification.identidad.numrif}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <Label htmlFor="confirmEmail">Confirmar correo electrónico</Label>
                <Input
                  id="confirmEmail"
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
                <p className="mt-1.5 text-[12px] text-on-surface-variant">
                  Debe coincidir con el correo para validarlo.
                </p>
              </div>

              <div>
                <Label htmlFor="username">Usuario</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Contraseña</Label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <PasswordInput
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              {error && <ValidationAlert messages={error} />}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                  onClick={() => {
                    setStep(isBeneficiario ? 'beneficiario' : 'titular');
                    setError('');
                  }}
                >
                  Anterior
                </Button>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <UserPlus size={16} />
                  )}
                  {loading ? 'Creando cuenta…' : 'Crear cuenta'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
