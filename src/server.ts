/**
 * ADB Ultimate - Web Server
 * 提供 Web UI 和 ADB API 服务
 */

import express from 'express';
import { createServer } from 'http';
import { AdbClient } from './adb';

const app = express();
const PORT = 3456;

// 创建 ADB 客户端
const adb = new AdbClient({
  adbPath: '/usr/local/bin/adb',
  timeoutMs: 30000
});

// 中间件
app.use(express.json());
app.use(express.static(__dirname + '/../web/public'));

// 允许跨域
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ============ API 路由 ============

/**
 * ADB 工具调用接口
 * POST /api/adb
 * Body: { tool: string, params: object }
 */
app.post('/api/adb', async (req, res) => {
  const { tool, params } = req.body;

  if (!tool) {
    return res.status(400).json({ success: false, error: 'Missing tool name' });
  }

  try {
    let result: any;

    switch (tool) {
      // 设备管理
      case 'list_devices':
        result = await adb.listDevices();
        return res.json({ success: true, data: result });

      case 'connect':
        result = await adb.connect(params.host, params.port || 5555);
        return res.json({ success: true, data: { connected: result } });

      case 'disconnect':
        result = await adb.disconnect(params.host, params.port || 5555);
        return res.json({ success: true, data: { disconnected: result } });

      case 'pair':
        result = await adb.pair(params.host, params.port, params.pairingCode);
        return res.json({ success: true, data: { paired: result } });

      case 'device_info':
        result = await adb.getDeviceInfo(params.serial);
        return res.json({ success: true, data: result });

      // 屏幕操作
      case 'screenshot':
        result = await adb.screenshot(params.savePath, params.serial);
        return res.json({ success: true, data: { path: result } });

      case 'screen_on':
        result = await adb.screenOn(params.serial);
        return res.json({ success: true, data: { message: 'Screen on' } });

      case 'screen_off':
        result = await adb.screenOff(params.serial);
        return res.json({ success: true, data: { message: 'Screen off' } });

      // 输入模拟
      case 'input_tap':
        result = await adb.tap(params.x, params.y, params.serial);
        return res.json({ success: true, data: { message: `Tapped at (${params.x}, ${params.y})` } });

      case 'input_swipe':
        result = await adb.swipe(params.x1, params.y1, params.x2, params.y2, params.duration || 300, params.serial);
        return res.json({ success: true, data: { message: 'Swiped' } });

      case 'input_text':
        result = await adb.inputText(params.text, params.serial);
        return res.json({ success: true, data: { message: 'Text input' } });

      case 'input_keyevent':
        result = await adb.keyEvent(params.keyCode, params.serial);
        return res.json({ success: true, data: { message: `Key event: ${params.keyCode}` } });

      // 应用管理
      case 'install':
        result = await adb.install(params.apkPath, params.options || {}, params.serial);
        return res.json({ success: true, data: { success: result } });

      case 'uninstall':
        result = await adb.uninstall(params.packageName, params.serial);
        return res.json({ success: true, data: { success: result } });

      case 'launch':
        result = await adb.launch(params.packageName, params.serial);
        return res.json({ success: true, data: { message: 'Launched' } });

      case 'force_stop':
        result = await adb.forceStop(params.packageName, params.serial);
        return res.json({ success: true, data: { message: 'Force stopped' } });

      case 'list_packages':
        result = await adb.listPackages(params.serial);
        return res.json({ success: true, data: { packages: result } });

      // 文件管理
      case 'pull':
        result = await adb.pull(params.devicePath, params.localPath, params.serial);
        return res.json({ success: true, data: { path: result } });

      case 'push':
        result = await adb.push(params.localPath, params.devicePath, params.serial);
        return res.json({ success: true, data: { message: 'Pushed' } });

      case 'ls':
        result = await adb.ls(params.path, params.serial);
        return res.json({ success: true, data: { files: result } });

      case 'shell':
        result = await adb.shell(params.command, params.serial);
        return res.json({ success: true, data: { output: result } });

      // 性能监控
      case 'meminfo':
        result = await adb.getMemoryInfo(params.serial);
        return res.json({ success: true, data: result });

      case 'cpuinfo':
        result = await adb.getCpuInfo(params.serial);
        return res.json({ success: true, data: result });

      case 'fps':
        result = await adb.getFps(params.serial);
        return res.json({ success: true, data: { fps: result } });

      case 'battery':
        result = await adb.getBatteryInfo(params.serial);
        return res.json({ success: true, data: result });

      case 'perf_snapshot':
        const [mem, cpu, fps, battery] = await Promise.all([
          adb.getMemoryInfo(params.serial),
          adb.getCpuInfo(params.serial),
          adb.getFps(params.serial),
          adb.getBatteryInfo(params.serial),
        ]);
        return res.json({
          success: true,
          data: { memory: mem, cpu, fps, battery, timestamp: new Date().toISOString() }
        });

      // 日志调试
      case 'logcat':
        result = await adb.logcat({
          buffer: params.buffer,
          filter: params.filter,
          lines: params.lines
        }, params.serial);
        return res.json({ success: true, data: { log: result } });

      case 'bugreport':
        result = await adb.bugreport(params.savePath, params.serial);
        return res.json({ success: true, data: { path: result } });

      case 'dumpsys':
        result = await adb.dumpsys(params.service, params.serial);
        return res.json({ success: true, data: { service: params.service, info: result } });

      case 'getprop':
        result = await adb.getProp(params.property, params.serial);
        return res.json({ success: true, data: { property: params.property, value: result } });

      // 系统控制
      case 'reboot':
        result = await adb.reboot(params.mode || 'normal', params.serial);
        return res.json({ success: true, data: { message: `Rebooting to ${params.mode || 'normal'}...` } });

      default:
        return res.status(404).json({ success: false, error: `Unknown tool: ${tool}` });
    }
  } catch (error: any) {
    console.error(`Error in tool ${tool}:`, error);
    return res.status(500).json({ success: false, error: error.message || 'Internal error' });
  }
});

// ============ 截图服务 ============

app.get('/api/adb/screenshot', async (req, res) => {
  try {
    // 获取默认设备的截图
    const devices = await adb.listDevices();
    const device = devices.find(d => d.state === 'device');

    if (!device) {
      return res.status(404).send('No device connected');
    }

    const tempPath = '/tmp/adb_ultimate_screenshot.png';
    await adb.screenshot(tempPath, device.serial);

    res.sendFile(tempPath);
  } catch (error: any) {
    console.error('Screenshot error:', error);
    res.status(500).send('Screenshot failed');
  }
});

// ============ 启动服务器 ============

const server = createServer(app);

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   ADB Ultimate Web Server                          ║
║   🌐 http://localhost:${PORT}                        ║
║                                                   ║
║   设备管理面板已启动                               ║
║   在 DSH Agent 中可直接使用 adb_* 工具              ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
  `);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.close();
  process.exit(0);
});

export { app, server };
