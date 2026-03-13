const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  onScreenshotCaptured: (callback) => ipcRenderer.on('screenshot-captured', (_event, dataURL) => callback(dataURL)),
  closeOverlay: () => ipcRenderer.send('close-overlay'),
  processSelection: (box, dataURL) => ipcRenderer.send('process-selection', box, dataURL)
});
