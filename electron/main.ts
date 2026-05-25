import { app, BrowserWindow } from 'electron';
import { existsSync } from 'fs';
import path from 'path';
// __dirname is natively available in CommonJS

// Importar el servidor
import { startServer } from '../server.ts';

let mainWindow: BrowserWindow | null = null;
let apiServer: any = null;

function resolveWindowIcon() {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'build-resources', 'icon.png')
    : path.join(__dirname, '../../build-resources/icon.png');

  return existsSync(iconPath) ? iconPath : undefined;
}

async function createWindow() {
  const windowIcon = resolveWindowIcon();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    ...(windowIcon ? { icon: windowIcon } : {}),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true, // Ocultar la barra de menú predeterminada
  });

  // Determinar la ruta de los estáticos de la app React (dist de Vite)
  const isDev = !app.isPackaged;
  const staticDir = isDev
    ? path.join(__dirname, '../../dist')
    : path.join(__dirname, '../../dist'); // En build, dist y build/electron están en diferente nivel

  try {
    // Iniciar el backend y servir el frontend desde Express
    // Usamos el puerto 0 para que asigne un puerto libre dinámicamente,
    // o 3001 si preferimos mantenerlo estático.
    const startedServer = await startServer({
      host: '127.0.0.1',
      port: 0, // Puerto dinámico para evitar conflictos en la máquina del usuario
      staticDir: staticDir,
    });
    
    apiServer = startedServer.server;
    console.log(`[Electron] Servidor Express corriendo en: ${startedServer.url}`);

    // Cargar la aplicación web desde el servidor local Express
    mainWindow.loadURL(startedServer.url);
  } catch (error) {
    console.error('[Electron] Error al iniciar el servidor:', error);
    // Mostrar algún mensaje de error en la ventana si falla
    mainWindow.loadFile(path.join(__dirname, 'error.html')).catch(() => {});
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Asegurarse de cerrar el servidor de Express cuando Electron se cierre
app.on('before-quit', () => {
  if (apiServer) {
    apiServer.close();
  }
});
