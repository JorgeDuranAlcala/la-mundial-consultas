import { useAuth } from '@/stores/useStore';

export function useAdminCompaniaId(): number | null {
  const selectedCompania = useAuth((s) => s.selectedCompania);
  const user = useAuth((s) => s.user);
  const id = Number(user?.companiaId ?? selectedCompania?.id ?? 0);
  return id > 0 ? id : null;
}
