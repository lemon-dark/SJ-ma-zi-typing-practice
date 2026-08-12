const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const { execFileSync } = require('child_process');

// 检测当前进程是否以管理员权限运行（读取令牌完整性级别，与系统语言无关）
function isElevated() {
  if (process.platform !== 'win32') return false;
  try {
    const groups = execFileSync('whoami', ['/groups'], { encoding: 'utf8' });
    // S-1-16-12288 = High Mandatory Level（管理员），S-1-16-16384 = System
    return groups.includes('S-1-16-12288') || groups.includes('S-1-16-16384');
  } catch (e) {
    return false;
  }
}

// 单实例锁：已有实例运行时，第二个实例直接退出并聚焦已有窗口
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    frame: true,
    title: '码字 - 打字练习',
    backgroundColor: '#f0f2f5',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  win.loadFile(path.join(__dirname, 'index.html'));

  // 支持 Ctrl+/Ctrl- 缩放页面（Ctrl+0 恢复默认；Ctrl+滚轮 Chromium 原生支持，无需代码）
  const { webContents } = win;
  webContents.on('before-input-event', (event, input) => {
    if ((input.control || input.meta) && input.type === 'keyDown') {
      if (input.key === '=' || input.key === '+') {
        webContents.setZoomLevel(Math.min(webContents.getZoomLevel() + 0.5, 5));
        event.preventDefault();
      } else if (input.key === '-') {
        webContents.setZoomLevel(Math.max(webContents.getZoomLevel() - 0.5, -5));
        event.preventDefault();
      } else if (input.key === '0') {
        webContents.setZoomLevel(0);
        event.preventDefault();
      }
    }
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);

  // 管理员权限会让单实例锁在跨权限场景下失效（管理员实例先开、普通实例后开时会双开）。
  // 本应用无需管理员权限，检测到后提示并退出，引导用户改用普通方式启动。
  if (isElevated()) {
    dialog.showMessageBoxSync({
      type: 'warning',
      title: '码字 - 无需管理员权限',
      message: '本程序不需要以管理员身份运行。',
      detail: '以管理员身份运行会导致与普通方式打开的实例冲突（出现两个窗口或无法打开）。\n\n请关闭此提示后，用普通方式（双击）重新打开本程序。',
      buttons: ['确定'],
    });
    app.quit();
    return;
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
