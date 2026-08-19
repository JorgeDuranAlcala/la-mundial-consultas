# La Mundial Consultas

Portal de **solo consulta** basado en `git-web-portales-frontend`. Permite registrar usuarios con rol **Asegurado** o **Proveedor de servicios**, validando la cédula contra una simulación de la API de La Mundial (hasta recibir el servicio real).

Tras iniciar sesión, el portal muestra únicamente un buscador para consultar datos de asegurados por cédula.

## Requisitos

- Node.js 20+
- PostgreSQL local
- pnpm o npm

## Base de datos

Credenciales configuradas:

| Campo    | Valor                 |
|----------|-----------------------|
| Usuario  | `postgres`            |
| Password | `luna2001`            |
| Base     | `la_mundial_consultas`|

### Crear la base de datos

```bash
PGPASSWORD=luna2001 psql -U postgres -h localhost -c "CREATE DATABASE la_mundial_consultas;"
PGPASSWORD=luna2001 psql -U postgres -h localhost -d la_mundial_consultas -f backend/src/database/init.sql
```

## Backend (NestJS)

```bash
cd backend
npm install
npm run dev
```

API en `http://localhost:3001/portales-services`

## Frontend (Vite + React)

```bash
npm install
npm run dev
```

UI en `http://localhost:5173/portales/`

## Flujo

1. Seleccionar **La Mundial de Seguros**
2. **Registrarse** o **Iniciar sesión** como Asegurado o Proveedor de servicios
3. En el registro, se valida la cédula/RIF contra la simulación de La Mundial
4. Tras el login, usar **Consultar asegurado** buscando por cédula

## Datos de prueba (simulación La Mundial)

| Documento        | Tipo        | Descripción              |
|------------------|-------------|--------------------------|
| V-12345678       | Titular     | Juan Carlos Pérez        |
| V-23456789       | Beneficiario| María Elena Pérez (cónyuge) |
| V-98765432       | Titular     | Carlos Rodríguez         |
| J-031225887-0    | Proveedor   | Clínica Salud Integral   |

## Estructura

```
la-mundial-consultas/
├── src/                 # Frontend (copia adaptada del portal)
├── backend/             # API mínima: auth + consulta La Mundial
└── README.md
```

## Próximo paso

Reemplazar `LaMundialMockService` en `backend/src/la-mundial/` por el cliente HTTP real cuando entreguen la API de La Mundial.
