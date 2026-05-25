# Gestor PAUM (Profesional Asociado en Urgencias Medicas)

## Configuracion de Desarrollo

Para correr el proyecto localmente, asegurate de tener instaladas las dependencias:

```bash
npm install
```

Luego, corre el siguiente comando para iniciar frontend y backend simultaneamente:

```bash
npm run dev:all
```

El frontend estara disponible en la URL que muestre Vite y el backend en `http://localhost:3001`.

## Version de Escritorio

1. Genera el ejecutable portable de Windows con `npm run dist:win`.
2. El archivo `.exe` quedara en la carpeta `release`.
3. Si quieres probar la app de escritorio sin empaquetarla aun, usa `npm run desktop`.

## Variables de Entorno

Crea un archivo `.env` en la raiz basada en `.env.example`:

```env
GEMINI_API_KEY=tu_clave_real_aqui_para_el_backend
```

La clave `GEMINI_API_KEY` solo debe usarse en el servidor (`server.ts` o Firebase Functions).
