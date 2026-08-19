import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, LogIn, Loader2, UserPlus } from 'lucide-react';
import { AuroraBackground } from '@/components/layout/AuroraBackground';
import { BrandLockup } from '@/components/ui/Brand';
import { Button } from '@/components/ui/Button';
import { ValidationAlert } from '@/components/ui/ValidationAlert';
import { Input, Label, Select } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { ApiError } from '@/lib/api';
import { DEMO_CREDENTIALS, homePathForRole } from '@/lib/roles';
import { consumeSessionExpiredMessage } from '@/lib/session-timeout';
import type { UserRole } from '@/lib/types';
import { useAuth } from '@/stores/useStore';

export function LoginPage() {
  const { selectedCompania, login, user, isHydrating } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('asegurado.demo');
  const [password, setPassword] = useState('demo123');
  const [role, setRole] = useState<UserRole>('asegurado');
  const [error, setError] = useState('');
  const [sessionExpired] = useState(() => consumeSessionExpiredMessage());
  const [loading, setLoading] = useState(false);

  const compania = selectedCompania;
  const demo = DEMO_CREDENTIALS[role];

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
  if (!selectedCompania) return <Navigate to="/" replace />;

  const handleRoleChange = (nextRole: UserRole) => {
    setRole(nextRole);
    const creds = DEMO_CREDENTIALS[nextRole];
    setUsername(creds.username);
    setPassword(creds.password);
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const path = await login(username.trim(), password, role);
      if (!path) {
        setError('Selecciona una empresa antes de iniciar sesión');
        return;
      }
      navigate(path);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('No se pudo conectar con el servidor. Verifica que el backend esté activo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-5">
      <AuroraBackground />

      <div className="relative z-10 w-full max-w-[420px] step-enter">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-[13px] font-medium text-on-surface-variant transition-colors hover:text-primary"
        >
          <ArrowLeft size={16} />
          Cambiar empresa
        </Link>

        <div className="surface-card p-8 md:p-10">
          <div className="mb-8 flex flex-col items-center text-center">
            <BrandLockup size="md" tone="dark" logoSize={44} />
            <h1 className="mt-4 text-[1.5rem] font-bold tracking-tight text-primary">Iniciar sesión</h1>
            <p className="section-subtitle mt-1">{compania?.nombre}</p>
            <p className="mt-1 text-[11px] text-on-surface-variant">Portal de consultas La Mundial</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {sessionExpired && (
              <div
                role="alert"
                className="flex gap-3 rounded-xl border border-accent/40 bg-accent-container/60 px-4 py-3 text-on-surface"
              >
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-accent-dark" aria-hidden />
                <div>
                  <p className="text-[13px] font-bold">Sesión expirada</p>
                  <p className="mt-1 text-[13px] leading-snug text-on-surface-variant">
                    Su sesión se cerró automáticamente tras 5 minutos sin actividad. Inicie sesión
                    nuevamente para continuar.
                  </p>
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="role">Tipo de acceso</Label>
              <Select
                id="role"
                value={role}
                onChange={(e) => handleRoleChange(e.target.value as UserRole)}
              >
                <option value="clinica">Proveedor de servicios</option>
                <option value="asegurado">Asegurado</option>
              </Select>
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
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Link
                  to="/recuperar-contrasena"
                  className="text-[12px] font-medium text-secondary hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error && (
              <ValidationAlert
                title="No puede ingresar hasta completar lo siguiente"
                messages={error}
              />
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
              {loading ? 'Verificando…' : 'Ingresar al portal'}
            </Button>

            <Link to="/signup" className="w-full">
              <Button type="button" variant="outline" className="w-full">
                <UserPlus size={16} />
                Regístrate
              </Button>
            </Link>
          </form>

          <p className="mt-5 text-center text-[11px] text-on-surface-variant/80">
            Demo {demo.hint}: <span className="font-mono">{demo.username}</span> /{' '}
            <span className="font-mono">{demo.password}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
