const { app, BrowserWindow, Menu, dialog, screen, ipcMain } = require('electron');
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
  // 窗口尺寸按屏幕可用区域自适应，避免小屏幕（尤其 200% 缩放时逻辑分辨率减半）
  // 下窗口比屏幕还大、内容只显示左上角一小块、其余全是空白。
  // DIP 与逻辑像素相同：屏幕 1600×1000 @200% → 逻辑 800×500，窗口就取 800×500。
  const wa = screen.getPrimaryDisplay().workAreaSize;
  const width = Math.min(1280, wa.width);
  const height = Math.min(840, wa.height);
  const minW = Math.min(960, wa.width);
  const minH = Math.min(640, wa.height);

  const win = new BrowserWindow({
    width,
    height,
    minWidth: minW,
    minHeight: minH,
    frame: true,
    title: '码字 - 打字练习',
    backgroundColor: '#f0f2f5',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Ctrl+滚轮页面缩放（Windows 鼠标缩放的正解）：
  // 关键坑 1：before-input-event 只收键盘事件（input.type 只能是 keyUp/keyDown），
  // 鼠标滚轮永远不会触发它——之前"加了代码没用"的根因就在这。
  // 正确做法是监听 zoom-changed：用户用滚轮请求缩放时（Windows 上即 Ctrl+滚轮）
  // 触发，参数 zoomDirection 为 'in'/'out'，再手动 setZoomLevel 应用，
  // 行为与 Chrome 浏览器一致。范围 zoomLevel -4~6 ≈ 48%~300%。
  // 关键坑 2：绝不能调用 setVisualZoomLevelLimits —— 它会启用另一套独立的
  // "视觉缩放(visual zoom)"，一旦残留缩放状态（如 50%），setZoomLevel 无法重置，
  // 页面内容会被裁剪到左上角一小块、其余全是空白（用户实测过"只剩四分之一"）。
  win.webContents.on('zoom-changed', (event, zoomDirection) => {
    const step = 0.5; // 每格 ≈ 9.5%（与菜单 zoomIn 步长一致）
    const cur = win.webContents.getZoomLevel();
    const next = Math.min(6, Math.max(-4, cur + (zoomDirection === 'in' ? step : -step)));
    win.webContents.setZoomLevel(Math.round(next * 100) / 100);
    // 通知渲染进程刷新 topbar 百分比显示（页面通过 preload 订阅 zoom-updated）
    win.webContents.send('zoom-updated', Math.round(next * 100) / 100);
  });

  // 页面按钮（topbar 缩放控件）请求调整缩放：同样收口到 setZoomLevel + 通知
  ipcMain.on('zoom-set', (event, level) => {
    const w = BrowserWindow.fromWebContents(event.sender);
    if (!w) return;
    const clamped = Math.min(6, Math.max(-4, Number(level) || 0));
    w.webContents.setZoomLevel(clamped);
    w.webContents.send('zoom-updated', clamped);
  });

  // 每次启动强制回到 100% 缩放：Chromium 会把上次的缩放比例持久化到
  // 用户数据目录，若上次 Ctrl+滚轮放大过（如 131%+），重启后界面内容
  // 会放大到只占窗口左上角，其余全是空白背景，看起来像"白板"。
  // 这里在页面加载完成后统一重置，保证每次打开都是正常比例；
  // 用户随时可以用 Ctrl+滚轮 / Ctrl+0 再次调整。
  win.webContents.on('did-finish-load', () => {
    win.webContents.setZoomLevel(0);
    win.webContents.send('zoom-updated', 0);
  });

  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  // 应用菜单：保留缩放快捷键（Ctrl++/Ctrl+-/Ctrl+0），其余精简
  const template = [
    {
      label: 'View',
      submenu: [
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' },
        { type: 'separator' },
        { role: 'toggleDevTools' },
      ],
    },
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

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
