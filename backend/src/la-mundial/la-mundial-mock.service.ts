import { Injectable, NotFoundException } from '@nestjs/common';

export type LaMundialPersonaTipo = 'ASEGURADO' | 'BENEFICIARIO' | 'PROVEEDOR';

export interface LaMundialPoliza {
  numeroPoliza: string;
  producto: string;
  vigenciaDesde: string;
  vigenciaHasta: string;
  estatus: string;
  sumaAsegurada: number;
  moneda: string;
}

export interface LaMundialDependiente {
  nacionalidad: string;
  cedula: string;
  nombreCompleto: string;
  parentesco: string;
  activo: boolean;
}

export interface LaMundialPersona {
  serialpersona: string;
  nacionalidad: string;
  cedrif: string;
  correlativo: string;
  nombreCompleto: string;
  email: string | null;
  telefono: string | null;
  numrif: string | null;
  tipo: LaMundialPersonaTipo;
  titularNacionalidad?: string;
  titularCedrif?: string;
  polizas: LaMundialPoliza[];
  dependientes?: LaMundialDependiente[];
}

/** Simulación de la API de La Mundial hasta recibir el servicio real. */
@Injectable()
export class LaMundialMockService {
  private readonly personas: LaMundialPersona[] = [
    {
      serialpersona: 'LM-1001',
      nacionalidad: 'V',
      cedrif: '12345678',
      correlativo: '0',
      nombreCompleto: 'Juan Carlos Pérez González',
      email: 'juan.perez@email.com',
      telefono: '04141234567',
      numrif: null,
      tipo: 'ASEGURADO',
      polizas: [
        {
          numeroPoliza: 'POL-2024-001234',
          producto: 'Salud Colectivo Empresarial',
          vigenciaDesde: '2025-01-01',
          vigenciaHasta: '2025-12-31',
          estatus: 'VIGENTE',
          sumaAsegurada: 50000,
          moneda: 'USD',
        },
      ],
      dependientes: [
        {
          nacionalidad: 'V',
          cedula: '23456789',
          nombreCompleto: 'María Elena Pérez López',
          parentesco: 'Cónyuge',
          activo: true,
        },
        {
          nacionalidad: 'V',
          cedula: '34567890',
          nombreCompleto: 'Ana Sofía Pérez López',
          parentesco: 'Hija',
          activo: true,
        },
      ],
    },
    {
      serialpersona: 'LM-1002',
      nacionalidad: 'V',
      cedrif: '23456789',
      correlativo: '0',
      nombreCompleto: 'María Elena Pérez López',
      email: 'maria.perez@email.com',
      telefono: '04142345678',
      numrif: null,
      tipo: 'BENEFICIARIO',
      titularNacionalidad: 'V',
      titularCedrif: '12345678',
      polizas: [
        {
          numeroPoliza: 'POL-2024-001234',
          producto: 'Salud Colectivo Empresarial',
          vigenciaDesde: '2025-01-01',
          vigenciaHasta: '2025-12-31',
          estatus: 'VIGENTE',
          sumaAsegurada: 50000,
          moneda: 'USD',
        },
      ],
    },
    {
      serialpersona: 'LM-2001',
      nacionalidad: 'V',
      cedrif: '98765432',
      correlativo: '0',
      nombreCompleto: 'Carlos Alberto Rodríguez Martínez',
      email: 'carlos.rodriguez@email.com',
      telefono: '04241234567',
      numrif: null,
      tipo: 'ASEGURADO',
      polizas: [
        {
          numeroPoliza: 'POL-2023-009876',
          producto: 'Salud Individual Premium',
          vigenciaDesde: '2024-06-01',
          vigenciaHasta: '2025-05-31',
          estatus: 'VIGENTE',
          sumaAsegurada: 25000,
          moneda: 'USD',
        },
      ],
    },
    {
      serialpersona: 'LM-3001',
      nacionalidad: 'J',
      cedrif: '31225887',
      correlativo: '0',
      nombreCompleto: 'Clínica Salud Integral C.A.',
      email: 'contacto@clinicasalud.com',
      telefono: '02121234567',
      numrif: 'J-031225887-0',
      tipo: 'PROVEEDOR',
      polizas: [],
    },
  ];

  findByDocument(
    nacionalidad: string,
    cedrif: number,
    correlativo = 0,
  ): LaMundialPersona | null {
    const nac = nacionalidad.toUpperCase();
    const ced = String(cedrif);
    const corr = String(correlativo);
    return (
      this.personas.find(
        (p) =>
          p.nacionalidad === nac &&
          p.cedrif === ced &&
          p.correlativo === corr,
      ) ?? null
    );
  }

  findTitular(nacionalidad: string, cedrif: number): LaMundialPersona | null {
    const persona = this.findByDocument(nacionalidad, cedrif, 0);
    if (!persona) return null;
    if (persona.tipo === 'ASEGURADO') return persona;
    return null;
  }

  findBeneficiario(
    nacionalidad: string,
    cedrif: number,
    titularNacionalidad: string,
    titularCedrif: number,
  ): LaMundialPersona | null {
    const titular = this.findTitular(titularNacionalidad, titularCedrif);
    if (!titular) return null;

    const benef = this.findByDocument(nacionalidad, cedrif, 0);
    if (!benef || benef.tipo !== 'BENEFICIARIO') return null;

    if (
      benef.titularNacionalidad !== titular.nacionalidad ||
      benef.titularCedrif !== titular.cedrif
    ) {
      return null;
    }

    return benef;
  }

  findProveedor(
    nacionalidad: string,
    cedrif: number,
    correlativo: number,
  ): LaMundialPersona | null {
    const persona = this.findByDocument(nacionalidad, cedrif, correlativo);
    if (!persona || persona.tipo !== 'PROVEEDOR') return null;
    return persona;
  }

  consultarAsegurado(nacionalidad: string, cedrif: number) {
    const persona = this.findByDocument(nacionalidad, cedrif, 0);
    if (!persona) {
      throw new NotFoundException(
        `No se encontró asegurado ${nacionalidad.toUpperCase()}-${cedrif} en La Mundial.`,
      );
    }
    if (persona.tipo === 'PROVEEDOR') {
      throw new NotFoundException(
        'El documento corresponde a un proveedor, no a un asegurado.',
      );
    }

    return {
      fuente: 'LA_MUNDIAL_MOCK',
      consultadoEn: new Date().toISOString(),
      persona: {
        serialpersona: persona.serialpersona,
        nacionalidad: persona.nacionalidad,
        cedula: persona.cedrif,
        correlativo: persona.correlativo,
        nombreCompleto: persona.nombreCompleto,
        email: persona.email,
        telefono: persona.telefono,
        tipo: persona.tipo,
        titular:
          persona.tipo === 'BENEFICIARIO'
            ? `${persona.titularNacionalidad}-${persona.titularCedrif}`
            : null,
      },
      polizas: persona.polizas,
      dependientes: persona.dependientes ?? [],
    };
  }
}
