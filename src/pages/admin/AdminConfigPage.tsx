import { useState } from 'react';
import { Settings } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/stores/useStore';
import { ServiceStepsConfig } from '@/pages/admin/ServiceStepsConfig';
import { ValidationConfig } from '@/pages/admin/ValidationConfig';
import { DocumentUploadConfig } from '@/pages/admin/DocumentUploadConfig';

type ConfigTab = 'steps' | 'validations' | 'documents';

export function AdminConfigPage() {
  const selectedCompania = useAuth((s) => s.selectedCompania);
  const [tab, setTab] = useState<ConfigTab>('steps');

  return (
    <div className="step-enter">
      <PageHeader
        title="Configuración de workflow"
        subtitle={`Pasos, documentos y validaciones · ${selectedCompania?.nombre ?? 'empresa'}`}
        icon={Settings}
        breadcrumbs={[
          { label: 'Admin', to: '/app/admin' },
          { label: 'Configuración' },
        ]}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          variant={tab === 'steps' ? 'accent' : 'outline'}
          onClick={() => setTab('steps')}
        >
          Pasos y documentos
        </Button>
        <Button
          variant={tab === 'validations' ? 'accent' : 'outline'}
          onClick={() => setTab('validations')}
        >
          Validaciones IA
        </Button>
        <Button
          variant={tab === 'documents' ? 'accent' : 'outline'}
          onClick={() => setTab('documents')}
        >
          Documentos
        </Button>
      </div>

      {tab === 'steps' && <ServiceStepsConfig />}
      {tab === 'validations' && <ValidationConfig />}
      {tab === 'documents' && <DocumentUploadConfig />}
    </div>
  );
}
