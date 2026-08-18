/**
 * ADB 核心封装
 */

import { exec, spawn, type ExecOptions } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Device, BatteryInfo, MemoryInfo, CpuInfo, ScreenInfo, FileInfo, DeviceFullInfo } from './types';

const execAsync = promisify(exec);

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

// 设备信息接口
export interface DeviceInfo {
  serial: string;
  state: 'device' | 'offline' | 'unauthorized' | 'no device';
  product?: string;
  model?: string;
  device?: string;
  transportId?: string;
}

// ADB 客户端类
export class AdbClient {
  private adbPath: string;
  private defaultSerial?: string;
  private timeoutMs: number;

  constructor(config: { adbPath?: string; defaultSerial?: string; timeoutMs?: number } = {}) {
    this.adbPath = config.adbPath || 'adb';
    this.defaultSerial = config.defaultSerial;
    this.timeoutMs = config.timeoutMs || 30000;
  }

  /**
   * 设置 ADB 路径
   */
  setAdbPath(adbPath: string): void {
    this.adbPath = adbPath;
  }

  /**
   * 设置默认设备序列号
   */
  setDefaultSerial(serial: string): void {
    this.defaultSerial = serial;
  }

  /**
   * 执行 ADB 命令
   */
  async exec(command: string, options: { serial?: string; timeout?: number } = {}): Promise<string> {
    const serial = options.serial || this.defaultSerial;
    const args = serial ? ['-s', serial, ...command.split(' ')] : command.split(' ');

    try {
      const { stdout, stderr } = await execAsync(`${this.adbPath} ${args.join(' ')}`, {
        timeout: options.timeout || this.timeoutMs,
        maxBuffer: 10 * 1024 * 1024, // 10MB
      });

      if (stderr && !stdout) {
        throw new AdbError(stderr.trim(), 'ADB_STDERR');
      }

      return stdout.trim();
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new AdbError(`ADB not found at: ${this.adbPath}`, 'ADB_NOT_FOUND');
      }
      if (error.killed) {
        throw new AdbError(`Command timed out after ${this.timeoutMs}ms`, 'TIMEOUT');
      }
      throw new AdbError(error.message || 'Unknown error', 'EXEC_ERROR', serial);
    }
  }

  /**
   * 获取已连接的设备列表
   */
  async listDevices(): Promise<DeviceInfo[]> {
    try {
      const output = await this.exec('devices -l');
      const lines = output.split('\n').filter(line => line.trim());

      const devices: DeviceInfo[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(/\s+/);
        if (parts.length < 2) continue;

        const serial = parts[0];
        const state = parts[1] as DeviceInfo['state'];

        const deviceInfo: DeviceInfo = {
          serial,
          state: state === 'device' ? 'device' : state === 'offline' ? 'offline' : 'unauthorized',
        };

        // 解析设备属性 (key:value 格式)
        const props = line.match(/(\w+):(\S+)/g);
        if (props) {
          for (const prop of props) {
            const [key, value] = prop.split(':');
            switch (key) {
              case 'product':
                deviceInfo.product = value;
                break;
              case 'model':
                deviceInfo.model = value.replace(/_/g, ' ');
                break;
              case 'device':
                deviceInfo.device = value;
                break;
              case 'transport_id':
                deviceInfo.transportId = value;
                break;
            }
          }
        }

        devices.push(deviceInfo);
      }

      return devices;
    } catch (error) {
      throw AdbError.from(error);
    }
  }

  /**
   * 连接到设备 (无线)
   */
  async connect(host: string, port: number = 5555): Promise<boolean> {
    try {
      const address = `${host}:${port}`;
      const output = await this.exec(`connect ${address}`);
      return output.includes('connected') || output.includes('already connected');
    } catch (error) {
      throw AdbError.from(error);
    }
  }

  /**
   * 断开设备连接
   */
  async disconnect(host: string, port: number = 5555): Promise<boolean> {
    try {
      const address = `${host}:${port}`;
      const output = await this.exec(`disconnect ${address}`);
      return output.includes('disconnected');
    } catch (error) {
      throw AdbError.from(error);
    }
  }

  /**
   * 配对设备
   */
  async pair(host: string, port: number, pairingCode: string): Promise<boolean> {
    try {
      const address = `${host}:${port}`;
      const output = await this.exec(`pair ${address}`, { timeout: 60000 });
      // pair 命令会提示输入配对码，需要用不同方式处理
      return output.includes('Successfully paired');
    } catch (error) {
      throw AdbError.from(error);
    }
  }

  /**
   * 获取设备系统属性
   */
  async getProp(key: string, serial?: string): Promise<string> {
    try {
      const output = await this.exec(`shell getprop ${key}`, { serial });
      return output.trim();
    } catch (error) {
      throw AdbError.from(error);
    }
  }

  /**
   * 获取设备完整信息
   */
  async getDeviceInfo(serial?: string): Promise<DeviceFullInfo> {
    const s = serial || this.defaultSerial;

    const [
      model, brand, device, product,
      androidVersion, securityPatch, sdk, buildId, buildType,
      cpuInfo, memInfo, storageInfo, batteryInfo,
      screenInfo, ip, mac
    ] = await Promise.all([
      this.getProp('ro.product.model', s),
      this.getProp('ro.product.brand', s),
      this.getProp('ro.product.device', s),
      this.getProp('ro.product.name', s),
      this.getProp('ro.build.version.release', s),
      this.getProp('ro.build.version.security_patch', s),
      this.getProp('ro.build.version.sdk', s),
      this.getProp('ro.build.id', s),
      this.getProp('ro.build.type', s),
      this.getCpuInfo(s),
      this.getMemoryInfo(s),
      this.getStorageInfo(s),
      this.getBatteryInfo(s),
      this.getScreenInfo(s),
      this.getIpAddress(s),
      this.getMacAddress(s),
    ]);

    return {
      basic: { serial: s || '', model, brand, device, product },
      system: {
        androidVersion,
        securityPatch,
        sdk: parseInt(sdk) || 0,
        buildId,
        buildType,
      },
      hardware: { cpu: cpuInfo, memory: memInfo, storage: storageInfo },
      screen: screenInfo,
      battery: batteryInfo,
      network: { ip, mac },
    };
  }

  /**
   * 获取电池信息
   */
  async getBatteryInfo(serial?: string): Promise<BatteryInfo> {
    try {
      const output = await this.exec('shell dumpsys battery', { serial });
      const info: Partial<BatteryInfo> = {};

      const levelMatch = output.match(/level:\s*(\d+)/);
      const statusMatch = output.match(/status:\s*(\d+)/);
      const healthMatch = output.match(/health:\s*(\d+)/);
      const tempMatch = output.match(/temperature:\s*(\d+)/);
      const voltageMatch = output.match(/voltage:\s*(\d+)/);
      const techMatch = output.match(/technology:\s*(\w+)/);
      const acMatch = output.match(/AC powered:\s*(true|false)/);
      const usbMatch = output.match(/USB powered:\s*(true|false)/);
      const wirelessMatch = output.match(/Wireless powered:\s*(true|false)/);

      if (levelMatch) info.level = parseInt(levelMatch[1]);
      if (tempMatch) info.temperature = parseInt(tempMatch[1]) / 10;
      if (voltageMatch) info.voltage = parseInt(voltageMatch[1]);
      if (techMatch) info.technology = techMatch[1];

      const statusMap: Record<string, string> = { '2': 'healthy', '3': 'charging', '4': 'discharging', '5': 'full' };
      const healthMap: Record<string, string> = { '1': 'unknown', '2': 'healthy', '3': 'overheat', '4': 'dead', '5': 'over_voltage' };

      if (statusMatch) info.status = statusMap[statusMatch[1]] || 'unknown';
      if (healthMatch) info.health = healthMap[healthMatch[1]] || 'unknown';
      if (acMatch) info.ACpowered = acMatch[1] === 'true';
      if (usbMatch) info.USBpowered = usbMatch[1] === 'true';
      if (wirelessMatch) info.Wirelesspowered = wirelessMatch[1] === 'true';

      return info as BatteryInfo;
    } catch (error) {
      throw AdbError.from(error);
    }
  }

  /**
   * 获取内存信息
   */
  async getMemoryInfo(serial?: string): Promise<MemoryInfo> {
    try {
      const output = await this.exec('shell cat /proc/meminfo', { serial });
      const lines = output.split('\n');

      const getValue = (key: string): number => {
        const match = lines.find(l => l.startsWith(key))?.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
      };

      const total = getValue('MemTotal');
      const free = getValue('MemFree');
      const available = getValue('MemAvailable');
      const swapTotal = getValue('SwapTotal');
      const swapFree = getValue('SwapFree');

      return {
        total,
        free,
        available,
        used: total - available,
        usagePercent: Math.round(((total - available) / total) * 100),
        swapTotal,
        swapFree,
      };
    } catch (error) {
      throw AdbError.from(error);
    }
  }

  /**
   * 获取 CPU 信息
   */
  async getCpuInfo(serial?: string): Promise<CpuInfo> {
    try {
      const output = await this.exec('shell cat /proc/cpuinfo', { serial });
      const lines = output.split('\n');

      const getValue = (key: string): string => {
        return lines.find(l => l.startsWith(key))?.split(':')[1]?.trim() || '';
      };

      const features = lines.find(l => l.startsWith('Features'))?.split(':')[1]?.trim()?.split(/\s+/) || [];

      return {
        cores: lines.filter(l => l.startsWith('processor')).length,
        architecture: getValue('CPU architecture'),
        model: getValue('model name') || getValue('Hardware') || getValue('BogoMIPS'),
        bogoMips: parseFloat(getValue('BogoMIPS')) || 0,
        features,
      };
    } catch (error) {
      throw AdbError.from(error);
    }
  }

  /**
   * 获取存储信息
   */
  async getStorageInfo(serial?: string): Promise<{ total: number; free: number }> {
    try {
      const output = await this.exec('shell df -h /data', { serial });
      const match = output.match(/(\d+)G\s+(\d+)G\s+(\d+)G/);
      if (match) {
        return {
          total: parseInt(match[1]) + parseInt(match[3]),
          free: parseInt(match[3]),
        };
      }
      return { total: 0, free: 0 };
    } catch (error) {
      throw AdbError.from(error);
    }
  }

  /**
   * 获取屏幕信息
   */
  async getScreenInfo(serial?: string): Promise<ScreenInfo> {
    try {
      const sizeOutput = await this.exec('shell wm size', { serial });
      const densityOutput = await this.exec('shell wm density', { serial });

      const sizeMatch = sizeOutput.match(/Physical size:\s*(\d+)x(\d+)/);
      const densityMatch = densityOutput.match(/Physical density:\s*(\d+)/);

      return {
        width: sizeMatch ? parseInt(sizeMatch[1]) : 0,
        height: sizeMatch ? parseInt(sizeMatch[2]) : 0,
        density: densityMatch ? parseInt(densityMatch[1]) : 0,
        densityDpi: densityMatch ? parseInt(densityMatch[1]) : 0,
        rotation: 0,
      };
    } catch (error) {
      throw AdbError.from(error);
    }
  }

  /**
   * 获取 IP 地址
   */
  async getIpAddress(serial?: string): Promise<string> {
    try {
      const output = await this.exec('shell ifconfig wlan0', { serial });
      const match = output.match(/inet addr:(\d+\.\d+\.\d+\.\d+)/);
      return match ? match[1] : '';
    } catch (error) {
      return '';
    }
  }

  /**
   * 获取 MAC 地址
   */
  async getMacAddress(serial?: string): Promise<string> {
    try {
      const output = await this.exec('shell cat /sys/class/net/wlan0/address', { serial });
      return output.trim().toUpperCase();
    } catch (error) {
      return '';
    }
  }

  /**
   * 执行 Shell 命令
   */
  async shell(command: string, serial?: string): Promise<string> {
    try {
      return await this.exec(`shell "${command}"`, { serial });
    } catch (error) {
      throw AdbError.from(error);
    }
  }

  /**
   * 截图
   */
  async screenshot(savePath?: string, serial?: string): Promise<string> {
    const s = serial || this.defaultSerial;
    const tempPath = '/sdcard/screenshot.png';
    const finalPath = savePath || tempPath;

    try {
      // 先截图到设备
      await this.exec(`shell screencap -p ${tempPath}`, { serial: s });

      // 拉取到本地
      await this.exec(`pull ${tempPath} ${finalPath}`, { serial: s });

      // 删除设备上的临时文件
      await this.exec(`shell rm ${tempPath}`, { serial: s }).catch(() => {});

      return finalPath;
    } catch (error) {
      throw AdbError.from(error);
    }
  }

  /**
   * 安装 APK
   */
  async install(apkPath: string, options: { replace?: boolean; grant?: boolean } = {}, serial?: string): Promise<boolean> {
    const s = serial || this.defaultSerial;
    const args = ['install'];

    if (options.replace) args.push('-r');
    if (options.grant) args.push('-g');

    args.push(apkPath);

    try {
      const output = await this.exec(args.join(' '), { serial: s });
      return output.includes('Success');
    } catch (error) {
      throw AdbError.from(error);
    }
  }

  /**
   * 卸载应用
   */
  async uninstall(packageName: string, serial?: string): Promise<boolean> {
    try {
      const output = await this.exec(`uninstall ${packageName}`, { serial });
      return output.includes('Success');
    } catch (error) {
      throw AdbError.from(error);
    }
  }

  /**
   * 启动应用
   */
  async launch(packageName: string, serial?: string): Promise<boolean> {
    try {
      await this.exec(`shell am start -n ${packageName}/.MainActivity`, { serial });
      return true;
    } catch (error) {
      throw AdbError.from(error);
    }
  }

  /**
   * 强制停止应用
   */
  async forceStop(packageName: string, serial?: string): Promise<boolean> {
    try {
      await this.exec(`shell am force-stop ${packageName}`, { serial });
      return true;
    } catch (error) {
      throw AdbError.from(error);
    }
  }

  /**
   * 列出已安装应用
   */
  async listPackages(serial?: string): Promise<string[]> {
    try {
      const output = await this.exec('shell pm list packages', { serial });
      return output.split('\n').map(p => p.replace(/^package:/, '').trim()).filter(Boolean);
    } catch (error) {
      throw AdbError.from(error);
    }
  }

  /**
   * 模拟点击
   */
  async tap(x: number, y: number, serial?: string): Promise<boolean> {
    try {
      await this.exec(`shell input tap ${x} ${y}`, { serial });
      return true;
    } catch (error) {
      throw AdbError.from(error);
    }
  }

  /**
   * 模拟滑动
   */
  async swipe(x1: number, y1: number, x2: number, y2: number, duration: number = 300, serial?: string): Promise<boolean> {
    try {
      await this.exec(`shell input swipe ${x1} ${y1} ${x2} ${y2} ${duration}`, { serial });
      return true;
    } catch (error) {
      throw AdbError.from(error);
    }
  }

  /**
   * 输入文本
   */
  async inputText(text: string, serial?: string): Promise<boolean> {
    try {
      // 处理特殊字符
      const escapedText = text.replace(/ /g, '%s');
      await this.exec(`shell input text "${escapedText}"`, { serial });
      return true;
    } catch (error) {
      throw AdbError.from(error);
    }
  }

  /**
   * 按键事件
   */
  async keyEvent(keyCode: number | string, serial?: string): Promise<boolean> {
    try {
      await this.exec(`shell input keyevent ${keyCode}`, { serial });
      return true;
    } catch (error) {
      throw AdbError.from(error);
    }
  }

  /**
   * 屏幕亮屏
   */
  async screenOn(serial?: string): Promise<boolean> {
    try {
      await this.exec('shell input keyevent 26', { serial }); // KEYCODE_POWER
      return true;
    } catch (error) {
      throw AdbError.from(error);
    }
  }

  /**
   * 屏幕灭屏
   */
  async screenOff(serial?: string): Promise<boolean> {
    try {
      await this.exec('shell input keyevent 26', { serial });
      return true;
    } catch (error) {
      throw AdbError.from(error);
    }
  }

  /**
   * 获取 FPS
   */
  async getFps(serial?: string): Promise<number> {
    try {
      const output = await this.exec('shell dumpsys gfxinfo com.android.systemui', { serial });
      const match = output.match(/FPS:\s*(\d+)/);
      return match ? parseInt(match[1]) : 60;
    } catch (error) {
      return 60;
    }
  }

  /**
   * 重启设备
   */
  async reboot(mode?: 'normal' | 'recovery' | 'bootloader' | 'fastboot', serial?: string): Promise<boolean> {
    try {
      const cmd = mode ? `reboot ${mode}` : 'reboot';
      await this.exec(cmd, { serial });
      return true;
    } catch (error) {
      throw AdbError.from(error);
    }
  }

  /**
   * 获取 Logcat
   */
  async logcat(options: {
    buffer?: 'main' | 'system' | 'crash';
    filter?: string;
    lines?: number;
  } = {}, serial?: string): Promise<string> {
    const s = serial || this.defaultSerial;
    let cmd = 'shell logcat';

    if (options.buffer) cmd += ` -b ${options.buffer}`;
    if (options.filter) cmd += ` -s ${options.filter}`;
    if (options.lines) cmd += ` -t ${options.lines}`;
    else cmd += ' -d'; // 默认 dump

    try {
      return await this.exec(cmd, { serial: s });
    } catch (error) {
      throw AdbError.from(error);
    }
  }

  /**
   * 拉取文件
   */
  async pull(devicePath: string, localPath: string, serial?: string): Promise<string> {
    try {
      await this.exec(`pull ${devicePath} ${localPath}`, { serial });
      return localPath;
    } catch (error) {
      throw AdbError.from(error);
    }
  }

  /**
   * 推送文件
   */
  async push(localPath: string, devicePath: string, serial?: string): Promise<boolean> {
    try {
      await this.exec(`push ${localPath} ${devicePath}`, { serial });
      return true;
    } catch (error) {
      throw AdbError.from(error);
    }
  }

  /**
   * 列出目录
   */
  async ls(devicePath: string, serial?: string): Promise<FileInfo[]> {
    try {
      const output = await this.exec(`shell ls -la ${devicePath}`, { serial });
      const lines = output.split('\n').filter(l => l.trim() && !l.startsWith('total'));

      return lines.map(line => {
        const parts = line.split(/\s+/);
        const isDirectory = line.startsWith('d');
        const isFile = line.startsWith('-');

        return {
          path: devicePath,
          name: parts[parts.length - 1] || '',
          size: parseInt(parts[4]) || 0,
          mode: parts[0] || '',
          mtime: `${parts[5]} ${parts[6]} ${parts[7]}`,
          isDirectory,
          isFile,
        };
      });
    } catch (error) {
      throw AdbError.from(error);
    }
  }

  /**
   * 获取 Bug Report
   */
  async bugreport(savePath?: string, serial?: string): Promise<string> {
    const s = serial || this.defaultSerial;
    const tempPath = '/sdcard/bugreport.zip';
    const finalPath = savePath || tempPath.replace('.zip', `_${Date.now()}.zip`);

    try {
      await this.exec(`shell bugreport ${tempPath}`, { serial: s, timeout: 120000 });
      await this.exec(`pull ${tempPath} ${finalPath}`, { serial: s });
      await this.exec(`shell rm ${tempPath}`, { serial: s }).catch(() => {});
      return finalPath;
    } catch (error) {
      throw AdbError.from(error);
    }
  }

  /**
   * 获取 dumpsys 信息
   */
  async dumpsys(service: string, serial?: string): Promise<string> {
    try {
      return await this.exec(`shell dumpsys ${service}`, { serial });
    } catch (error) {
      throw AdbError.from(error);
    }
  }
}

// 查找 ADB 路径
export async function findAdbPath(): Promise<string> {
  const paths = [
    'adb', // 默认 PATH 中的 adb
    '/usr/bin/adb',
    '/usr/local/bin/adb',
    '/opt/android-sdk/platform-tools/adb',
    path.join(os.homedir(), 'Android/Sdk/platform-tools/adb'),
  ];

  for (const p of paths) {
    try {
      await execAsync(`which ${p}`);
      return p;
    } catch {
      continue;
    }
  }

  return 'adb'; // 默认返回 adb，让系统去找
}

// 创建默认客户端实例
let defaultClient: AdbClient | null = null;

export function getDefaultClient(config?: { adbPath?: string; defaultSerial?: string; timeoutMs?: number }): AdbClient {
  if (!defaultClient) {
    defaultClient = new AdbClient(config);
  }
  return defaultClient;
}

export function setDefaultClient(client: AdbClient): void {
  defaultClient = client;
}

export default AdbClient;
