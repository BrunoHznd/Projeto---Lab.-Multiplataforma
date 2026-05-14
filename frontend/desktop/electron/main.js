/**
 * tiResolve Desktop - Electron Main Process
 * Cria a janela principal da aplicação desktop.
 */

const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// Verifica se está em desenvolvimento
const isDev = !app.isPackaged;
const appVersion = app.getVersion();

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        title: 'tiResolve - Centro de Informática',
        backgroundColor: '#0f0f1a',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            additionalArguments: [`--app-version=${appVersion}`],
        },
        icon: path.join(__dirname, '..', 'public', 'icon.png'),
        autoHideMenuBar: false,
    });

    // Menu personalizado
    const menuTemplate = [
        {
            label: 'tiResolve',
            submenu: [
                { label: 'Sobre', role: 'about' },
                { type: 'separator' },
                { label: 'Recarregar', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.reload() },
                { label: 'DevTools', accelerator: 'F12', click: () => mainWindow.webContents.toggleDevTools() },
                { type: 'separator' },
                { label: 'Sair', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
            ],
        },
        {
            label: 'Visualizar',
            submenu: [
                { label: 'Zoom +', accelerator: 'CmdOrCtrl+=', role: 'zoomIn' },
                { label: 'Zoom -', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
                { label: 'Zoom Padrão', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
                { type: 'separator' },
                { label: 'Tela Cheia', accelerator: 'F11', role: 'togglefullscreen' },
            ],
        },
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

    // Carrega a aplicação
    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
        // Abre DevTools em dev
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
        mainWindow.loadFile(path.join(__dirname, '..', 'build', 'index.html'));
    }

    return mainWindow;
}

// Quando o Electron estiver pronto
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Fecha a aplicação quando todas as janelas forem fechadas (Windows/Linux)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
