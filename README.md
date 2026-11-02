# Capry

Sitio de descubrimiento de fiestas en Quito. La portada y la consulta de eventos son públicas; las cuentas usan Supabase Auth con sesiones guardadas en cookies y verificadas en el servidor.

## Desarrollo local

1. Instala las dependencias con `pnpm install`.
2. Copia `.env.example` a `.env.local` y completa la URL y la **clave publicable** del proyecto Supabase Capry. `APP_URL` debe ser el origen desde el que se abre la aplicación, por ejemplo `http://localhost:3000`.
3. En Supabase Auth, configura ese origen como **Site URL** y añade `APP_URL/auth/callback` como URL de redirección permitida.
4. Para confirmar el registro en una aplicación con sesiones de servidor, cambia el enlace de la plantilla **Confirm signup** a `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`.
5. Ejecuta `pnpm dev` y abre `APP_URL`.

Al desplegar, configura las mismas variables con el dominio definitivo y añade su URL de callback a Supabase Auth. La aplicación utiliza solo la clave publicable. Nunca añadas `service_role` ni `sb_secret_...` a variables `NEXT_PUBLIC_` o al repositorio.

La aplicación necesita un servidor Next.js: `output: "export"` se retiró en P4. La publicación estática anterior de Sites no ejecuta estas páginas ni la autenticación hasta migrar su alojamiento a uno compatible con ejecución de servidor.

## Datos y permisos

Las migraciones de `supabase/migrations` están aplicadas al proyecto Capry. La API pública `GET /api/events` devuelve datos de eventos y conteos agregados, sin identificadores de cuentas. La escritura futura debe obtener la identidad con `getCurrentUser()` en el servidor y dejar que las políticas RLS vuelvan a comprobar la propiedad de cada fila.
