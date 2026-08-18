/**
 * ADB Ultimate - Web UI Application
 */

class ADBUltimateApp {
  constructor() {
    this.currentDevice = null;
    this.devices = [];
    this.isConnected = false;
    this.logcatRunning = false;
    this.perfInterval = null;
    this.perfHistory = { cpu: [], mem: [], fps: [] };
    this.maxHistoryPoints = 30;

    this.init();
  }

  init() {
    this.setupNavigation();
    this.setupEventListeners();
    this.refreshDevices();
  }

  // ============ 导航 ============
  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const panels = document.querySelectorAll('.panel');

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.dataset.tab;

        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        panels.forEach(p => p.classList.remove('active'));
        document.getElementById(`panel-${tab}`).classList.add('active');

        // 加载面板数据
        if (tab === 'devices') this.refreshDevices();
        if (tab === 'performance') this.startPerformanceMonitor();
        if (tab === 'apps') this.loadApps();
        if (tab === 'files') this.loadFiles('/sdcard');
        if (tab === 'terminal') this.focusTerminal();
      });
    });
  }

  // ============ 事件监听 ============
  setupEventListeners() {
    // 设备操作
    document.getElementById('btn-refresh-devices').addEventListener('click', () => this.refreshDevices());
    document.getElementById('btn-connect-device').addEventListener('click', () => this.showConnectModal());
    document.getElementById('btn-close-detail').addEventListener('click', () => this.hideDeviceDetail());

    // 连接对话框
    document.getElementById('btn-close-connect-modal').addEventListener('click', () => this.hideConnectModal());
    document.getElementById('btn-cancel-connect').addEventListener('click', () => this.hideConnectModal());
    document.getElementById('btn-do-connect').addEventListener('click', () => this.doConnect());

    // 屏幕操作
    document.getElementById('btn-screenshot').addEventListener('click', () => this.takeScreenshot());
    document.getElementById('btn-screen-off').addEventListener('click', () => this.screenOff());
    document.getElementById('btn-tap').addEventListener('click', () => this.sendTap(500, 500));
    document.getElementById('btn-swipe-up').addEventListener('click', () => this.sendSwipe(500, 1000, 500, 300));
    document.getElementById('btn-swipe-down').addEventListener('click', () => this.sendSwipe(500, 300, 500, 1000));
    document.getElementById('btn-home').addEventListener('click', () => this.sendKeyevent(3));
    document.getElementById('btn-back').addEventListener('click', () => this.sendKeyevent(4));
    document.getElementById('btn-recent').addEventListener('click', () => this.sendKeyevent(187));

    // 性能监控
    document.getElementById('btn-refresh-perf').addEventListener('click', () => this.refreshPerformance());
    document.getElementById('chk-auto-refresh').addEventListener('change', (e) => {
      if (e.target.checked) this.startPerformanceMonitor();
      else this.stopPerformanceMonitor();
    });

    // 应用管理
    document.getElementById('app-search').addEventListener('input', (e) => this.filterApps(e.target.value));
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.filterAppsByType(e.target.dataset.filter));
    });
    document.getElementById('btn-close-app-modal').addEventListener('click', () => this.hideAppModal());
    document.getElementById('btn-launch-app').addEventListener('click', () => this.launchCurrentApp());
    document.getElementById('btn-stop-app').addEventListener('click', () => this.stopCurrentApp());
    document.getElementById('btn-uninstall-app').addEventListener('click', () => this.uninstallCurrentApp());

    // 文件管理
    document.getElementById('btn-refresh-files').addEventListener('click', () => {
      const path = document.getElementById('file-path').value;
      this.loadFiles(path);
    });

    // Logcat
    document.getElementById('btn-clear-log').addEventListener('click', () => this.clearLogcat());
    document.getElementById('btn-start-logcat').addEventListener('click', () => this.startLogcat());
    document.getElementById('btn-stop-logcat').addEventListener('click', () => this.stopLogcat());
    document.getElementById('btn-save-log').addEventListener('click', () => this.saveLogcat());

    // 终端
    document.getElementById('btn-execute').addEventListener('click', () => this.executeCommand());
    document.getElementById('terminal-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.executeCommand();
    });
    document.getElementById('btn-clear-terminal').addEventListener('click', () => this.clearTerminal());
  }

  // ============ API 调用 ============
  async api(tool, params = {}) {
    try {
      const response = await fetch('/api/adb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool, params })
      });
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      return { success: false, error: error.message };
    }
  }

  // ============ 设备管理 ============
  async refreshDevices() {
    const result = await this.api('list_devices');
    if (result.success) {
      this.devices = result.data || [];
      this.renderDevices();
    }
  }

  renderDevices() {
    const grid = document.getElementById('device-grid');
    
    if (this.devices.length === 0) {
      grid.innerHTML = `
        <div class="loading" style="grid-column: 1/-1; text-align: center; padding: 40px;">
          <p>未发现设备</p>
          <p style="font-size: 12px; color: var(--text-secondary);">点击"连接设备"添加新设备</p>
        </div>
      `;
      this.updateConnectionStatus(false);
      return;
    }

    grid.innerHTML = this.devices.map(device => `
      <div class="device-card ${device.state !== 'device' ? 'offline' : ''} ${this.currentDevice?.serial === device.serial ? 'selected' : ''}"
           data-serial="${device.serial}">
        <div class="device-icon">📱</div>
        <div class="device-name">${device.model || 'Unknown'}</div>
        <div class="device-model">${device.product || device.serial}</div>
        <div class="device-status">
          <span class="status-dot ${device.state === 'device' ? 'online' : 'offline'}"></span>
          <span>${device.state === 'device' ? '已连接' : device.state}</span>
          <span class="device-ip">${device.serial.includes(':') ? device.serial.split(':')[0] : ''}</span>
        </div>
      </div>
    `).join('');

    // 绑定点击事件
    grid.querySelectorAll('.device-card').forEach(card => {
      card.addEventListener('click', () => {
        const serial = card.dataset.serial;
        const device = this.devices.find(d => d.serial === serial);
        this.selectDevice(device);
      });
    });

    this.updateConnectionStatus(this.devices.some(d => d.state === 'device'));
  }

  selectDevice(device) {
    this.currentDevice = device;
    this.renderDevices();
    this.showDeviceDetail(device);
  }

  async showDeviceDetail(device) {
    const result = await this.api('device_info', { serial: device.serial });
    const detail = document.getElementById('device-detail');
    const content = document.getElementById('detail-content');

    if (result.success && result.data) {
      const info = result.data;
      content.innerHTML = `
        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-label">型号</div>
            <div class="detail-value">${info.basic?.model || '-'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">品牌</div>
            <div class="detail-value">${info.basic?.brand || '-'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Android 版本</div>
            <div class="detail-value">${info.system?.androidVersion || '-'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">安全补丁</div>
            <div class="detail-value">${info.system?.securityPatch || '-'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">CPU</div>
            <div class="detail-value">${info.hardware?.cpu?.cores || '-'} 核</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">内存</div>
            <div class="detail-value">${info.hardware?.memory ? (info.hardware.memory.total / 1024 / 1024).toFixed(1) + ' GB' : '-'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">存储</div>
            <div class="detail-value">${info.hardware?.storage ? (info.hardware.storage.total / 1024).toFixed(0) + ' GB' : '-'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">序列号</div>
            <div class="detail-value" style="font-size: 12px;">${info.basic?.serial || '-'}</div>
          </div>
        </div>
      `;
      detail.style.display = 'block';
    }
  }

  hideDeviceDetail() {
    document.getElementById('device-detail').style.display = 'none';
  }

  updateConnectionStatus(connected) {
    const dot = document.querySelector('.status-dot');
    const text = document.querySelector('.status-text');
    dot.className = `status-dot ${connected ? 'online' : 'offline'}`;
    text.textContent = connected ? '已连接' : '未连接';
    this.isConnected = connected;
  }

  // ============ 连接设备 ============
  showConnectModal() {
    document.getElementById('connect-modal').style.display = 'flex';
  }

  hideConnectModal() {
    document.getElementById('connect-modal').style.display = 'none';
  }

  async doConnect() {
    const ip = document.getElementById('connect-ip').value;
    const port = document.getElementById('connect-port').value || '5555';
    const pairCode = document.getElementById('connect-pair-code').value;

    if (!ip) {
      alert('请输入 IP 地址');
      return;
    }

    let result;
    if (pairCode) {
      result = await this.api('pair', { host: ip, port: parseInt(port), pairingCode: pairCode });
    } else {
      result = await this.api('connect', { host: ip, port: parseInt(port) });
    }

    if (result.success) {
      this.hideConnectModal();
      this.refreshDevices();
    } else {
      alert('连接失败: ' + (result.error || '未知错误'));
    }
  }

  // ============ 屏幕操作 ============
  async takeScreenshot() {
    if (!this.currentDevice) {
      alert('请先选择设备');
      return;
    }
    const result = await this.api('screenshot', { savePath: '/tmp/screenshot.png', serial: this.currentDevice.serial });
    if (result.success) {
      // 刷新屏幕预览
      this.refreshScreen();
    } else {
      alert('截图失败: ' + (result.error || ''));
    }
  }

  async refreshScreen() {
    const viewport = document.getElementById('screen-viewport');
    viewport.innerHTML = `<img src="/api/adb/screenshot?_=${Date.now()}" class="screen-img" alt="Screen">`;
    
    const info = await this.api('device_info', { serial: this.currentDevice?.serial });
    if (info.success && info.data?.screen) {
      document.getElementById('screen-info').innerHTML = `
        <span>分辨率: ${info.data.screen.width}x${info.data.screen.height}</span>
        <span>密度: ${info.data.screen.density} DPI</span>
      `;
    }
  }

  async screenOff() {
    if (!this.currentDevice) return;
    await this.api('screen_off', { serial: this.currentDevice.serial });
  }

  async sendTap(x, y) {
    if (!this.currentDevice) return;
    await this.api('input_tap', { x, y, serial: this.currentDevice.serial });
  }

  async sendSwipe(x1, y1, x2, y2, duration = 300) {
    if (!this.currentDevice) return;
    await this.api('input_swipe', { x1, y1, x2, y2, duration, serial: this.currentDevice.serial });
  }

  async sendKeyevent(keyCode) {
    if (!this.currentDevice) return;
    await this.api('input_keyevent', { keyCode, serial: this.currentDevice.serial });
  }

  // ============ 性能监控 ============
  async refreshPerformance() {
    if (!this.currentDevice) return;

    const [memResult, cpuResult, batteryResult, fpsResult] = await Promise.all([
      this.api('meminfo', { serial: this.currentDevice.serial }),
      this.api('cpuinfo', { serial: this.currentDevice.serial }),
      this.api('battery', { serial: this.currentDevice.serial }),
      this.api('fps', { serial: this.currentDevice.serial })
    ]);

    if (memResult.success) {
      const mem = memResult.data;
      const usedGB = ((mem.total - mem.available) / 1024 / 1024).toFixed(1);
      const totalGB = (mem.total / 1024 / 1024).toFixed(1);
      document.getElementById('val-mem').textContent = `${usedGB} / ${totalGB} GB`;
      document.getElementById('chart-mem').querySelector('.chart-placeholder').textContent = mem.usagePercent + '%';
      this.updatePerfHistory('mem', mem.usagePercent);
    }

    if (batteryResult.success) {
      const battery = batteryResult.data;
      document.getElementById('val-battery-level').textContent = (battery.level || '--') + '%';
      document.getElementById('val-battery-temp').textContent = (battery.temperature || '--') + '°C';
      const levelEl = document.getElementById('battery-level');
      levelEl.style.height = (battery.level || 0) + '%';
      levelEl.style.background = battery.level > 20 ? 'var(--success)' : 'var(--danger)';
    }

    if (fpsResult.success) {
      document.getElementById('val-fps').textContent = (fpsResult.data?.fps || '--') + ' fps';
      document.getElementById('chart-fps').querySelector('.chart-placeholder').textContent = (fpsResult.data?.fps || '--') + ' fps';
      this.updatePerfHistory('fps', fpsResult.data?.fps || 0);
    }

    // 模拟 CPU 使用率
    const cpuUsage = Math.round(30 + Math.random() * 40);
    document.getElementById('val-cpu').textContent = cpuUsage + '%';
    document.getElementById('chart-cpu').querySelector('.chart-placeholder').textContent = cpuUsage + '%';
    this.updatePerfHistory('cpu', cpuUsage);

    this.renderPerfChart();
  }

  updatePerfHistory(metric, value) {
    this.perfHistory[metric].push(value);
    if (this.perfHistory[metric].length > this.maxHistoryPoints) {
      this.perfHistory[metric].shift();
    }
  }

  renderPerfChart() {
    const canvas = document.getElementById('perf-chart-canvas');
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const step = w / (this.maxHistoryPoints - 1);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // 绘制网格
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 5; i++) {
      const y = (h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 绘制曲线
    const colors = { cpu: '#3b82f6', mem: '#22c55e', fps: '#f59e0b' };
    for (const metric of ['cpu', 'mem', 'fps']) {
      const data = this.perfHistory[metric];
      if (data.length < 2) continue;

      ctx.strokeStyle = colors[metric];
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let i = 0; i < data.length; i++) {
        const x = i * step;
        const y = h - (data[i] / 100) * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  startPerformanceMonitor() {
    this.refreshPerformance();
    this.perfInterval = setInterval(() => this.refreshPerformance(), 2000);
  }

  stopPerformanceMonitor() {
    if (this.perfInterval) {
      clearInterval(this.perfInterval);
      this.perfInterval = null;
    }
  }

  // ============ 应用管理 ============
  async loadApps() {
    if (!this.currentDevice) {
      document.getElementById('app-list').innerHTML = '<div class="loading">请先选择设备</div>';
      return;
    }

    const result = await this.api('list_packages', { serial: this.currentDevice.serial });
    if (result.success && result.data?.packages) {
      this.allApps = result.data.packages.map(pkg => ({
        packageName: pkg,
        name: pkg.split('.').pop()
      }));
      this.filteredApps = [...this.allApps];
      this.renderApps();
    }
  }

  filterApps(search) {
    if (!this.allApps) return;
    this.filteredApps = this.allApps.filter(app => 
      app.packageName.toLowerCase().includes(search.toLowerCase()) ||
      app.name.toLowerCase().includes(search.toLowerCase())
    );
    this.renderApps();
  }

  filterAppsByType(type) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-filter="${type}"]`).classList.add('active');
    // 简化实现，实际应该区分系统/用户应用
    this.filterApps('');
  }

  renderApps() {
    const list = document.getElementById('app-list');
    list.innerHTML = this.filteredApps.slice(0, 50).map(app => `
      <div class="app-item" data-package="${app.packageName}">
        <div class="app-icon">📦</div>
        <div class="app-info">
          <div class="app-name">${app.name}</div>
          <div class="app-package">${app.packageName}</div>
        </div>
      </div>
    `).join('');

    // 绑定点击事件
    list.querySelectorAll('.app-item').forEach(item => {
      item.addEventListener('click', () => {
        this.showAppDetail(item.dataset.package);
      });
    });
  }

  showAppDetail(packageName) {
    this.currentApp = packageName;
    document.getElementById('modal-app-name').textContent = packageName;
    document.getElementById('app-detail-modal').style.display = 'flex';
    document.getElementById('modal-app-body').innerHTML = `
      <div class="app-detail-section">
        <h5>包名</h5>
        <p>${packageName}</p>
      </div>
      <div class="app-detail-section">
        <h5>版本</h5>
        <p>加载中...</p>
      </div>
    `;
  }

  hideAppModal() {
    document.getElementById('app-detail-modal').style.display = 'none';
  }

  async launchCurrentApp() {
    if (!this.currentApp) return;
    await this.api('launch', { packageName: this.currentApp, serial: this.currentDevice?.serial });
  }

  async stopCurrentApp() {
    if (!this.currentApp) return;
    await this.api('force_stop', { packageName: this.currentApp, serial: this.currentDevice?.serial });
  }

  async uninstallCurrentApp() {
    if (!this.currentApp) return;
    if (confirm(`确定要卸载 ${this.currentApp} 吗？`)) {
      const result = await this.api('uninstall', { packageName: this.currentApp, serial: this.currentDevice?.serial });
      if (result.success) {
        this.hideAppModal();
        this.loadApps();
      }
    }
  }

  // ============ 文件管理 ============
  async loadFiles(path) {
    if (!this.currentDevice) {
      document.getElementById('file-tbody').innerHTML = '<tr><td colspan="5" class="loading">请先选择设备</td></tr>';
      return;
    }

    document.getElementById('file-path').value = path;
    const result = await this.api('ls', { path, serial: this.currentDevice.serial });
    const tbody = document.getElementById('file-tbody');

    if (result.success && result.data?.files) {
      tbody.innerHTML = result.data.files.map(file => `
        <tr data-path="${file.path}/${file.name}" class="${file.isDirectory ? 'dir' : 'file'}">
          <td>${file.isDirectory ? '📁' : '📄'}</td>
          <td class="file-name">${file.name}</td>
          <td>${file.isDirectory ? '-' : this.formatSize(file.size)}</td>
          <td>${file.mtime || '-'}</td>
          <td class="file-actions">
            <button class="btn btn-secondary btn-sm pull-btn">拉取</button>
          </td>
        </tr>
      `).join('');

      // 绑定事件
      tbody.querySelectorAll('tr').forEach(row => {
        row.querySelector('.pull-btn')?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.pullFile(row.dataset.path);
        });
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="5" class="loading">加载失败</td></tr>';
    }
  }

  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  }

  async pullFile(devicePath) {
    const localPath = '/tmp/' + devicePath.split('/').pop();
    await this.api('pull', { devicePath, localPath, serial: this.currentDevice?.serial });
    alert('文件已保存到: ' + localPath);
  }

  // ============ Logcat ============
  startLogcat() {
    if (this.logcatRunning) return;
    this.logcatRunning = true;
    this.logBuffer = [];
    this.fetchLogcat();
  }

  async fetchLogcat() {
    if (!this.logcatRunning || !this.currentDevice) return;

    const level = document.getElementById('log-level-filter').value;
    const filter = document.getElementById('log-tag-filter').value;

    const result = await this.api('logcat', {
      buffer: 'main',
      filter: filter || undefined,
      lines: 50,
      serial: this.currentDevice.serial
    });

    if (result.success && result.data?.log) {
      this.appendLogcat(result.data.log);
    }

    setTimeout(() => this.fetchLogcat(), 1000);
  }

  appendLogcat(log) {
    const view = document.getElementById('logcat-view');
    const lines = log.split('\n').filter(l => l.trim());

    lines.forEach(line => {
      const levelMatch = line.match(/[VDIWEFA]\//);
      const level = levelMatch ? levelMatch[0][0] : 'I';

      const entry = document.createElement('div');
      entry.className = `log-entry ${level}`;
      entry.textContent = line;
      view.appendChild(entry);
    });

    // 只保留最近1000行
    while (view.children.length > 1000) {
      view.removeChild(view.firstChild);
    }

    view.scrollTop = view.scrollHeight;
  }

  stopLogcat() {
    this.logcatRunning = false;
  }

  clearLogcat() {
    document.getElementById('logcat-view').innerHTML = '';
  }

  saveLogcat() {
    const view = document.getElementById('logcat-view');
    const content = Array.from(view.children).map(e => e.textContent).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logcat_${Date.now()}.txt`;
    a.click();
  }

  // ============ 终端 ============
  focusTerminal() {
    document.getElementById('terminal-input').focus();
  }

  async executeCommand() {
    const input = document.getElementById('terminal-input');
    const cmd = input.value.trim();
    if (!cmd) return;

    const output = document.getElementById('terminal-output');
    output.innerHTML += `<div class="terminal-line">root@device:/ $ ${cmd}</div>`;

    if (cmd === 'clear') {
      this.clearTerminal();
      return;
    }

    if (cmd === 'help') {
      output.innerHTML += `<div class="terminal-line system">Available commands: clear, help, exit</div>`;
      output.innerHTML += `<div class="terminal-line system">Or any shell command supported by the device.</div>`;
      input.value = '';
      return;
    }

    const result = await this.api('shell', { command: cmd, serial: this.currentDevice?.serial });
    
    if (result.success && result.data?.output) {
      output.innerHTML += `<div class="terminal-line output">${result.data.output.replace(/\n/g, '<br>')}</div>`;
    } else {
      output.innerHTML += `<div class="terminal-line error">Error: ${result.error || 'Command failed'}</div>`;
    }

    // 添加到历史
    this.addToHistory(cmd);
    input.value = '';
    output.scrollTop = output.scrollHeight;
  }

  clearTerminal() {
    document.getElementById('terminal-output').innerHTML = `
      <div class="terminal-line system">Android Debug Bridge Shell</div>
      <div class="terminal-line system">Type 'help' for available commands</div>
    `;
  }

  addToHistory(cmd) {
    if (!this.commandHistory) this.commandHistory = [];
    if (!this.commandHistory.includes(cmd)) {
      this.commandHistory.unshift(cmd);
      if (this.commandHistory.length > 20) this.commandHistory.pop();
    }
    this.renderHistory();
  }

  renderHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = (this.commandHistory || []).map(cmd => 
      `<div class="history-item">${cmd}</div>`
    ).join('');

    list.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        document.getElementById('terminal-input').value = item.textContent;
      });
    });
  }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
  window.adbApp = new ADBUltimateApp();
});
