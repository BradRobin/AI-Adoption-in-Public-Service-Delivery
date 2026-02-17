const { contextBridge } = require('electron')

// Expose safe APIs to the renderer process if needed
contextBridge.exposeInMainWorld('electron', {
    // Add any IPC methods here if necessary in the future
    // e.g. checkOfflineStatus: () => ipcRenderer.invoke('check-offline')
})
