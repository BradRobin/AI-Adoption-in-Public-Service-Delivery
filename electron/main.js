const { app, BrowserWindow } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const http = require('http')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let nextServer

const isDev = !app.isPackaged
const PORT = 3000

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        title: "PARP - Public Sector AI Readiness Platform",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            preload: path.join(__dirname, 'preload.js')
        },
        // Hide menu bar by default for cleaner look
        autoHideMenuBar: true
    })

    const startUrl = isDev
        ? `http://localhost:${PORT}`
        : `http://localhost:${PORT}` // In prod, we spawn local server on same port or random

    // Wait for the Next.js server to be ready before loading the URL
    const checkServer = () => {
        http.get(startUrl, (res) => {
            if (res.statusCode === 200) {
                mainWindow.loadURL(startUrl)
                if (isDev) mainWindow.webContents.openDevTools()
            } else {
                setTimeout(checkServer, 1000)
            }
        }).on('error', () => {
            setTimeout(checkServer, 1000)
        })
    }

    // If in production mode, we need to start the Next.js server ourselves
    // Note: For a robust production app, we might bundle the standalone server output
    // For this MVP, assuming 'npm run start' works if node is present, OR we rely on the dev server for the PoC wrapper.
    // A true "offline" build would require bundling the 'standalone' output of next build.

    // Strategy: Connect to existing server or fail gracefully. 
    // For this specific requested scope ("wrap Next.js build"), we will point it to the local server.

    checkServer()

    mainWindow.on('closed', function () {
        mainWindow = null
    })
}

app.on('ready', createWindow)

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow()
    }
})
