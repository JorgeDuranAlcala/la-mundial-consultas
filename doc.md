Buenas tardes muchachos,
Les reenvío la información para emitir las órdenes de servicio en RMS.
Eso falta implementarlo en los portales,
Saludos
De: gnudoux <gnudoux@gmail.com>Enviado el: lunes, 20 de julio de 2026 5:45 p. m.Para: Ernesto Contreras <econtreras.ybsuccess@gmail.com>CC: luis.reyes@exelixitech.com; yennifer.grau@exelixitech.com; eduardo.sanchez@exelixitech.comAsunto: Re: Documentación Técnica: API de Gestión Automatizada de Siniestros APS (Solución RMS 4.0)
Buenas tardes.
Disculpen la demora.
A continuación, los datos para la conexión a la API en La Mundial QA:
Metodo: POST
Endpoints:
http://192.168.8.100/api/rms40qa/disponible
http://192.168.8.100/api/rms40qa/dependencia
http://192.168.8.100/api/rms40qa/dependetitular
http://192.168.8.100/api/rms40qa/anula
Headers:
Content-Type: application/json
Body (ejemplo — nombres REALES de la API QA, verificados):
'{"c_nacaseg": "V", "n_cedaseg": 12345678}'
NOTA: el email original citaba c_cd_nac_aseg / n_cedrif_aseg; esos campos
responden result:null. Usar c_nacaseg / n_cedaseg (igual que en /disponible).
A continuación, los datos para la conexión a la API en La Mundial PRODUCCIÓN:
La conexión a producción es similar a QA, solo cambia el Endpoint.
Metodo: POST
Endpoints:
http://192.168.8.100/api/rms40/disponible
http://192.168.8.100/api/rms40/dependencia
http://192.168.8.100/api/rms40/dependetitular
http://192.168.8.100/api/rms40/anula
Headers:
Content-Type: application/json
Body (ejemplo):
'{"c_cd_nac_aseg": "V", "n_cedrif_aseg": "12345678"}'
Estoy atento a cualquier duda o comentario.
Saludos.
El vie, 10 jul 2026 a las 21:36, Ernesto Contreras (<econtreras.ybsuccess@gmail.com>) escribió:
Estimado Luis, seguidamente encontrarás lo solicitado, solo faltaría lo que Douglas nos enviará (luego que culmine otras actividades), que se refiere a la documentación básica de la llamada a los Endpoints, pero como sabemos que estás un poco apresurado, tratamos de apoyarte con esto.
1. Contexto de Negocio y Evolución Estratégica
🏢
Esta suite de servicios web nació originalmente con un objetivo crítico: automatizar la gestión y creación de siniestros de Atención Primaria de Salud (APS) directamente en el Core RMS 4.0, minimizando a cero la intervención humana en la fase de autorización.
Su implementación inicial estuvo enfocada en dar respuesta a los dos fondos administrados de salud de mayor volumen y exigencia operativa de la empresa (PDVSA y CVG). El resultado fue un éxito total, logrando eliminar por completo los cuellos de botella críticos que existían en las mesas de validación manual y agilizando la emisión de claves en tiempo real.
Debido al dinamismo propio del negocio de seguros, la solución ha venido experimentando adecuaciones y mejoras continuas (como la inclusión del control estricto de fechas de ocurrencia por movimientos de prima y la gestión precisa de dependientes mediante correlativos). Gracias a este diseño modular enfocado en la practicidad, toda esta solución está completamente capacitada para adecuarse y escalar fácilmente a cualquier póliza de Personas y Salud de la compañía, no limitándose únicamente a fondos administrados.
️ 2. Arquitectura y Ecosistema de Endpoints
🛠
La solución no es una API única, sino un ecosistema de funciones PL/pgSQL que exponen servicios web en formato JSON. Su interacción se divide en tres fases claramente definidas:
A. Consultas de Identificación (Front-End)
rms40.jws_asegdepend: Evalúa la cédula del asegurado para determinar en qué pólizas y certificados vigentes se encuentra.rms40.jws_asegdependtit: Si el paciente es dependiente, este servicio extrae el número correlativo exacto (n_correlativo) asignado a su identidad bajo la cédula del titular (ej. Titular = 0, Cónyuge = 1, Hijo = 2). Indispensable para que el Front-end envíe el parámetro correcto a la función principal.
B. Procesamiento Central y Core (La Función Principal)
rms40.jws_asegbendisp: Es el motor principal y el corazón de la solución. Ejecuta todas las reglas de negocio en el Backend: valida vigencia, coberturas, beneficios, estatus de primas y disponibilidad de fondos. En modo de procesamiento, realiza de forma 100% automatizada la afectación de coberturas, la resta del fondo y la creación del siniestro con su respectiva clave en el RMS 4.0.
C. Servicios Complementarios de Ciclo de Vida
rms40.jws_verifsini: Endpoint independiente para validar la existencia física y estatus de un número de siniestro específico en las tablas del sistema.rms40.jws_anulasini: Endpoint independiente que permite al Front-end revertir y anular técnicamente un siniestro previamente creado por el API, siempre y cuando no haya sido modificado manualmente en el Backend.
3. Especificación Técnica: rms40.jws_asegbendisp (Función Principal)
📄
Estructura del JSON de Entrada (Payload)
📥
El Front-end debe estructurar el JSON con los siguientes parámetros requeridos para la evaluación:
Campo
Tipo
Requerido
Descripción / Regla de Negocio
n_serialcontrato
Numeric(16)
Sí
ID único del contrato de la póliza (obtenido previamente).
n_serialcertif
Numeric(16)
Sí
ID único del certificado del contrato.
f_fecocur
String
Sí
Fecha del evento (YYYY-MM-DD). No puede ser futura ni mayor a 5 años.
c_nacaseg
String(1)
Sí
Nacionalidad del asegurado (V, E, P, J).
n_cedaseg
Numeric(10)
Sí
Cédula o documento de identidad del asegurado.
n_correlativo
Numeric(3)
Sí
Correlativo del paciente extraído del WS de dependientes (Titular = 0).
c_serv
String(1)
Sí
0 = Solo Consulta (Simulación) | 1 = Procesar (Notificación Real).
c_benef
String(10)
Sí
Código del beneficio médico solicitado (ej: 0053).
n_monto
Numeric(16,2)
Sí
Monto bruto solicitado para el servicio (Bs. / $> 0 Bs. / $).
c_moneda
String(2)
Sí
Moneda de la transacción (BS, USD).
c_nacprov
String(1)
Sí
Nacionalidad del Proveedor Médico / Clínica.
n_cedrifprov
Numeric(10)
Sí
Cédula o RIF del Proveedor de Salud.
c_cd_enfermedad
String(10)
Sí
Código del diagnóstico base (Baremo de la empresa).
c_cd_detenfermedad
String(10)
Sí
Código de la sub-enfermedad o diagnóstico específico.
c_cd_tratamiento
String(10)
Sí
Código de tratamiento (Establecido por defecto en 0001).
️ Flujo Lógico y Validaciones del Backend
⚙
Al ser invocada, la función ejecuta de forma secuencial las siguientes comprobaciones:
Existencia del Proveedor y Asegurado: Valida activaciones en c_persona y comprueba que el asegurado esté asignado al contrato específico en e_aseg_seg y no se encuentre en estatus Excluido (EXC).
Validación de la Cobertura APS: Valida que el contrato posea la cobertura de APS activa (Ramo 1000, Cobertura 0008).
Validación del Beneficio Específico: Verifica en c_cobbenef_seguro que el código c_benef esté asociado a la cobertura de la póliza.
Verificación Financiera de Prima: * Si es una póliza clásica de Salud, exige que las primas de la cobertura estén en estatus Cobrado (COB).
Si es una póliza de tipo FONDO, el motor flexibiliza la regla permitiendo estatus Cobrado (COB) o Pendiente (PEN).
Vigencia del Evento: La fecha f_fecocur obligatoriamente debe estar dentro del rango de cobertura de la prima calculada (fechainicio y fechafin).
Cálculo de Disponibilidad y Moneda: Llama internamente a ws_sumadisponible. Evalúa el monto solicitado contra la moneda del contrato utilizando la tasa de cambio del día del evento (gen_busca_tasacambio).
Emisión Automatizada (Si c_serv = '1'): Genera el número de clave (clavesalud), apertura el siniestro (siniestro), afecta los saldos e inserta los registros en los históricos logs del sistema de forma transparente.
4. Estructura de Respuestas (JSON Output)
📤
A. Aprobación Exitosa en Modo Procesamiento (c_serv = "1")
Retorna el estatus de la transacción (1 = Total, 2 = Parcial), la descripción comercial, la clave generada para la clínica, el monto final afectado en la moneda del contrato, el ID del siniestro creado y el código de la filial.
JSON
{
​
  "n_estatus": 1,
​
  "c_descripcion": "Clave Procesada Aprobado Total",
​
  "n_clave": 784512,
​
  "n_montodef": 150.00,
​
  "n_siniestro": 1332,
​
  "c_cd_filial": "001"
​
}
​
B. Simulación Exitosa en Modo Consulta (c_serv = "0")
Permite al Front-end simular la transacción para mostrarle al operador si el asegurado cuenta con disponibilidad y si el caso es procedente antes de pulsar el botón definitivo.
JSON
{
​
  "n_estatus": 99,
​
  "c_descripcion": "SOLO CONSULTA Clave puede ser con Aprobado Total",
​
  "n_clave": 0,
​
  "n_montodef": 0.00
​
}
​
C. Matriz de Errores de Negocio (Ejemplos de Retorno)
Si alguna validación falla, el sistema bloquea la creación del siniestro y responde con la estructura estándar de error para control del Front-end:
JSON
{
  "n_estatus": 56,
​
  "c_descripcion": "Contrato de Póliza del Asegurado NO posee la Cobertura de APS",
​
  "n_clave": 0,
​
  "n_montodef": 0.00
​
}
​
50: Proveedor No Existe.
52: Asegurado No Existe en el contrato/certificado especificado.
55: El Asegurado se encuentra registrado en más de un Certificado (Mensaje de control corregido y actualizado).
57: Cobertura del Asegurado no posee prima cobrada.
58: La fecha de ocurrencia está fuera del rango cubierto por la prima.
59: Cobertura del Asegurado ya no posee disponible para ese monto.
79: El Contrato de Póliza no posee el beneficio médico detallado asociado.
Estamos atento para aclarar cualquier interrogante,
Saludos Mil,