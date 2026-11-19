import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
  } catch (e) {
    console.error(e)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
}
