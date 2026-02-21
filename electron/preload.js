const { contextBridge } = require('electron')

/**
 * The preload script runs before the renderer process is loaded.
 * It sits between Node.js and the Web environment.
 * We use `contextBridge` to expose safe, controlled APIs to the renderer (frontend)
 * without exposing entire Node modules or Electron internals, thereby improving security.
 */
// Expose safe APIs to the renderer process if needed
contextBridge.exposeInMainWorld('electron', {
    // Add any IPC methods here if necessary in the future
    // e.g. checkOfflineStatus: () => ipcRenderer.invoke('check-offline')
})
