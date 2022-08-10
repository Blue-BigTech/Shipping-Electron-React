// Node Imports
const path = require('path');
const fs = require("fs")

// PDF Printing Imports
const { DownloaderHelper } = require('node-downloader-helper');
const unixPrint = require("unix-print");
const windowsPrint = require("pdf-to-printer");

// Electron Imports
const { app, BrowserWindow, ipcMain } = require('electron');
const isDev = require('electron-is-dev');

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
  win.loadURL(
    isDev
      ? 'http://localhost:3000/scan'
      : `file://${path.join(__dirname, '../build/index.html')}`
  );


  // EVENT LISTENERS

  
  // Wait for a request to print a label from the front end
  ipcMain.on("print-label", async (event, data) => {

    // Parse the print data
    const printData = JSON.parse(data)

    // create download instance
    const download = new DownloaderHelper(printData.URL, __dirname, {
      fileName: "temporary-label.pdf"
    });

    // Set listener for Once Download is done, begin printing
    download.on('end', async () => {

      // Print label if it's a mac
      if (process.platform === "darwin") {
        await unixPrint.print("temporary-label.pdf", printData.printerName);
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

       await  windowsPrint.print("temporary-label.pdf", printingOptions);
      }


      // Delete temporary label file
      fs.unlinkSync("temporary-label.pdf");

    })


    
    // Start download
    download.start();

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