-- Base de datos local para portal de consultas La Mundial
CREATE EXTENSION IF NOT EXISTS citext;

CREATE SCHEMA IF NOT EXISTS logistika;

CREATE TABLE IF NOT EXISTS logistika.compania (
  id BIGSERIAL PRIMARY KEY,
  codigo VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  tipo VARCHAR(50) NOT NULL DEFAULT 'Seguro',
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS logistika.cat_rol_portal (
  codigo VARCHAR(40) PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS logistika.proveedor (
  id BIGSERIAL PRIMARY KEY,
  codigo_externo VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(200) NOT NULL,
  rif VARCHAR(30),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS logistika.usuario_portal (
  id BIGSERIAL PRIMARY KEY,
  username CITEXT NOT NULL UNIQUE,
  email CITEXT,
  password_hash TEXT NOT NULL,
  nombre_completo VARCHAR(200),
  telefono VARCHAR(30),
  proveedor_id BIGINT REFERENCES logistika.proveedor(id),
  compania_id BIGINT REFERENCES logistika.compania(id),
  rms_serialpersona VARCHAR(50),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  ultimo_acceso_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS logistika.usuario_rol (
  usuario_id BIGINT NOT NULL REFERENCES logistika.usuario_portal(id) ON DELETE CASCADE,
  rol_codigo VARCHAR(40) NOT NULL REFERENCES logistika.cat_rol_portal(codigo),
  PRIMARY KEY (usuario_id, rol_codigo)
);

INSERT INTO logistika.cat_rol_portal (codigo, nombre) VALUES
  ('ASEGURADO', 'Asegurado'),
  ('PROVEEDOR_SERVICIOS', 'Proveedor de servicios')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO logistika.compania (codigo, nombre, descripcion, activo, tipo)
VALUES (
  'LA_MUNDIAL',
  'La Mundial de Seguros',
  'Portal de consultas de asegurados — solo lectura',
  TRUE,
  'Seguro'
)
ON CONFLICT (codigo) DO NOTHING;
