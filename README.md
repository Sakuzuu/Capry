# Capry

Sitio de descubrimiento de fiestas en Quito. La portada y la consulta de eventos son públicas; las cuentas usan Supabase Auth con sesiones guardadas en cookies y verificadas en el servidor.

## Estado de la publicación

La versión con servidor ya está publicada en [Capry](https://capry-quito.blondepony.chatgpt.site). Cualquier visitante puede abrir la portada y consultar los eventos sin registrarse. En el alojamiento ya están configuradas `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `APP_URL`. En Supabase Auth, **Site URL** apunta al dominio publicado y están permitidas las redirecciones `/auth/callback` tanto del dominio público como de `http://localhost:3000`.

**Pendiente para completar el registro por correo:** Supabase no permite editar la plantilla **Confirm sign up** de este proyecto con el servicio de correo predeterminado del plan actual. El panel pide configurar SMTP propio o pasar a Pro. Cuando haya un proveedor de correo, abre [Authentication → Emails → Confirm sign up](https://supabase.com/dashboard/project/dfigsoqmqnqvklbqsxxy/auth/templates/confirm-sign-up), sustituye el enlace `{{ .ConfirmationURL }}` por `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` y guarda. Después registra una cuenta de prueba y confirma el correo desde otro navegador para verificar el flujo completo. Hasta entonces, la confirmación con la plantilla predeterminada no está verificada para sesiones de servidor.

La publicación usa un repositorio de origen propio de Sites con Vinext para ejecutar las rutas de servidor. Este repositorio de GitHub conserva el código de la aplicación Next.js y sus migraciones.

## Desarrollo local

1. Instala las dependencias con `pnpm install`.
2. Copia `.env.example` a `.env.local` y completa la URL y la **clave publicable** del proyecto Supabase Capry. `APP_URL` debe ser el origen desde el que se abre la aplicación, por ejemplo `http://localhost:3000`.
3. La redirección local `http://localhost:3000/auth/callback` ya está permitida en Supabase Auth. Mantén la **Site URL** del dominio publicado.
4. La edición de la plantilla de confirmación requiere SMTP propio o Pro, como se explica arriba.
5. Ejecuta `pnpm dev` y abre `APP_URL`.

En este entorno de Codex en macOS, la vigilancia de archivos de Next.js puede fallar. Se comprobó que la aplicación local responde con `WATCHPACK_POLLING=true pnpm exec next dev --webpack`. Abre `http://localhost:3000` después de ejecutar ese comando.

La aplicación utiliza solo la clave publicable. Nunca añadas `service_role` ni `sb_secret_...` a variables `NEXT_PUBLIC_` o al repositorio.

La aplicación necesita ejecución de servidor: `output: "export"` se retiró en P4. La publicación de Sites ya se migró a esa modalidad.

## Mapa de eventos

La portada consulta `GET /api/events` al cargar el mapa y al moverlo. La función `public.visible_events_in_bounds` filtra en PostgreSQL por área, estado y horario de Quito; agrupa publicaciones conectadas a menos de 250 metros cuando comparten el mismo horario. La página muestra un estado vacío hasta que haya eventos reales. Seleccionar un marcador o un elemento de la lista abre la misma ficha. Las coordenadas se guardan como `latitude` y `longitude` y se convierten al orden longitud–latitud de MapLibre en `src/features/map/coordinates.ts`.

El mapa usa el estilo oscuro de OpenFreeMap, basado en datos de OpenStreetMap, con atribución visible y sin clave de acceso.
Los colores de fondo, vías y nombres se ajustan en `src/features/map/map-theme.ts` para mantener la paleta morada de Capry.
El archivo `public/maplibre-gl-worker.mjs` corresponde a la versión fijada de MapLibre GL JS; al actualizar esa dependencia, copia de nuevo su worker desde `node_modules/maplibre-gl/dist/`.

## Datos y permisos

Las migraciones de `supabase/migrations` están aplicadas al proyecto Capry. La API pública `GET /api/events` devuelve datos de eventos y conteos agregados, sin identificadores de cuentas. La escritura futura debe obtener la identidad con `getCurrentUser()` en el servidor y dejar que las políticas RLS vuelvan a comprobar la propiedad de cada fila.
