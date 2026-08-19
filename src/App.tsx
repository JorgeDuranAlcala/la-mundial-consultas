import { Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ClientSelectorPage } from '@/pages/ClientSelectorPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ConsultaPage } from '@/pages/ConsultaPage';
import { useAuth } from '@/stores/useStore';
import type { UserRole } from '@/lib/types';

function AuthLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isHydrating } = useAuth();
  if (isHydrating) return <AuthLoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RoleRoute({
  allowed,
  children,
}: {
  allowed: UserRole[];
  children: React.ReactNode;
}) {
  const user = useAuth((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!allowed.includes(user.role)) {
    return <Navigate to="/app/consulta" replace />;
  }
  return <>{children}</>;
}

export function AppRouter() {
  const isHydrating = useAuth((s) => s.isHydrating);

  if (isHydrating) return <AuthLoadingScreen />;

  return (
    <Routes>
      <Route path="/" element={<ClientSelectorPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/recuperar-contrasena" element={<ForgotPasswordPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/app/consulta" replace />} />
        <Route
          path="consulta"
          element={
            <RoleRoute allowed={['asegurado', 'clinica']}>
              <ConsultaPage />
            </RoleRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
