/**
 * ADB 工具集
 * 所有 Agent 可调用的 ADB 工具
 */

import { getDefaultClient } from '../adb';
import type { ToolResult, DeviceFullInfo, BatteryInfo, MemoryInfo, CpuInfo } from '../types';

// ============ 工具定义辅助函数 ============

function ok<T>(data: T): ToolResult {
  return { success: true, data };
}

function err(message: string): ToolResult {
  return { success: false, error: message };
}

// ============ 设备管理工具 ============

/**
 * 列出所有已连接的设备
 */
export async function adb_list_devices(): Promise<ToolResult> {
  try {
    const client = getDefaultClient();
    const devices = await client.listDevices();
    return ok(devices);
  } catch (e: any) {
    return err(e.message);
  }
}

/**
 * 连接到无线设备
 */
export async function adb_connect(host: string, port: number = 5555): Promise<ToolResult> {
  try {
    const client = getDefaultClient();
    const success = await client.connect(host, port);
    return ok({ connected: success, address: `${host}:${port}` });
  } catch (e: any) {
    return err(e.message);
  }
}

/**
 * 断开无线设备连接
 */
export async function adb_disconnect(host: string, port: number = 5555): Promise<ToolResult> {
  try {
    const client = getDefaultClient();
    const success = await client.disconnect(host, port);
    return ok({ disconnected: success, address: `${host}:${port}` });
  } catch (e: any) {
    return err(e.message);
  }
}

/**
 * 配对无线设备
 */
export async function adb_pair(host: string, port: number, pairingCode: string): Promise<ToolResult> {
  try {
    const client = getDefaultClient();
    const success = await client.pair(host, port, pairingCode);
    return ok({ paired: success, address: `${host}:${port}` });
  } catch (e: any) {
    return err(e.message);
  }
}

/**
 * 获取设备完整信息
 */
export async function adb_device_info(serial?: string): Promise<ToolResult> {
  try {
    const client = getDefaultClient();
    const info = await client.getDeviceInfo(serial);
    return ok(info);
  } catch (e: any) {
    return err(e.message);
  }
}

// ============ 屏幕操作工具 ============

/**
 * 截图
 */
export async function adb_screenshot(savePath?: string, serial?: string): Promise<ToolResult> {
  try {
    const client = getDefaultClient();
    const path = await client.screenshot(savePath);
    return ok({ path, message: 'Screenshot saved successfully' });
  } catch (e: any) {
    return err(e.message);
  }
}

/**
 * 录屏 (需要手动停止)
 */
export async function adb_screen_record(
  duration: number = 30,
  savePath?: string,
  serial?: string
): Promise<ToolResult> {
  try {
    const client = getDefaultClient();
    const s = serial || client['defaultSerial'];
    const tempPath = savePath || `/sdcard/screenrecord_${Date.now()}.mp4`;

    // 开始录屏
    client.exec(`shell screenrecord --time-limit ${duration} ${tempPath}`, { serial: s });

    return ok({
      message: `Recording started, will stop after ${duration} seconds`,
      path: tempPath,
    });
  } catch (e: any) {
    return err(e.message);
  }
}

/**
 * 屏幕亮屏
 */
export async function adb_screen_on(serial?: string): Promise<ToolResult> {
  try {
    const client = getDefaultClient();
    await client.screenOn(serial);
    return ok({ message: 'Screen turned on' });
  } catch (e: any) {
    return err(e.message);
  }
}

/**
 * 屏幕灭屏
 */
export async function adb_screen_off(serial?: string): Promise<ToolResult> {
  try {
    const client = getDefaultClient();
    await client.screenOff(serial);
    return ok({ message: 'Screen turned off' });
  } catch (e: any) {
    return err(e.message);
  }
}

// ============ 输入模拟工具 ============

/**
 * 模拟点击
 */
export async function adb_input_tap(x: number, y: number, serial?: string): Promise<ToolResult> {
  try {
    const client = getDefaultClient();
    await client.tap(x, y, serial);
    return ok({ message: `Tapped at (${x}, ${y})` });
  } catch (e: any) {
    return err(e.message);
  }
}

/**
 * 模拟滑动
 */
export async function adb_input_swipe(
  x1: number, y1: number,
  x2: number, y2: number,
  duration: number = 300,
  serial?: string
): Promise<ToolResult> {
  try {
    const client = getDefaultClient();
    await client.swipe(x1, y1, x2, y2, duration, serial);
    return ok({ message: `Swiped from (${x1}, ${y1}) to (${x2}, ${y2})` });
  } catch (e: any) {
    return err(e.message);
  }
}

/**
 * 输入文本
 */
export async function adb_input_text(text: string, serial?: string): Promise<ToolResult> {
  try {
    const client = getDefaultClient();
    await client.inputText(text, serial);
    return ok({ message: `Text input: ${text}` });
  } catch (e: any) {
    return err(e.message);
  }
}

/**
 * 按键事件
 */
export async function adb_input_keyevent(keyCode: number | string, serial?: string): Promise<ToolResult> {
  try {
    const client = getDefaultClient();
    await client.keyEvent(keyCode, serial);
    return ok({ message: `Key event: ${keyCode}` });
  } catch (e: any) {
    return err(e.message);
  }
}

// ============ 应用管理工具 ============

/**
 * 安装 APK
 */
export async function adb_install(apkPath: string, options: { replace?: boolean; grant?: boolean } = {}, serial?: string): Promise<ToolResult> {
  try {
    const client = getDefaultClient();
    const success = await client.install(apkPath, options, serial);
    return ok({ success, message: success ? 'App installed successfully' : 'Installation failed' });
  } catch (e: any) {
    return err(e.message);
  }
}

/**
 * 卸载应用
 */
export async function adb_uninstall(packageName: string, serial?: string): Promise<ToolResult> {
  try {
    const client = getDefaultClient();
    const success = await client.uninstall(packageName, serial);
    return ok({ success, message: success ? 'App uninstalled successfully' : 'Uninstall failed' });
  } catch (e: any) {
    return err(e.message);
  }
}

/**
 * 启动应用
 */
export async function adb_launch(packageName: string, serial?: string): Promise<ToolResult> {
  try {
    const client = getDefaultClient();
    await client.launch(packageName, serial);
    return ok({ message: `Launched: ${packageName}` });
  } catch (e: any) {
    return err(e.message);
  }
}

/**
 * 强制停止应用
 */
export async function adb_force_stop(packageName: string, serial?: string): Promise<ToolResult> {
  try {
    const client = getDefaultClient();
    await client.forceStop(packageName, serial);
    return ok({ message: `Force stopped: ${packageName}` });
  } catch (e: any) {
    return err(e.message);
  }
}

/**
 * 列出已安装应用
 */
export async function adb_list_packages(serial?: string): Promise<ToolResult> {
  try {
    const client = getDefaultClient();
    const packages = await client.listPackages(serial);
    return ok({ count: packages.length, packages });
  } catch (e: any) {
    return err(e.message);
  }
}

// ============ 文件管理工具 ============

/**
 * 拉取文件
 */
export async function adb_pull(devicePath: string, localPath: string, serial?: string): Promise<ToolResult> {
  try {
    const client = getDefaultClient();
    const path = await client.pull(devicePath, localPath, serial);
    return ok({ path, message: 'File pulled successfully' });
  } catch (e: any) {
    return err(e.message);
  }
}

/**
 * 推送文件
 */
export async function adb_push(localPath: string, devicePath: string, serial?: string): Promise<ToolResult> {
  try {
    const client = getDefaultClient();
    await client.push(localPath, devicePath, serial);
    return ok({ message: `File pushed to: ${devicePath}` });
  } catch (e: any) {
    return err(e.message);
  }
}

/**
 * 执行 Shell 命令
 */
export async function adb_shell(command: string, serial?: string): Promise<ToolResult> {
  try {
    const client = getDefaultClient();
    const output = await client.shell(command, serial);
    return ok({ output });
  } catch (e: any) {
    return err(e.message);
  }
}

/**
 * 列出目录
 */
export async function adb_ls(path: string, serial?: string): Promise<ToolResult> {
  try {
    const client = getDefaultClient();
    const files = await client.ls(path, serial);
    return ok({ path, files });
  } catch (e: any) {
    return err(e.message);
  }
}

// ============ 性能监控工具 ============

/**
 * 获取内存信息
 */
export async function adb_meminfo(serial?: string): Promise<ToolResult> {
  try {
    const client = getDefaultClient();
    const mem = await client.getMemoryInfo(serial);
    return ok({
      ...mem,
      totalGB: (mem.total / 1024 / 1024).toFixed(2) + ' GB',
      availableGB: (mem.available / 1024 / 1024).toFixed(2) + ' GB',
      usedGB: ((mem.total - mem.available) / 1024 / 1024).toFixed(2) + ' GB',
    });
  } catch (e: any) {
    return err(e.message);
  }
}

/**
 * 获取 CPU 信息
 */
export async function adb_cpuinfo(serial?: string): Promise<ToolResult> {
  try {
    const client = getDefaultClient();
    const cpu = await client.getCpuInfo(serial);
    return ok(cpu);
  } catch (e: any) {
    return err(e.message);
  }
}

/**
 * 获取 FPS
 */
export async function adb_fps(serial?: string): Promise<ToolResult> {
  try {
    const client = getDefaultClient();
    const fps = await client.getFps(serial);
    return ok({ fps, status: fps >= 55 ? 'good' : fps >= 30 ? 'normal' : 'poor' });
  } catch (e: any) {
    return err(e.message);
  }
}

/**
 * 获取电池信息
 */
export async function adb_battery(serial?: string): Promise<ToolResult> {
  try {
    const client = getDefaultClient();
    const battery = await client.getBatteryInfo(serial);
    return ok(battery);
  } catch (e: any) {
    return err(e.message);
  }
}

/**
 * 性能快照
 */
export async function adb_perf_snapshot(serial?: string): Promise<ToolResult> {
  try {
    const client = getDefaultClient();
    const [mem, cpu, fps, battery] = await Promise.all([
      client.getMemoryInfo(serial),
      client.getCpuInfo(serial),
      client.getFps(serial),
      client.getBatteryInfo(serial),
    ]);

    return ok({
      timestamp: new Date().toISOString(),
      memory: mem,
      cpu: { cores: cpu.cores, usage: 'N/A' },
      fps,
      battery,
    });
  } catch (e: any) {
    return err(e.message);
  }
}

// ============ 日志调试工具 ============

/**
 * 获取 Logcat
 */
export async function adb_logcat(options: {
  buffer?: 'main' | 'system' | 'crash';
  filter?: string;
  lines?: number;
} = {}, serial?: string): Promise<ToolResult> {
  try {
    const client = getDefaultClient();
    const log = await client.logcat(options, serial);
    return ok({ log });
  } catch (e: any) {
    return err(e.message);
  }
}

/**
 * 获取 Bug Report
 */
export async function adb_bugreport(savePath?: string, serial?: string): Promise<ToolResult> {
  try {
    const client = getDefaultClient();
    const path = await client.bugreport(savePath, serial);
    return ok({ path, message: 'Bug report saved' });
  } catch (e: any) {
    return err(e.message);
  }
}

/**
 * 获取 dumpsys 信息
 */
export async function adb_dumpsys(service: string, serial?: string): Promise<ToolResult> {
  try {
    const client = getDefaultClient();
    const info = await client.dumpsys(service, serial);
    return ok({ service, info });
  } catch (e: any) {
    return err(e.message);
  }
}

/**
 * 获取系统属性
 */
export async function adb_getprop(property: string, serial?: string): Promise<ToolResult> {
  try {
    const client = getDefaultClient();
    const value = await client.getProp(property, serial);
    return ok({ property, value });
  } catch (e: any) {
    return err(e.message);
  }
}

// ============ 系统控制工具 ============

/**
 * 重启设备
 */
export async function adb_reboot(mode: 'normal' | 'recovery' | 'bootloader' | 'fastboot' = 'normal', serial?: string): Promise<ToolResult> {
  try {
    const client = getDefaultClient();
    await client.reboot(mode, serial);
    return ok({ message: `Rebooting to ${mode}...` });
  } catch (e: any) {
    return err(e.message);
  }
}

// ============ 工具定义元数据 ============

export const toolDefinitions = [
  // 设备管理
  {
    name: 'adb_list_devices',
    description: '列出所有已连接的 ADB 设备',
    parameters: [],
  },
  {
    name: 'adb_connect',
    description: '通过 WiFi 连接到 Android 设备',
    parameters: [
      { name: 'host', description: '设备 IP 地址', type: 'string', required: true },
      { name: 'port', description: '端口号，默认 5555', type: 'number', required: false, default: 5555 },
    ],
  },
  {
    name: 'adb_disconnect',
    description: '断开无线设备连接',
    parameters: [
      { name: 'host', description: '设备 IP 地址', type: 'string', required: true },
      { name: 'port', description: '端口号，默认 5555', type: 'number', required: false, default: 5555 },
    ],
  },
  {
    name: 'adb_pair',
    description: '配对无线设备',
    parameters: [
      { name: 'host', description: '设备 IP 地址', type: 'string', required: true },
      { name: 'port', description: '配对端口', type: 'number', required: true },
      { name: 'pairingCode', description: '配对码', type: 'string', required: true },
    ],
  },
  {
    name: 'adb_device_info',
    description: '获取设备完整信息',
    parameters: [
      { name: 'serial', description: '设备序列号', type: 'string', required: false },
    ],
  },

  // 屏幕操作
  {
    name: 'adb_screenshot',
    description: '截取设备屏幕',
    parameters: [
      { name: 'savePath', description: '保存路径', type: 'string', required: false },
      { name: 'serial', description: '设备序列号', type: 'string', required: false },
    ],
  },
  {
    name: 'adb_screen_record',
    description: '录制屏幕',
    parameters: [
      { name: 'duration', description: '录制时长(秒)', type: 'number', required: false, default: 30 },
      { name: 'savePath', description: '保存路径', type: 'string', required: false },
      { name: 'serial', description: '设备序列号', type: 'string', required: false },
    ],
  },
  {
    name: 'adb_screen_on',
    description: '点亮屏幕',
    parameters: [
      { name: 'serial', description: '设备序列号', type: 'string', required: false },
    ],
  },
  {
    name: 'adb_screen_off',
    description: '关闭屏幕',
    parameters: [
      { name: 'serial', description: '设备序列号', type: 'string', required: false },
    ],
  },

  // 输入模拟
  {
    name: 'adb_input_tap',
    description: '模拟屏幕点击',
    parameters: [
      { name: 'x', description: 'X 坐标', type: 'number', required: true },
      { name: 'y', description: 'Y 坐标', type: 'number', required: true },
      { name: 'serial', description: '设备序列号', type: 'string', required: false },
    ],
  },
  {
    name: 'adb_input_swipe',
    description: '模拟屏幕滑动',
    parameters: [
      { name: 'x1', description: '起点 X', type: 'number', required: true },
      { name: 'y1', description: '起点 Y', type: 'number', required: true },
      { name: 'x2', description: '终点 X', type: 'number', required: true },
      { name: 'y2', description: '终点 Y', type: 'number', required: true },
      { name: 'duration', description: '持续时间(ms)', type: 'number', required: false, default: 300 },
      { name: 'serial', description: '设备序列号', type: 'string', required: false },
    ],
  },
  {
    name: 'adb_input_text',
    description: '输入文本',
    parameters: [
      { name: 'text', description: '要输入的文本', type: 'string', required: true },
      { name: 'serial', description: '设备序列号', type: 'string', required: false },
    ],
  },
  {
    name: 'adb_input_keyevent',
    description: '发送按键事件',
    parameters: [
      { name: 'keyCode', description: '按键码 (如 26=电源)', type: 'string', required: true },
      { name: 'serial', description: '设备序列号', type: 'string', required: false },
    ],
  },

  // 应用管理
  {
    name: 'adb_install',
    description: '安装 APK',
    parameters: [
      { name: 'apkPath', description: 'APK 文件路径', type: 'string', required: true },
      { name: 'replace', description: '替换已安装应用', type: 'boolean', required: false, default: true },
      { name: 'grant', description: '授予所有权限', type: 'boolean', required: false, default: true },
      { name: 'serial', description: '设备序列号', type: 'string', required: false },
    ],
  },
  {
    name: 'adb_uninstall',
    description: '卸载应用',
    parameters: [
      { name: 'packageName', description: '包名', type: 'string', required: true },
      { name: 'serial', description: '设备序列号', type: 'string', required: false },
    ],
  },
  {
    name: 'adb_launch',
    description: '启动应用',
    parameters: [
      { name: 'packageName', description: '包名', type: 'string', required: true },
      { name: 'serial', description: '设备序列号', type: 'string', required: false },
    ],
  },
  {
    name: 'adb_force_stop',
    description: '强制停止应用',
    parameters: [
      { name: 'packageName', description: '包名', type: 'string', required: true },
      { name: 'serial', description: '设备序列号', type: 'string', required: false },
    ],
  },
  {
    name: 'adb_list_packages',
    description: '列出已安装应用',
    parameters: [
      { name: 'serial', description: '设备序列号', type: 'string', required: false },
    ],
  },

  // 文件管理
  {
    name: 'adb_pull',
    description: '从设备拉取文件',
    parameters: [
      { name: 'devicePath', description: '设备文件路径', type: 'string', required: true },
      { name: 'localPath', description: '本地保存路径', type: 'string', required: true },
      { name: 'serial', description: '设备序列号', type: 'string', required: false },
    ],
  },
  {
    name: 'adb_push',
    description: '推送文件到设备',
    parameters: [
      { name: 'localPath', description: '本地文件路径', type: 'string', required: true },
      { name: 'devicePath', description: '设备保存路径', type: 'string', required: true },
      { name: 'serial', description: '设备序列号', type: 'string', required: false },
    ],
  },
  {
    name: 'adb_shell',
    description: '执行 Shell 命令',
    parameters: [
      { name: 'command', description: 'Shell 命令', type: 'string', required: true },
      { name: 'serial', description: '设备序列号', type: 'string', required: false },
    ],
  },
  {
    name: 'adb_ls',
    description: '列出目录文件',
    parameters: [
      { name: 'path', description: '目录路径', type: 'string', required: true },
      { name: 'serial', description: '设备序列号', type: 'string', required: false },
    ],
  },

  // 性能监控
  {
    name: 'adb_meminfo',
    description: '获取内存信息',
    parameters: [
      { name: 'serial', description: '设备序列号', type: 'string', required: false },
    ],
  },
  {
    name: 'adb_cpuinfo',
    description: '获取 CPU 信息',
    parameters: [
      { name: 'serial', description: '设备序列号', type: 'string', required: false },
    ],
  },
  {
    name: 'adb_fps',
    description: '获取帧率',
    parameters: [
      { name: 'serial', description: '设备序列号', type: 'string', required: false },
    ],
  },
  {
    name: 'adb_battery',
    description: '获取电池信息',
    parameters: [
      { name: 'serial', description: '设备序列号', type: 'string', required: false },
    ],
  },
  {
    name: 'adb_perf_snapshot',
    description: '获取完整性能快照',
    parameters: [
      { name: 'serial', description: '设备序列号', type: 'string', required: false },
    ],
  },

  // 日志调试
  {
    name: 'adb_logcat',
    description: '获取日志',
    parameters: [
      { name: 'buffer', description: '缓冲区 (main/system/crash)', type: 'string', required: false },
      { name: 'filter', description: '过滤标签', type: 'string', required: false },
      { name: 'lines', description: '行数', type: 'number', required: false, default: 100 },
      { name: 'serial', description: '设备序列号', type: 'string', required: false },
    ],
  },
  {
    name: 'adb_bugreport',
    description: '获取 Bug 报告',
    parameters: [
      { name: 'savePath', description: '保存路径', type: 'string', required: false },
      { name: 'serial', description: '设备序列号', type: 'string', required: false },
    ],
  },
  {
    name: 'adb_dumpsys',
    description: '获取系统服务信息',
    parameters: [
      { name: 'service', description: '服务名', type: 'string', required: true },
      { name: 'serial', description: '设备序列号', type: 'string', required: false },
    ],
  },
  {
    name: 'adb_getprop',
    description: '获取系统属性',
    parameters: [
      { name: 'property', description: '属性名', type: 'string', required: true },
      { name: 'serial', description: '设备序列号', type: 'string', required: false },
    ],
  },

  // 系统控制
  {
    name: 'adb_reboot',
    description: '重启设备',
    parameters: [
      { name: 'mode', description: '重启模式 (normal/recovery/bootloader)', type: 'string', required: false, default: 'normal' },
      { name: 'serial', description: '设备序列号', type: 'string', required: false },
    ],
  },
];
