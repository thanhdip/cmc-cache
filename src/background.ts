'use strict'

import { app, protocol, BrowserWindow, ipcMain } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer'
import { getAllCoins, getCMCIds, updateHistoricalData, getJsonCacheFilenames, toExcel } from "./cmc"
const fs = require("fs-extra")
const isDevelopment = process.env.NODE_ENV !== 'production'
const path = require("path");
declare const __static: string;

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

async function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {

      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: (process.env
        .ELECTRON_NODE_INTEGRATION as unknown) as boolean,
      contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,
      preload: path.resolve(__static, "preload.js"),
    },
  })
  win.setMenuBarVisibility(false)

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string)
    if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
  }
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS_DEVTOOLS)
    } catch (e: unknown) {
      if (e instanceof Error) {
        console.error('Vue Devtools failed to install:', e.toString())
      }
    }
  }
  createWindow()
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}

ipcMain.on("update-cache", (event, payload) => {
  console.log("Updating cache...")
  let strCoins: string[] = []
  payload.coins.forEach((str: string) => {
    strCoins.push(str.split(" ")[1])
  });
  let cmcIds = getCMCIds(strCoins)
  cmcIds.forEach(
    coin => {
      updateHistoricalData(coin)
    }
  )
  console.log(cmcIds)
});


ipcMain.on("generate-excel", (event, payload) => {
  let allJsonCache = getJsonCacheFilenames()
  toExcel(allJsonCache, payload.startDate, payload.endDate)
});


ipcMain.on("all-coin-data", (event) => {
  console.log("Sending coin data...")
  event.reply("all-coin-data", getAllCoins())
});

ipcMain.on("save-data", (event, payload) => {
  console.log("Saving data...")
  const writeData = {
    coins: payload[0],
    startDate: payload[1]
  }
  fs.writeFileSync("./saved_data.json", JSON.stringify(writeData, null, 2))
});

ipcMain.on("get-saved-data", (event, payload) => {
  console.log("Sending saved coin data...")
  const savedData = JSON.parse(fs.readFileSync("./saved_data.json"))
  console.log(savedData)
  event.reply("get-saved-data", savedData)
});