import type { FormEvent } from 'react';
import { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { AuroraBackground } from '@/components/layout/AuroraBackground';
import { BrandLockup } from '@/components/ui/Brand';
import { Button } from '@/components/ui/Button';
import { SuccessAlert, ValidationAlert } from '@/components/ui/ValidationAlert';
import { Input, Label } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { ApiError } from '@/lib/api';
import {
  forgotPasswordApi,
  resetPasswordApi,
  verifyOtpApi,
} from '@/lib/auth-api';
import { useAuth } from '@/stores/useStore';

type Step = 'request' | 'verify' | 'reset' | 'done';

export function ForgotPasswordPage() {
  const { selectedCompania, user, isHydrating } = useAuth();

  const [step, setStep] = useState<Step>('request');
  const [identifier, setIdentifier] = useState('');
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  if (isHydrating) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/app" replace />;
  }

  if (!selectedCompania) {
    return <Navigate to="/" replace />;
  }

  const handleRequestOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!identifier.trim()) {
      setError('Ingrese su usuario o correo electrónico.');
      return;
    }

    setLoading(true);
    try {
      await forgotPasswordApi({
        companiaId: selectedCompania.id,
        identifier: identifier.trim(),
      });
      setSuccess('Se ha enviado un código de verificación a su correo electrónico.');
      setStep('verify');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo enviar el código. Verifique sus datos e intente de nuevo.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (codigo.trim().length !== 6) {
      setError('El código debe tener 6 dígitos.');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyOtpApi({
        companiaId: selectedCompania.id,
        identifier: identifier.trim(),
        codigo: codigo.trim(),
      });
      setOtpToken(result.token);
      setSuccess('Código verificado correctamente.');
      setStep('reset');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'El código ingresado no es válido o ha expirado.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

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
      const result = await resetPasswordApi({
        token: otpToken,
        password,
      });
      setUsername(result.username);
      setSuccess(result.mensaje);
      setStep('done');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo actualizar la contraseña. Intente de nuevo.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackToRequest = () => {
    setStep('request');
    setCodigo('');
    setOtpToken('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  };

  const steps = ['Solicitar código', 'Verificar código', 'Nueva contraseña'];
  const currentStepIndex = step === 'request' ? 0 : step === 'verify' ? 1 : step === 'reset' ? 2 : 3;

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
              Recuperar contraseña
            </h1>
            <p className="section-subtitle mt-1">{selectedCompania.nombre}</p>
          </div>

          {step !== 'done' && (
            <div className="mb-8 flex items-center justify-center gap-1">
              {steps.map((label, idx) => (
                <div key={label} className="flex items-center gap-1">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${
                      idx < currentStepIndex
                        ? 'bg-secondary text-white'
                        : idx === currentStepIndex
                          ? 'bg-primary text-white'
                          : 'bg-neutral-200 text-neutral-500'
                    }`}
                  >
                    {idx < currentStepIndex ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  {idx < steps.length - 1 && (
                    <div
                      className={`h-px w-6 ${
                        idx < currentStepIndex ? 'bg-secondary' : 'bg-neutral-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {step === 'request' && (
            <form onSubmit={(e) => void handleRequestOtp(e)} className="flex flex-col gap-5">
              <p className="text-center text-[13px] text-on-surface-variant">
                Ingrese el usuario o correo de una cuenta activa para recibir un código de
                verificación.
              </p>

              <div>
                <Label htmlFor="identifier">Usuario o correo electrónico</Label>
                <Input
                  id="identifier"
                  placeholder="usuario o correo@ejemplo.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>

              {error && <ValidationAlert messages={error} />}
              {success && <SuccessAlert messages={success} title="" />}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Mail size={16} />
                )}
                {loading ? 'Enviando…' : 'Enviar código'}
              </Button>
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={(e) => void handleVerifyOtp(e)} className="flex flex-col gap-5">
              <p className="text-center text-[13px] text-on-surface-variant">
                Ingrese el código de 6 dígitos enviado a su correo electrónico.
              </p>

              <div>
                <Label htmlFor="codigo">Código de verificación</Label>
                <Input
                  id="codigo"
                  placeholder="000000"
                  value={codigo}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 6) setCodigo(val);
                  }}
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="text-center text-lg tracking-[0.5em]"
                  required
                />
              </div>

              {error && <ValidationAlert messages={error} />}
              {success && <SuccessAlert messages={success} title="" />}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ShieldCheck size={16} />
                )}
                {loading ? 'Verificando…' : 'Verificar código'}
              </Button>

              <button
                type="button"
                onClick={handleBackToRequest}
                className="text-center text-[12px] text-secondary underline underline-offset-2 hover:text-primary"
              >
                ¿No recibiste el código? Volver a enviar
              </button>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={(e) => void handleResetPassword(e)} className="flex flex-col gap-5">
              <p className="text-center text-[13px] text-on-surface-variant">
                Defina su nueva contraseña.
              </p>

              <div>
                <Label htmlFor="password">Nueva contraseña</Label>
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
              {success && <SuccessAlert messages={success} title="" />}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <KeyRound size={16} />
                )}
                {loading ? 'Actualizando…' : 'Actualizar contraseña'}
              </Button>
            </form>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center gap-5 text-center">
              <div className="rounded-full bg-success-container p-4">
                <CheckCircle2 size={40} className="text-secondary" />
              </div>
              <h2 className="text-lg font-bold text-primary">
                Contraseña actualizada
              </h2>
              <p className="text-[13px] text-on-surface-variant">{success}</p>
              {username && (
                <p className="text-[13px] text-on-surface-variant">
                  Su usuario es{' '}
                  <span className="font-semibold">@{username}</span>
                </p>
              )}
              <Link
                to="/login"
                className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 text-[13px] font-semibold"
              >
                <ArrowLeft size={16} />
                Ir a iniciar sesión
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
