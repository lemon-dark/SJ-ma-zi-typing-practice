// preload.js — 页面与主进程的安全桥（sandbox + contextIsolation 下唯一通道）
// 暴露缩放控制给页面：topbar 的「− / 100% / +」按钮通过它调整页面缩放。
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 设置缩放级别（0 = 100%，每级 ×1.2，范围 -4 ~ 6 ≈ 48% ~ 300%）
  setZoom: (level) => ipcRenderer.send('zoom-set', Number(level)),
  // 订阅主进程的缩放变更通知（Ctrl+滚轮 / 按钮调整后回传实际级别，用于刷新百分比显示）
  onZoomChanged: (callback) => {
    ipcRenderer.on('zoom-updated', (_event, level) => callback(Number(level)));
  },
});
