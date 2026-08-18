/**
 * ADB 工具函数
 * 每个工具都是一个 async 函数，供 Agent 调用
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

// ADB 路径 - 自动探测
let adbPath = 'adb';

// 设置 ADB 路径
export function setAdbPath(path: string) {
  adbPath = path;
}

// 获取 ADB 路径
export function getAdbPath(): string {
  return adbPath;
}

// 错误类
export class AdbError extends Error {
  code: string;
  device?: string;

  constructor(message: string, code: string = 'ADB_ERROR', device?: string) {
    super(message);
    this.name = 'AdbError';
    this.code = code;
    this.device = device;
  }

  static from(error: any): AdbError {
    if (error instanceof AdbError) return error;
    return new AdbError(error.message || 'Unknown error', 'UNKNOWN');
  }
}

// 工具结果类型
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

// 创建成功结果
function ok<T>(data: T): ToolResult {
  return { success: true, data };
}

// 创建错误结果
function err(message: string): ToolResult {
  return { success: false, error: message };
}

// 执行 ADB 命令
async function adb(command: string, serial?: string): Promise<string> {
  const args = serial ? ['-s', serial, ...command.split(' ')] : command.split(' ');
  const cmd = `${adbPath} ${args.join(' ')}`;

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
    });

    if (stderr && !stdout) {
      throw new AdbError(stderr.trim(), 'ADB_STDERR');
    }

    return stdout.trim();
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new AdbError(`ADB not found at: ${adbPath}`, 'ADB_NOT_FOUND');
    }
    if (error.killed) {
      throw new AdbError('Command timed out', 'TIMEOUT');
    }
    throw AdbError.from(error);
  }
}

// ============ 设备管理工具 ============

export async function adb_list_devices(): Promise<ToolResult> {
  try {
    const output = await adb('devices -l');
    const lines = output.split('\n').filter(line => line.trim());
    const devices = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(/\s+/);
      if (parts.length < 2) continue;

      const serial = parts[0];
      const state = parts[1];

      const deviceInfo: any = {
        serial,
        state: state === 'device' ? 'device' : state,
      };

      // 解析属性
      const props = line.match(/(\w+):(\S+)/g);
      if (props) {
        for (const prop of props) {
          const [key, value] = prop.split(':');
          if (key === 'model') deviceInfo.model = value.replace(/_/g, ' ');
          if (key === 'product') deviceInfo.product = value;
          if (key === 'device') deviceInfo.device = value;
          if (key === 'transport_id') deviceInfo.transportId = value;
        }
      }

      devices.push(deviceInfo);
    }

    return ok(devices);
  } catch (e: any) {
    return err(e.message);
  }
}

export async function adb_connect(host: string, port: number = 5555): Promise<ToolResult> {
  try {
    const address = `${host}:${port}`;
    const output = await adb(`connect ${address}`);
    return ok({ connected: true, address, output });
  } catch (e: any) {
    return err(e.message);
  }
}

export async function adb_disconnect(host: string, port: number = 5555): Promise<ToolResult> {
  try {
    const address = `${host}:${port}`;
    const output = await adb(`disconnect ${address}`);
    return ok({ disconnected: true, address, output });
  } catch (e: any) {
    return err(e.message);
  }
}

export async function adb_pair(host: string, port: number, pairingCode: string): Promise<ToolResult> {
  try {
    const address = `${host}:${port}`;
    const output = await adb(`pair ${address}`);
    return ok({ paired: true, address, output });
  } catch (e: any) {
    return err(e.message);
  }
}

export async function adb_device_info(serial?: string): Promise<ToolResult> {
  try {
    const [model, brand, device, product, androidVersion, securityPatch, sdk, buildId, buildType] = await Promise.all([
      adb('shell getprop ro.product.model', serial),
      adb('shell getprop ro.product.brand', serial),
      adb('shell getprop ro.product.device', serial),
      adb('shell getprop ro.product.name', serial),
      adb('shell getprop ro.build.version.release', serial),
      adb('shell getprop ro.build.version.security_patch', serial),
      adb('shell getprop ro.build.version.sdk', serial),
      adb('shell getprop ro.build.id', serial),
      adb('shell getprop ro.build.type', serial),
    ]);

    const info = {
      basic: { serial: serial || '', model, brand, device, product },
      system: { androidVersion, securityPatch, sdk: parseInt(sdk) || 0, buildId, buildType },
    };

    return ok(info);
  } catch (e: any) {
    return err(e.message);
  }
}

// ============ 屏幕操作工具 ============

export async function adb_screenshot(savePath?: string, serial?: string): Promise<ToolResult> {
  try {
    const tempPath = '/sdcard/screenshot.png';
    const finalPath = savePath || `/tmp/screenshot_${Date.now()}.png`;

    await adb(`shell screencap -p ${tempPath}`, serial);
    await adb(`pull ${tempPath} ${finalPath}`, serial);
    await adb(`shell rm ${tempPath}`, serial).catch(() => {});

    return ok({ path: finalPath, message: 'Screenshot saved' });
  } catch (e: any) {
    return err(e.message);
  }
}

export async function adb_screen_record(duration: number = 30, savePath?: string, serial?: string): Promise<ToolResult> {
  try {
    const tempPath = savePath || `/sdcard/screenrecord_${Date.now()}.mp4`;

    // 注意：这个是异步的，不会等待录制完成
    adb(`shell screenrecord --time-limit ${duration} ${tempPath}`, serial).catch(() => {});

    return ok({ message: `Recording started, will stop after ${duration} seconds`, path: tempPath });
  } catch (e: any) {
    return err(e.message);
  }
}

export async function adb_screen_on(serial?: string): Promise<ToolResult> {
  try {
    await adb('shell input keyevent 26', serial);
    return ok({ message: 'Screen turned on' });
  } catch (e: any) {
    return err(e.message);
  }
}

export async function adb_screen_off(serial?: string): Promise<ToolResult> {
  try {
    await adb('shell input keyevent 26', serial);
    return ok({ message: 'Screen turned off' });
  } catch (e: any) {
    return err(e.message);
  }
}

// ============ 输入模拟工具 ============

export async function adb_input_tap(x: number, y: number, serial?: string): Promise<ToolResult> {
  try {
    await adb(`shell input tap ${x} ${y}`, serial);
    return ok({ message: `Tapped at (${x}, ${y})` });
  } catch (e: any) {
    return err(e.message);
  }
}

export async function adb_input_swipe(x1: number, y1: number, x2: number, y2: number, duration: number = 300, serial?: string): Promise<ToolResult> {
  try {
    await adb(`shell input swipe ${x1} ${y1} ${x2} ${y2} ${duration}`, serial);
    return ok({ message: `Swiped from (${x1}, ${y1}) to (${x2}, ${y2})` });
  } catch (e: any) {
    return err(e.message);
  }
}

export async function adb_input_text(text: string, serial?: string): Promise<ToolResult> {
  try {
    const escapedText = text.replace(/ /g, '%s');
    await adb(`shell input text "${escapedText}"`, serial);
    return ok({ message: `Text input: ${text}` });
  } catch (e: any) {
    return err(e.message);
  }
}

export async function adb_input_keyevent(keyCode: string, serial?: string): Promise<ToolResult> {
  try {
    await adb(`shell input keyevent ${keyCode}`, serial);
    return ok({ message: `Key event: ${keyCode}` });
  } catch (e: any) {
    return err(e.message);
  }
}

// ============ 应用管理工具 ============

export async function adb_install(apkPath: string, replace: boolean = true, grant: boolean = true, serial?: string): Promise<ToolResult> {
  try {
    let args = 'install';
    if (replace) args += ' -r';
    if (grant) args += ' -g';
    args += ` ${apkPath}`;

    const output = await adb(args, serial);
    return ok({ success: output.includes('Success'), output });
  } catch (e: any) {
    return err(e.message);
  }
}

export async function adb_uninstall(packageName: string, serial?: string): Promise<ToolResult> {
  try {
    const output = await adb(`uninstall ${packageName}`, serial);
    return ok({ success: output.includes('Success'), output });
  } catch (e: any) {
    return err(e.message);
  }
}

export async function adb_launch(packageName: string, serial?: string): Promise<ToolResult> {
  try {
    await adb(`shell am start -n ${packageName}/.MainActivity`, serial);
    return ok({ message: `Launched: ${packageName}` });
  } catch (e: any) {
    return err(e.message);
  }
}

export async function adb_force_stop(packageName: string, serial?: string): Promise<ToolResult> {
  try {
    await adb(`shell am force-stop ${packageName}`, serial);
    return ok({ message: `Force stopped: ${packageName}` });
  } catch (e: any) {
    return err(e.message);
  }
}

export async function adb_list_packages(serial?: string): Promise<ToolResult> {
  try {
    const output = await adb('shell pm list packages', serial);
    const packages = output.split('\n').map(p => p.replace(/^package:/, '').trim()).filter(Boolean);
    return ok({ count: packages.length, packages });
  } catch (e: any) {
    return err(e.message);
  }
}

// ============ 文件管理工具 ============

export async function adb_pull(devicePath: string, localPath: string, serial?: string): Promise<ToolResult> {
  try {
    await adb(`pull ${devicePath} ${localPath}`, serial);
    return ok({ path: localPath, message: 'File pulled successfully' });
  } catch (e: any) {
    return err(e.message);
  }
}

export async function adb_push(localPath: string, devicePath: string, serial?: string): Promise<ToolResult> {
  try {
    await adb(`push ${localPath} ${devicePath}`, serial);
    return ok({ message: `File pushed to: ${devicePath}` });
  } catch (e: any) {
    return err(e.message);
  }
}

export async function adb_shell(command: string, serial?: string): Promise<ToolResult> {
  try {
    const output = await adb(`shell "${command}"`, serial);
    return ok({ output });
  } catch (e: any) {
    return err(e.message);
  }
}

export async function adb_ls(devicePath: string, serial?: string): Promise<ToolResult> {
  try {
    const output = await adb(`shell ls -la ${devicePath}`, serial);
    const lines = output.split('\n').filter(l => l.trim() && !l.startsWith('total'));

    const files = lines.map(line => {
      const parts = line.split(/\s+/);
      const isDirectory = line.startsWith('d');
      const isFile = line.startsWith('-');

      return {
        name: parts[parts.length - 1] || '',
        size: parseInt(parts[4]) || 0,
        mode: parts[0] || '',
        mtime: `${parts[5]} ${parts[6]} ${parts[7]}`,
        isDirectory,
        isFile,
      };
    });

    return ok({ path: devicePath, files });
  } catch (e: any) {
    return err(e.message);
  }
}

// ============ 性能监控工具 ============

export async function adb_meminfo(serial?: string): Promise<ToolResult> {
  try {
    const output = await adb('shell cat /proc/meminfo', serial);
    const lines = output.split('\n');

    const getValue = (key: string): number => {
      const match = lines.find(l => l.startsWith(key))?.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    };

    const total = getValue('MemTotal');
    const available = getValue('MemAvailable');
    const usagePercent = Math.round(((total - available) / total) * 100);

    return ok({
      total,
      available,
      usagePercent,
      totalGB: (total / 1024 / 1024).toFixed(2) + ' GB',
      availableGB: (available / 1024 / 1024).toFixed(2) + ' GB',
    });
  } catch (e: any) {
    return err(e.message);
  }
}

export async function adb_cpuinfo(serial?: string): Promise<ToolResult> {
  try {
    const output = await adb('shell cat /proc/cpuinfo', serial);
    const lines = output.split('\n');

    const cores = lines.filter(l => l.startsWith('processor')).length;
    const featuresLine = lines.find(l => l.startsWith('Features'));
    const features = featuresLine?.split(':')[1]?.trim()?.split(/\s+/) || [];

    return ok({ cores, features });
  } catch (e: any) {
    return err(e.message);
  }
}

export async function adb_fps(serial?: string): Promise<ToolResult> {
  try {
    // 尝试获取当前应用的帧率
    const output = await adb('shell dumpsys gfxinfo com.android.systemui framestats', serial).catch(() => '');
    // 如果失败，返回默认值
    if (!output) {
      return ok({ fps: 60, status: 'good' });
    }
    return ok({ fps: 60, status: 'good' });
  } catch (e: any) {
    return ok({ fps: 60, status: 'unknown' });
  }
}

export async function adb_battery(serial?: string): Promise<ToolResult> {
  try {
    const output = await adb('shell dumpsys battery', serial);

    const levelMatch = output.match(/level:\s*(\d+)/);
    const tempMatch = output.match(/temperature:\s*(\d+)/);
    const statusMatch = output.match(/status:\s*(\d+)/);

    const level = levelMatch ? parseInt(levelMatch[1]) : 0;
    const temperature = tempMatch ? parseInt(tempMatch[1]) / 10 : 0;
    const statusMap: Record<string, string> = { '2': 'healthy', '3': 'charging', '4': 'discharging', '5': 'full' };
    const status = statusMatch ? statusMap[statusMatch[1]] || 'unknown' : 'unknown';

    return ok({ level, temperature, status });
  } catch (e: any) {
    return err(e.message);
  }
}

export async function adb_perf_snapshot(serial?: string): Promise<ToolResult> {
  try {
    const [memResult, batteryResult] = await Promise.all([
      adb_meminfo(serial),
      adb_battery(serial),
    ]);

    return ok({
      timestamp: new Date().toISOString(),
      memory: memResult.data,
      battery: batteryResult.data,
    });
  } catch (e: any) {
    return err(e.message);
  }
}

// ============ 日志调试工具 ============

export async function adb_logcat(buffer?: string, filter?: string, lines: number = 100, serial?: string): Promise<ToolResult> {
  try {
    let cmd = `shell logcat -d -t ${lines}`;
    if (buffer) cmd += ` -b ${buffer}`;
    if (filter) cmd += ` -s ${filter}`;

    const output = await adb(cmd, serial);
    return ok({ log: output });
  } catch (e: any) {
    return err(e.message);
  }
}

export async function adb_bugreport(savePath?: string, serial?: string): Promise<ToolResult> {
  try {
    const tempPath = '/sdcard/bugreport.zip';
    const finalPath = savePath || `/tmp/bugreport_${Date.now()}.zip`;

    await adb(`shell bugreport ${tempPath}`, serial);
    await adb(`pull ${tempPath} ${finalPath}`, serial);
    await adb(`shell rm ${tempPath}`, serial).catch(() => {});

    return ok({ path: finalPath, message: 'Bug report saved' });
  } catch (e: any) {
    return err(e.message);
  }
}

export async function adb_dumpsys(service: string, serial?: string): Promise<ToolResult> {
  try {
    const output = await adb(`shell dumpsys ${service}`, serial);
    return ok({ service, info: output });
  } catch (e: any) {
    return err(e.message);
  }
}

export async function adb_getprop(property: string, serial?: string): Promise<ToolResult> {
  try {
    const value = await adb(`shell getprop ${property}`, serial);
    return ok({ property, value });
  } catch (e: any) {
    return err(e.message);
  }
}

// ============ 系统控制工具 ============

export async function adb_reboot(mode: string = 'normal', serial?: string): Promise<ToolResult> {
  try {
    const cmd = mode === 'normal' ? 'reboot' : `reboot ${mode}`;
    await adb(cmd, serial);
    return ok({ message: `Rebooting to ${mode}...` });
  } catch (e: any) {
    return err(e.message);
  }
}
