const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Tray,
  Menu,
  desktopCapturer,
  nativeImage,
  clipboard,
  Notification,
  screen,
} = require("electron");
const path = require("path");
const { extractText } = require("./ocr");

let tray = null;
let overlayWindow = null;
let isProcessing = false;

// Ensure single instance and hide from dock on macOS
if (app.dock) app.dock.hide();

app.whenReady().then(() => {
  createTray();
  registerShortcut();

  app.on("activate", () => {
    // Hidden background app
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  // Keep app running in background
});

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: "Circle to Search: Ready", enabled: false },
    { type: "separator" },
    { label: "Quit", role: "quit" },
  ]);

  tray.setToolTip("Circle to Search");
  tray.setContextMenu(contextMenu);
}

function registerShortcut() {
  const ret = globalShortcut.register("CommandOrControl+Shift+A", () => {
    if (!isProcessing) {
      captureAndShowOverlay();
    }
  });

  if (!ret) {
    console.error("Registration failed");
  }
}

async function captureAndShowOverlay() {
  if (overlayWindow) {
    overlayWindow.close();
    overlayWindow = null;
  }

  isProcessing = true;

  try {
    const cursorPoint = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(cursorPoint);

    // Attempt to capture screen before opening overlay
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: {
        width: display.size.width * display.scaleFactor,
        height: display.size.height * display.scaleFactor,
      },
    });

    let activeSource =
      sources.find((s) => s.display_id === display.id.toString()) || sources[0];
    const screenshot = activeSource.thumbnail;

    overlayWindow = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      transparent: true,
      backgroundColor: '#00000000',
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      enableLargerThanScreen: true,
      hasShadow: false,
      resizable: false,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    if (process.platform === 'darwin') {
      overlayWindow.setSimpleFullScreen(true);
      overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    } else {
      overlayWindow.setFullScreen(true);
    }
    
    overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);

    const dataURL = screenshot.toDataURL();
    await overlayWindow.loadFile("index.html");

    overlayWindow.webContents.send("screenshot-captured", dataURL);
    
    overlayWindow.once('ready-to-show', () => {
      overlayWindow.show();
    });

    // After overlay is up, we can consider processing initialized
    isProcessing = false;
  } catch (err) {
    console.error("Capture failed", err);
    isProcessing = false;
  }
}

ipcMain.on("close-overlay", () => {
  if (overlayWindow) {
    overlayWindow.close();
    overlayWindow = null;
  }
});

ipcMain.on("process-selection", async (event, box, dataURL) => {
  if (overlayWindow) {
    overlayWindow.close();
    overlayWindow = null;
  }

  isProcessing = true;

  try {
    const image = nativeImage.createFromDataURL(dataURL);

    const cursorPoint = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(cursorPoint);
    const scaleFactor = display.scaleFactor;

    const scaledBox = {
      x: box.x * scaleFactor,
      y: box.y * scaleFactor,
      width: box.width * scaleFactor,
      height: box.height * scaleFactor,
    };

    const cropped = image.crop(scaledBox);
    const croppedBuffer = cropped.toPNG();

    const text = await extractText(croppedBuffer);

    if (text && text.trim().length > 0) {
      clipboard.writeText(text.trim());
      new Notification({ title: "Text Copied", body: text.trim() }).show();
    } else {
      new Notification({
        title: "No text found",
        body: "OCR could not find any text.",
      }).show();
    }
  } catch (err) {
    console.error("OCR failed", err);
    new Notification({
      title: "Error",
      body: "Failed to extract text.",
    }).show();
  } finally {
    isProcessing = false;
  }
});
