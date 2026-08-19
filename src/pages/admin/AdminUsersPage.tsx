import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Search, UserPlus, Users } from 'lucide-react';
import { PaginatedDataView } from '@/components/PaginatedDataView';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ValidationAlert } from '@/components/ui/ValidationAlert';
import { Input, Label, Select } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { ApiError } from '@/lib/api';
import {
  verificarSignup,
  type SignupDocumentoPayload,
  type SignupIdentidadResponse,
} from '@/lib/auth-api';
import { parseDocumentForRms } from '@/lib/cedula.util';
import { useAuth } from '@/stores/useStore';
import { useAdminCompaniaId } from '@/pages/admin/useAdminCompaniaId';
import {
  createUsuario,
  fetchUsuarios,
  getUsuarioRoleCodes,
  PORTAL_ROLES,
  syncUsuarioPrimaryRole,
  updateUsuario,
  type UsuarioPortalApi,
} from '@/lib/usuarios-api';

interface UserFormState {
  username: string;
  password: string;
  nombreCompleto: string;
  email: string;
  telefono: string;
  rolCodigo: string;
  documento: string;
  perfilAsegurado: 'TITULAR' | 'BENEFICIARIO';
  documentoTitular: string;
}

const emptyForm = (): UserFormState => ({
  username: '',
  password: '',
  nombreCompleto: '',
  email: '',
  telefono: '',
  rolCodigo: 'ASEGURADO',
  documento: '',
  perfilAsegurado: 'TITULAR',
  documentoTitular: '',
});

function roleLabel(codigo: string): string {
  return PORTAL_ROLES.find((r) => r.codigo === codigo)?.label ?? codigo;
}

function roleRequiresRms(rolCodigo: string): boolean {
  return rolCodigo === 'ASEGURADO' || rolCodigo === 'PROVEEDOR_SERVICIOS';
}

function usernameFromIdentidad(identidad: SignupIdentidadResponse): string {
  return (
    identidad.nombreCompleto
      .toLowerCase()
      .replace(/\s+/g, '.')
      .replace(/[^a-z0-9.]/g, '') ||
    `${identidad.nacionalidad.toLowerCase()}${identidad.cedrif}`
  );
}

function matchesUserSearch(user: UsuarioPortalApi, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  const roles = getUsuarioRoleCodes(user)
    .map(roleLabel)
    .join(' ')
    .toLowerCase();
  const haystack = [
    user.username,
    user.nombreCompleto,
    user.email,
    user.telefono,
    roles,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export function AdminUsersPage() {
  const selectedCompania = useAuth((s) => s.selectedCompania);
  const companiaId = useAdminCompaniaId();

  const [users, setUsers] = useState<UsuarioPortalApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [search, setSearch] = useState('');
  const [verifyingRms, setVerifyingRms] = useState(false);
  const [rmsVerified, setRmsVerified] = useState(false);
  const [rmsIdentity, setRmsIdentity] = useState<SignupIdentidadResponse | null>(null);
  const [titularVerified, setTitularVerified] = useState(false);
  const [titularNombre, setTitularNombre] = useState('');
  const [formStep, setFormStep] = useState<1 | 2>(1);

  const isEditing = editingUserId != null;
  const requiresRms = !isEditing && roleRequiresRms(form.rolCodigo);
  const isBeneficiario =
    requiresRms &&
    form.rolCodigo === 'ASEGURADO' &&
    form.perfilAsegurado === 'BENEFICIARIO';

  const filteredUsers = useMemo(
    () => users.filter((u) => matchesUserSearch(u, search)),
    [users, search],
  );
  const loadUsers = useCallback(async () => {
    if (!companiaId) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchUsuarios(true);
      setUsers(rows.filter((u) => Number(u.companiaId) === companiaId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  }, [companiaId]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const openCreateForm = () => {
    setEditingUserId(null);
    setForm(emptyForm());
    clearRmsVerification();
    setFormStep(1);
    setShowForm(true);
    setError(null);
  };

  const openEditForm = (user: UsuarioPortalApi) => {
    const roles = getUsuarioRoleCodes(user);
    setEditingUserId(user.id);
    setForm({
      ...emptyForm(),
      username: user.username,
      password: '',
      nombreCompleto: user.nombreCompleto ?? '',
      email: user.email ?? '',
      telefono: user.telefono ?? '',
      rolCodigo: roles[0] ?? 'ASEGURADO',
    });
    clearRmsVerification();
    setFormStep(1);
    setShowForm(true);
    setError(null);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingUserId(null);
    setForm(emptyForm());
    clearRmsVerification();
    setFormStep(1);
  };

  const clearRmsVerification = () => {
    setVerifyingRms(false);
    setRmsVerified(false);
    setRmsIdentity(null);
    setTitularVerified(false);
    setTitularNombre('');
  };

  const applyIdentidad = (identidad: SignupIdentidadResponse) => {
    setForm((s) => ({
      ...s,
      username: usernameFromIdentidad(identidad),
      nombreCompleto: identidad.nombreCompleto,
      email: identidad.email?.trim() || s.email,
      telefono: identidad.telefono?.trim() || s.telefono,
    }));
  };

  const handleRmsSearch = async () => {
    setError(null);
    if (!companiaId) return;

    const parsed = parseDocumentForRms(form.documento);
    if (!parsed) {
      setError(
        form.rolCodigo === 'PROVEEDOR_SERVICIOS'
          ? 'Ingrese una cédula o RIF válido (ej. V-12345678).'
          : 'Ingrese una cédula válida (ej. V-12345678).',
      );
      return;
    }

    const payload: SignupDocumentoPayload =
      form.rolCodigo === 'PROVEEDOR_SERVICIOS'
        ? {
            companiaId,
            tipo: 'PROVEEDOR_SERVICIOS',
            nacionalidad: parsed.nacionalidad,
            cedrif: parsed.cedrif,
            correlativo: parsed.correlativo,
          }
        : {
            companiaId,
            tipo: 'ASEGURADO',
            perfilAsegurado: 'TITULAR',
            nacionalidad: parsed.nacionalidad,
            cedrif: parsed.cedrif,
            correlativo: 0,
          };

    setVerifyingRms(true);
    try {
      const result = await verificarSignup(payload);
      setRmsVerified(true);
      setRmsIdentity(result.identidad);
      applyIdentidad(result.identidad);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se encontró la cédula en RMS. Verifique e intente nuevamente.',
      );
    } finally {
      setVerifyingRms(false);
    }
  };

  const handleVerifyTitular = async () => {
    setError(null);
    if (!companiaId) return;

    const parsed = parseDocumentForRms(form.documentoTitular);
    if (!parsed) {
      setError('Ingrese la cédula del asegurado titular (ej. V-12345678).');
      return;
    }

    setVerifyingRms(true);
    try {
      const result = await verificarSignup({
        companiaId,
        tipo: 'ASEGURADO',
        perfilAsegurado: 'TITULAR',
        nacionalidad: parsed.nacionalidad,
        cedrif: parsed.cedrif,
        correlativo: 0,
      });
      setTitularVerified(true);
      setTitularNombre(result.identidad.nombreCompleto);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se encontró el asegurado titular. Verifique la cédula.',
      );
    } finally {
      setVerifyingRms(false);
    }
  };

  const handleVerifyBeneficiario = async () => {
    setError(null);
    if (!companiaId) return;

    if (!titularVerified) {
      setError('Debe verificar primero la cédula del asegurado titular.');
      return;
    }

    const parsedTitular = parseDocumentForRms(form.documentoTitular);
    const parsedBenef = parseDocumentForRms(form.documento);
    if (!parsedTitular || !parsedBenef) {
      setError('Ingrese la cédula del asegurado titular y del beneficiario.');
      return;
    }

    setVerifyingRms(true);
    try {
      const result = await verificarSignup({
        companiaId,
        tipo: 'ASEGURADO',
        perfilAsegurado: 'BENEFICIARIO',
        nacionalidad: parsedBenef.nacionalidad,
        cedrif: parsedBenef.cedrif,
        correlativo: 0,
        titularNacionalidad: parsedTitular.nacionalidad,
        titularCedrif: parsedTitular.cedrif,
      });
      setRmsVerified(true);
      setRmsIdentity(result.identidad);
      applyIdentidad(result.identidad);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se encontró el beneficiario. Verifique la cédula.',
      );
    } finally {
      setVerifyingRms(false);
    }
  };

  const handleSave = async () => {
    if (!companiaId) return;

    const validationErrors: string[] = [];
    if (!isEditing && !form.username.trim()) {
      validationErrors.push('El nombre de usuario es obligatorio');
    }
    if (!isEditing && form.password.length < 6) {
      validationErrors.push('La contraseña debe tener al menos 6 caracteres');
    }
    if (isEditing && form.password && form.password.length < 6) {
      validationErrors.push('La contraseña debe tener al menos 6 caracteres');
    }
    if (!form.rolCodigo) {
      validationErrors.push('Seleccione un rol');
    }

    let parsedDoc = null;
    let parsedTitular = null;
    if (requiresRms) {
      if (!rmsVerified) {
        validationErrors.push(
          'Debe buscar y verificar la cédula en RMS antes de crear el usuario',
        );
      }
      if (isBeneficiario) {
        parsedTitular = parseDocumentForRms(form.documentoTitular);
        if (!parsedTitular) {
          validationErrors.push(
            'Ingrese la cédula del asegurado titular (ej. V-12345678)',
          );
        }
      }
      parsedDoc = parseDocumentForRms(form.documento);
      if (!parsedDoc) {
        validationErrors.push(
          form.rolCodigo === 'ASEGURADO'
            ? isBeneficiario
              ? 'Ingrese la cédula del beneficiario (ej. V-12345678)'
              : 'Ingrese la cédula del asegurado (ej. V-12345678) para validar en RMS'
            : 'Ingrese la cédula o RIF del proveedor (ej. V-12345678) para validar en RMS',
        );
      }
    }

    if (validationErrors.length) {
      setError(validationErrors.join('\n'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (isEditing && editingUserId) {
        const user = users.find((u) => u.id === editingUserId);
        const currentRoles = user ? getUsuarioRoleCodes(user) : [];

        await updateUsuario(editingUserId, {
          nombreCompleto: form.nombreCompleto.trim() || undefined,
          email: form.email.trim() || undefined,
          telefono: form.telefono.trim() || undefined,
          ...(form.password ? { password: form.password } : {}),
        });

        await syncUsuarioPrimaryRole(editingUserId, currentRoles, form.rolCodigo);
      } else {
        await createUsuario({
          username: form.username.trim(),
          password: form.password,
          nombreCompleto: form.nombreCompleto.trim() || undefined,
          email: form.email.trim() || undefined,
          telefono: form.telefono.trim() || undefined,
          companiaId,
          roles: [form.rolCodigo],
          activo: true,
          ...(requiresRms && parsedDoc
            ? {
                nacionalidad: parsedDoc.nacionalidad,
                cedrif: parsedDoc.cedrif,
                correlativo:
                  form.rolCodigo === 'ASEGURADO' ? 0 : parsedDoc.correlativo,
                ...(form.rolCodigo === 'ASEGURADO'
                  ? {
                      perfilAsegurado: form.perfilAsegurado,
                      ...(isBeneficiario && parsedTitular
                        ? {
                            titularNacionalidad: parsedTitular.nacionalidad,
                            titularCedrif: parsedTitular.cedrif,
                          }
                        : {}),
                    }
                  : {}),
              }
            : {}),
        });
      }

      cancelForm();
      await loadUsers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEditing
            ? 'No se pudo actualizar el usuario'
            : 'No se pudo crear el usuario',
      );
    } finally {
      setSaving(false);
    }
  };

  if (!companiaId) {
    return (
      <div className="step-enter">
        <Card>
          <CardBody className="py-10 text-center text-on-surface-variant">
            No se encontró la compañía del administrador. Vuelva a iniciar sesión.
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="step-enter">
      <PageHeader
        title="Usuarios"
        subtitle={`Gestión de usuarios de ${selectedCompania?.nombre ?? 'la empresa'}`}
        icon={Users}
        breadcrumbs={[
          { label: 'Admin', to: '/app/admin' },
          { label: 'Usuarios' },
        ]}
        actions={
          <Button variant="accent" onClick={openCreateForm} disabled={saving}>
            <UserPlus size={16} />
            Nuevo usuario
          </Button>
        }
      />

      {error && (
        <ValidationAlert
          className="mb-4"
          title={
            error.includes('\n')
              ? 'No puede guardar hasta completar lo siguiente'
              : 'No se pudo completar la operación'
          }
          messages={error.includes('\n') ? error.split('\n') : error}
        />
      )}

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="section-title">
              {isEditing ? 'Editar usuario' : 'Nuevo usuario'}
            </h2>
            <p className="section-subtitle">
              {isEditing
                ? `Actualizando @${form.username}`
                : requiresRms
                  ? `Paso ${formStep} de 2 · ${
                      formStep === 1 ? 'Búsqueda en RMS' : 'Datos de acceso'
                    }`
                  : `Se creará en ${selectedCompania?.nombre ?? 'esta empresa'}`}
            </p>
          </CardHeader>
          <CardBody className="space-y-4">
            {requiresRms && formStep === 1 && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="user-role">Rol *</Label>
                    <Select
                      id="user-role"
                      value={form.rolCodigo}
                      onChange={(e) => {
                        clearRmsVerification();
                        setFormStep(1);
                        setForm((s) => ({
                          ...s,
                          rolCodigo: e.target.value,
                          documento: '',
                          documentoTitular: '',
                          perfilAsegurado: 'TITULAR',
                        }));
                      }}
                    >
                      {PORTAL_ROLES.map((rol) => (
                        <option key={rol.codigo} value={rol.codigo}>
                          {rol.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {form.rolCodigo === 'ASEGURADO' && (
                    <div>
                      <Label htmlFor="user-perfil">Perfil asegurado *</Label>
                      <Select
                        id="user-perfil"
                        value={form.perfilAsegurado}
                        onChange={(e) => {
                          clearRmsVerification();
                          setForm((s) => ({
                            ...s,
                            perfilAsegurado: e.target.value as 'TITULAR' | 'BENEFICIARIO',
                            documentoTitular: '',
                          }));
                        }}
                      >
                        <option value="TITULAR">Asegurado titular</option>
                        <option value="BENEFICIARIO">Beneficiario de la póliza</option>
                      </Select>
                    </div>
                  )}

                  {isBeneficiario && (
                    <div>
                      <Label htmlFor="user-doc-titular">
                        Cédula del asegurado titular *
                      </Label>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Input
                          id="user-doc-titular"
                          className="flex-1"
                          value={form.documentoTitular}
                          disabled={titularVerified}
                          onChange={(e) => {
                            setTitularVerified(false);
                            setTitularNombre('');
                            setForm((s) => ({ ...s, documentoTitular: e.target.value }));
                          }}
                          placeholder="V-12.345.678"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={
                            verifyingRms || titularVerified || !form.documentoTitular.trim()
                          }
                          onClick={() => void handleVerifyTitular()}
                        >
                          {verifyingRms ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search size={15} />
                          )}
                          {titularVerified ? 'Titular verificado' : 'Verificar titular'}
                        </Button>
                      </div>
                      {titularVerified && titularNombre && (
                        <p className="mt-1.5 text-[12px] text-success">
                          Titular verificado en RMS: {titularNombre}
                        </p>
                      )}
                    </div>
                  )}

                  <div className={isBeneficiario ? undefined : 'md:col-span-2'}>
                    <Label htmlFor="user-documento">
                      {form.rolCodigo === 'ASEGURADO'
                        ? isBeneficiario
                          ? 'Cédula del beneficiario *'
                          : 'Cédula del asegurado *'
                        : 'Cédula o RIF del proveedor *'}
                    </Label>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Input
                        id="user-documento"
                        className="flex-1"
                        value={form.documento}
                        onChange={(e) => {
                          setRmsVerified(false);
                          setRmsIdentity(null);
                          setForm((s) => ({ ...s, documento: e.target.value }));
                        }}
                        placeholder={
                          form.rolCodigo === 'PROVEEDOR_SERVICIOS'
                            ? 'V-12.345.678 o J-031225887-0'
                            : 'V-12.345.678'
                        }
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={
                          verifyingRms ||
                          (isBeneficiario && !titularVerified) ||
                          !form.documento.trim()
                        }
                        onClick={() =>
                          void (isBeneficiario
                            ? handleVerifyBeneficiario()
                            : handleRmsSearch())
                        }
                      >
                        {verifyingRms ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search size={15} />
                        )}
                        {isBeneficiario ? 'Verificar beneficiario' : 'Buscar en RMS'}
                      </Button>
                    </div>
                    {rmsVerified && rmsIdentity && (
                      <p className="mt-1.5 text-[12px] text-success">
                        Persona verificada en RMS: {rmsIdentity.nombreCompleto} ·{' '}
                        {rmsIdentity.nacionalidad}-{rmsIdentity.cedrif}
                      </p>
                    )}
                    <p className="mt-1.5 text-[12px] text-on-surface-variant">
                      Continúe: usuario, nombre completo, correo y teléfono se
                      autocompletarán desde RMS.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setFormStep(2)} disabled={!rmsVerified || saving}>
                    Continuar
                  </Button>
                  <Button variant="outline" onClick={cancelForm} disabled={saving}>
                    Cancelar
                  </Button>
                </div>
              </>
            )}

            {requiresRms && formStep === 2 && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="user-username">Usuario *</Label>
                    <Input
                      id="user-username"
                      value={form.username}
                      onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))}
                      placeholder="jperez"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <Label htmlFor="user-password">Contraseña *</Label>
                    <PasswordInput
                      id="user-password"
                      value={form.password}
                      onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                      placeholder="Mínimo 6 caracteres"
                      autoComplete="new-password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="user-name">Nombre completo</Label>
                    <Input
                      id="user-name"
                      value={form.nombreCompleto}
                      disabled={rmsVerified}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, nombreCompleto: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="user-email">Correo</Label>
                    <Input
                      id="user-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="user-phone">Teléfono</Label>
                    <Input
                      id="user-phone"
                      value={form.telefono}
                      onChange={(e) => setForm((s) => ({ ...s, telefono: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setFormStep(1)} disabled={saving}>
                    Anterior
                  </Button>
                  <Button onClick={() => void handleSave()} disabled={saving}>
                    {saving ? 'Guardando…' : 'Crear usuario'}
                  </Button>
                </div>
              </>
            )}

            {!requiresRms && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="user-username">Usuario {isEditing ? '' : '*'}</Label>
                    <Input
                      id="user-username"
                      value={form.username}
                      disabled={isEditing}
                      onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))}
                      placeholder="jperez"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <Label htmlFor="user-password">
                      Contraseña {isEditing ? '(opcional)' : '*'}
                    </Label>
                    <PasswordInput
                      id="user-password"
                      value={form.password}
                      onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                      placeholder={isEditing ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres'}
                      autoComplete="new-password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="user-name">Nombre completo</Label>
                    <Input
                      id="user-name"
                      value={form.nombreCompleto}
                      onChange={(e) => setForm((s) => ({ ...s, nombreCompleto: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="user-email">Correo</Label>
                    <Input
                      id="user-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="user-phone">Teléfono</Label>
                    <Input
                      id="user-phone"
                      value={form.telefono}
                      onChange={(e) => setForm((s) => ({ ...s, telefono: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="user-role">Rol *</Label>
                    <Select
                      id="user-role"
                      value={form.rolCodigo}
                      onChange={(e) => {
                        clearRmsVerification();
                        setForm((s) => ({
                          ...s,
                          rolCodigo: e.target.value,
                          documento: '',
                          documentoTitular: '',
                          perfilAsegurado: 'TITULAR',
                        }));
                      }}
                    >
                      {PORTAL_ROLES.map((rol) => (
                        <option key={rol.codigo} value={rol.codigo}>
                          {rol.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => void handleSave()} disabled={saving}>
                    {saving
                      ? 'Guardando…'
                      : isEditing
                        ? 'Guardar cambios'
                        : 'Crear usuario'}
                  </Button>
                  <Button variant="outline" onClick={cancelForm} disabled={saving}>
                    Cancelar
                  </Button>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      )}

      <div className="surface-card overflow-hidden p-0">
        <div className="border-b border-outline-variant px-6 py-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="section-title">Usuarios del portal</h2>
              <p className="section-subtitle">
                {loading
                  ? 'Cargando…'
                  : search.trim()
                    ? `${filteredUsers.length} de ${users.length} registros activos`
                    : `${users.length} registros activos`}
              </p>
            </div>
            <div className="w-full max-w-sm">
              <label
                htmlFor="users-search"
                className="mb-1.5 block text-[12px] font-semibold text-on-surface-variant"
              >
                Buscar
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                <Input
                  id="users-search"
                  className="pl-9"
                  placeholder="Usuario, nombre, correo, rol…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 px-6 py-10 text-on-surface-variant">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando usuarios…
          </div>
        ) : users.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-on-surface-variant">
            No hay usuarios registrados para esta empresa.
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-on-surface-variant">
            Ningún usuario coincide con la búsqueda.
          </div>
        ) : (
          <PaginatedDataView items={filteredUsers}>
            {(pageUsers) => (
              <div className="divide-y divide-outline-variant/60">
                {pageUsers.map((u) => {
                  const roles = getUsuarioRoleCodes(u);
                  return (
                    <div
                      key={u.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
                    >
                      <div>
                        <p className="font-bold text-on-surface">
                          {u.nombreCompleto?.trim() || u.username}
                        </p>
                        <p className="text-[13px] text-on-surface-variant">
                          @{u.username}
                          {u.email ? ` · ${u.email}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[12px] text-on-surface-variant">
                          {roles.map(roleLabel).join(' · ') || 'Sin rol'}
                        </span>
                        <Button
                          variant="outline"
                          disabled={saving}
                          onClick={() => openEditForm(u)}
                        >
                          <Pencil size={14} />
                          Editar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </PaginatedDataView>
        )}
      </div>
    </div>
  );
}
