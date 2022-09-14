// Node Imports
const path = require('path');
const fs = require("fs")
const url = require('url');

// PDF Printing Imports
const { download } = require('electron-dl');
const unixPrint = require("unix-print");
const windowsPrint = require("pdf-to-printer");

// Electron Imports
const { app, BrowserWindow, ipcMain } = require('electron');
const isDev = false;

// Create window once Electron has been initialized
app.whenReady().then(createWindow);

// Quit app on all windows closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// On activation, open a window if one doesn't exist
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Creates Browser Window
function createWindow() {

  // Create the browser window.
  const win = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
  });

  // Make Browser Window Full Screen
  win.maximize();

  // Load in correct page

  if (process.platform === 'darwin') {
  win.loadURL(
    isDev
      ? 'http://localhost:3000/scan'
      : `file://${path.join(__dirname, 'build/index.html#/scan')}`
  );
  } else if (process.platform === 'win32') {
    win.loadURL(
      isDev
        ? 'http://localhost:3000/scan'
        : url.format({
          pathname: path.join(__dirname,`build/index.html`),
          protocol:'file',
          slashes:true,
          hash:`#/scan`
        })
 
    );
  }


  // EVENT LISTENERS

  
  // Wait for a request to print a label from the front end
  ipcMain.on("print-label", (event, data) => {

    // Parse the print data
    const printData = JSON.parse(data)

    

    // Start download
    download(BrowserWindow.getFocusedWindow(), printData.URL, { filename: "temporary-label.pdf" }).then(async (dl) => {

      // Print label if it's a mac
      if (process.platform === "darwin") {
        await unixPrint.print(dl.getSavePath(), printData.printerName);
      }

      // Print label if it's a windows
      if (process.platform === "win32") {

        // Set Printing Options
        const printingOptions = {
          silent: true
        }
        if (printData.printerName) {
          printingOptions.printer = printData.printerName; 
        }


        await windowsPrint.print(dl.getSavePath(), printingOptions);
      }


      // Delete temporary label file
      fs.unlinkSync(dl.getSavePath());

    })

  })


  // Listen to request to get list of printers
  ipcMain.on("get-printer-list", async (event, data) => {

    // Create window
    const printWindow = new BrowserWindow({ 'auto-hide-menu-bar': true, show: false });

    // Load random URL
    await printWindow.loadURL("https://www.google.com");

    // Get Printer List
    const list = await printWindow.webContents.getPrintersAsync();

    // Return Printer List to Front End
    event.reply("get-printer-list-reply", list)
  })
}