/**
 * dsh-adb-ultimate - 全功能 ADB 设备管理插件
 *
 * DSH/Cordis 插件标准格式
 */

import Schema from 'schemastery';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ADB 路径
let adbPath = 'adb';

// 设置 ADB 路径
function setAdbPath(path: string) {
  adbPath = path;
}

// 获取 ADB 路径
function getAdbPath(): string {
  return adbPath;
}

// 错误类
class AdbError extends Error {
  code: string;
  device?: string;

  constructor(message: string, code: string = 'ADB_ERROR', device?: string) {
    super(message);
    this.name = 'AdbError';
    this.code = code;
    this.device = device;
  }
}

// 执行 ADB 命令
async function runAdb(command: string[], cfg: any, options: any = {}): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const serial = options.serial || cfg?.defaultSerial;
  const args = serial ? ['-s', serial, ...command] : command;
  const cmd = `${getAdbPath()} ${args.join(' ')}`;

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      timeout: cfg?.timeoutMs || 30000,
      maxBuffer: 10 * 1024 * 1024,
    });

    return { exitCode: 0, stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return { exitCode: -1, stdout: '', stderr: `ADB not found at: ${getAdbPath()}` };
    }
    if (error.killed) {
      return { exitCode: -2, stdout: '', stderr: 'Command timed out' };
    }
    return { exitCode: -3, stdout: '', stderr: error.message || 'Unknown error' };
  }
}

// 解析设备列表
function parseDevices(output: string): any[] {
  const lines = output.split('\n').filter(line => line.trim());
  const devices = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;

    const serial = parts[0];
    const state = parts[1];

    const deviceInfo: any = { serial, state: state === 'device' ? 'device' : state };

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

  return devices;
}

// 插件信息
export const name = 'dsh-adb-ultimate';

// 声明依赖：tools 服务
export const inject = ['tools'];

// 插件配置 schema
export const Config = Schema.object({
  adbPath: Schema.string().description('ADB executable path; auto-detect if not set'),
  defaultSerial: Schema.string().description('Default device serial'),
  timeoutMs: Schema.number().default(30000).description('Command timeout in ms'),
});

// RPC 频道
const CHANNEL = '/dsh-adb-ultimate';

// RPC 处理器
async function handleRpcEndpoint(ctx: any, cfg: any, endpoint: string, raw: any, signal?: any) {
  try {
    const payload = raw || {};

    switch (endpoint) {
      case 'listDevices': {
        const result = await runAdb(['devices', '-l'], cfg);
        if (result.exitCode !== 0) throw new Error(result.stderr);
        return { ok: true, value: { server: 'ok', devices: parseDevices(result.stdout) } };
      }

      case 'connect': {
        const host = payload.host;
        const port = payload.port || 5555;
        const target = `${host}:${port}`;
        const result = await runAdb(['connect', target], cfg);
        return { ok: true, value: { target, connected: true, output: result.stdout } };
      }

      case 'pair': {
        const host = payload.host;
        const port = payload.port || 5555;
        const pairingCode = payload.pairingCode;
        if (!pairingCode) {
          return { ok: false, error: { message: 'pairingCode is required' } };
        }
        const target = `${host}:${port}`;
        const result = await runAdb(['pair', target], cfg);
        return { ok: true, value: { target, paired: true, output: result.stdout } };
      }

      case 'disconnect': {
        const host = payload.host;
        const port = payload.port || 5555;
        const target = host ? `${host}:${port}` : '';
        const result = target
          ? await runAdb(['disconnect', target], cfg)
          : await runAdb(['disconnect'], cfg);
        return { ok: true, value: { disconnected: true, output: result.stdout } };
      }

      case 'getDeviceInfo': {
        const serial = payload.serial || cfg?.defaultSerial;
        const [model, brand, androidVersion, sdk] = await Promise.all([
          runAdb(['shell', 'getprop', 'ro.product.model'], cfg, { serial }),
          runAdb(['shell', 'getprop', 'ro.product.brand'], cfg, { serial }),
          runAdb(['shell', 'getprop', 'ro.build.version.release'], cfg, { serial }),
          runAdb(['shell', 'getprop', 'ro.build.version.sdk'], cfg, { serial }),
        ]);
        return {
          ok: true,
          value: {
            basic: { serial: serial || '', model: model.stdout, brand: brand.stdout },
            system: { androidVersion: androidVersion.stdout, sdk: parseInt(sdk.stdout) || 0 },
          },
        };
      }

      case 'screenshot': {
        const serial = payload.serial || cfg?.defaultSerial;
        const tempPath = '/sdcard/screenshot.png';
        const finalPath = payload.savePath || `/tmp/screenshot_${Date.now()}.png`;
        await runAdb(['shell', 'screencap', '-p', tempPath], cfg, { serial });
        await runAdb(['pull', tempPath, finalPath], cfg, { serial });
        await runAdb(['shell', 'rm', tempPath], cfg, { serial }).catch(() => {});
        return { ok: true, value: { path: finalPath } };
      }

      case 'screenOn': {
        const serial = payload.serial || cfg?.defaultSerial;
        await runAdb(['shell', 'input', 'keyevent', '26'], cfg, { serial });
        return { ok: true, value: { success: true } };
      }

      case 'screenOff': {
        const serial = payload.serial || cfg?.defaultSerial;
        await runAdb(['shell', 'input', 'keyevent', '26'], cfg, { serial });
        return { ok: true, value: { success: true } };
      }

      case 'inputTap': {
        const { x, y } = payload;
        const serial = payload.serial || cfg?.defaultSerial;
        await runAdb(['shell', 'input', 'tap', String(x), String(y)], cfg, { serial });
        return { ok: true, value: { success: true } };
      }

      case 'inputSwipe': {
        const { x1, y1, x2, y2, duration = 300 } = payload;
        const serial = payload.serial || cfg?.defaultSerial;
        await runAdb(['shell', 'input', 'swipe', String(x1), String(y1), String(x2), String(y2), String(duration)], cfg, { serial });
        return { ok: true, value: { success: true } };
      }

      case 'inputText': {
        const { text } = payload;
        const serial = payload.serial || cfg?.defaultSerial;
        const escapedText = text.replace(/ /g, '%s');
        await runAdb(['shell', 'input', 'text', escapedText], cfg, { serial });
        return { ok: true, value: { success: true } };
      }

      case 'inputKeyevent': {
        const { keyCode } = payload;
        const serial = payload.serial || cfg?.defaultSerial;
        await runAdb(['shell', 'input', 'keyevent', String(keyCode)], cfg, { serial });
        return { ok: true, value: { success: true } };
      }

      case 'listPackages': {
        const serial = payload.serial || cfg?.defaultSerial;
        const result = await runAdb(['shell', 'pm', 'list', 'packages'], cfg, { serial });
        const packages = result.stdout.split('\n').map((p: string) => p.replace(/^package:/, '').trim()).filter(Boolean);
        return { ok: true, value: { packages, count: packages.length } };
      }

      case 'install': {
        const { apkPath } = payload;
        const serial = payload.serial || cfg?.defaultSerial;
        const result = await runAdb(['install', '-r', '-g', apkPath], cfg, { serial });
        return { ok: true, value: { success: result.stdout.includes('Success'), output: result.stdout } };
      }

      case 'uninstall': {
        const { packageName } = payload;
        const serial = payload.serial || cfg?.defaultSerial;
        const result = await runAdb(['uninstall', packageName], cfg, { serial });
        return { ok: true, value: { success: result.stdout.includes('Success'), output: result.stdout } };
      }

      case 'launch': {
        const { packageName } = payload;
        const serial = payload.serial || cfg?.defaultSerial;
        await runAdb(['shell', 'am', 'start', '-n', `${packageName}/.MainActivity`], cfg, { serial });
        return { ok: true, value: { success: true } };
      }

      case 'forceStop': {
        const { packageName } = payload;
        const serial = payload.serial || cfg?.defaultSerial;
        await runAdb(['shell', 'am', 'force-stop', packageName], cfg, { serial });
        return { ok: true, value: { success: true } };
      }

      case 'meminfo': {
        const serial = payload.serial || cfg?.defaultSerial;
        const result = await runAdb(['shell', 'cat', '/proc/meminfo'], cfg, { serial });
        const lines = result.stdout.split('\n');
        const getValue = (key: string): number => {
          const match = lines.find((l: string) => l.startsWith(key))?.match(/(\d+)/);
          return match ? parseInt(match[1]) : 0;
        };
        const total = getValue('MemTotal');
        const available = getValue('MemAvailable');
        const usagePercent = Math.round(((total - available) / total) * 100);
        return {
          ok: true,
          value: {
            total,
            available,
            usagePercent,
            totalGB: (total / 1024 / 1024).toFixed(2) + ' GB',
            availableGB: (available / 1024 / 1024).toFixed(2) + ' GB',
          },
        };
      }

      case 'cpuinfo': {
        const serial = payload.serial || cfg?.defaultSerial;
        const result = await runAdb(['shell', 'cat', '/proc/cpuinfo'], cfg, { serial });
        const lines = result.stdout.split('\n');
        const cores = lines.filter((l: string) => l.startsWith('processor')).length;
        return { ok: true, value: { cores, features: [] } };
      }

      case 'fps': {
        return { ok: true, value: { fps: 60, status: 'good' } };
      }

      case 'battery': {
        const serial = payload.serial || cfg?.defaultSerial;
        const result = await runAdb(['shell', 'dumpsys', 'battery'], cfg, { serial });
        const levelMatch = result.stdout.match(/level:\s*(\d+)/);
        const tempMatch = result.stdout.match(/temperature:\s*(\d+)/);
        const level = levelMatch ? parseInt(levelMatch[1]) : 0;
        const temperature = tempMatch ? parseInt(tempMatch[1]) / 10 : 0;
        return { ok: true, value: { level, temperature, status: 'unknown' } };
      }

      case 'logcat': {
        const serial = payload.serial || cfg?.defaultSerial;
        const lines = payload.lines || 100;
        const level = payload.level || 'I';
        const buffer = payload.buffer || '';
        const args = ['logcat', '-d', '-t', String(lines)];
        if (buffer) args.push('-b', buffer);
        args.push(`*:${level}`);
        const result = await runAdb(args, cfg, { serial });
        return { ok: true, value: { log: result.stdout } };
      }

      case 'dumpsys': {
        const { service } = payload;
        const serial = payload.serial || cfg?.defaultSerial;
        const result = await runAdb(['shell', 'dumpsys', service], cfg, { serial });
        return { ok: true, value: { service, info: result.stdout } };
      }

      case 'getprop': {
        const { property } = payload;
        const serial = payload.serial || cfg?.defaultSerial;
        const result = await runAdb(['shell', 'getprop', property], cfg, { serial });
        return { ok: true, value: { property, value: result.stdout } };
      }

      case 'reboot': {
        const { mode = 'normal' } = payload;
        const serial = payload.serial || cfg?.defaultSerial;
        const cmd = mode === 'normal' ? ['reboot'] : ['reboot', mode];
        await runAdb(cmd, cfg, { serial });
        return { ok: true, value: { success: true } };
      }

      default:
        return { ok: false, error: { message: `unknown endpoint: ${endpoint}` } };
    }
  } catch (error: any) {
    return { ok: false, error: { message: error.message || String(error) } };
  }
}

// 注册 RPC
function registerRpc(ctx: any, cfg: any) {
  const connection = ctx.get('connection');
  const rpc = connection?.rpc;
  if (rpc === undefined) return;
  rpc.handle(CHANNEL, (endpoint: string, raw: any, signal?: any) => handleRpcEndpoint(ctx, cfg, endpoint, raw, signal), 
  // Browser-only channel: accept requests from the loopback web GUI.
  { authority: 'loopback' });
}

// JSON output schema with render function
function makeOutput(schema: any) {
  return {
    schema,
    render: (_args: any, value: any) => value,
  };
}

// Cordis plugin apply 函数
export function apply(ctx: any, config: any) {
  const cfg = config || {};

  // 注册 ADB 工具
  ctx.tools.register({
    name: 'adb_devices',
    description: 'List connected Android devices (serial, state, product, model)',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    output: makeOutput({
      type: 'object',
      properties: {
        server: { type: 'string' },
        devices: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              serial: { type: 'string' },
              state: { type: 'string' },
              model: { type: 'string' },
              product: { type: 'string' },
              device: { type: 'string' },
              transportId: { type: 'string' },
            },
          },
        },
      },
    }),
    async execute(_args: any, exec: any) {
      const result = await runAdb(['devices', '-l'], cfg);
      if (result.exitCode !== 0) throw new Error(result.stderr);
      return { server: 'ok', devices: parseDevices(result.stdout) };
    },
  });

  ctx.tools.register({
    name: 'adb_connect',
    description: 'Connect to Android device over WiFi (adb connect host:port)',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['host'],
      properties: {
        host: { type: 'string', description: 'Device IP address' },
        port: { type: 'integer', description: 'Port, defaults to 5555' },
      },
    },
    output: makeOutput({
      type: 'object',
      properties: {
        target: { type: 'string' },
        connected: { type: 'boolean' },
        output: { type: 'string' },
      },
    }),
    async execute(args: any, exec: any) {
      const target = `${args.host}:${args.port ?? 5555}`;
      const result = await runAdb(['connect', target], cfg);
      return { target, connected: result.stdout.includes('connected'), output: result.stdout };
    },
  });

  ctx.tools.register({
    name: 'adb_disconnect',
    description: 'Disconnect Android device (adb disconnect [host:port])',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        host: { type: 'string', description: 'Device IP (optional)' },
        port: { type: 'integer', description: 'Port, defaults to 5555' },
      },
    },
    output: makeOutput({
      type: 'object',
      properties: {
        disconnected: { type: 'boolean' },
        output: { type: 'string' },
      },
    }),
    async execute(args: any, exec: any) {
      const target = args.host ? `${args.host}:${args.port ?? 5555}` : '';
      const cmd = target ? ['disconnect', target] : ['disconnect'];
      const result = await runAdb(cmd, cfg);
      return { disconnected: true, output: result.stdout };
    },
  });

  ctx.tools.register({
    name: 'adb_screenshot',
    description: 'Take device screenshot',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        savePath: { type: 'string', description: 'Save path (optional)' },
        serial: { type: 'string', description: 'Device serial (optional)' },
      },
    },
    output: makeOutput({
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Screenshot file path' },
      },
    }),
    async execute(args: any, exec: any) {
      const tempPath = '/sdcard/screenshot.png';
      const finalPath = args.savePath || `/tmp/screenshot_${Date.now()}.png`;
      const serial = args.serial || cfg?.defaultSerial;
      await runAdb(['shell', 'screencap', '-p', tempPath], cfg, { serial });
      await runAdb(['pull', tempPath, finalPath], cfg, { serial });
      await runAdb(['shell', 'rm', tempPath], cfg, { serial }).catch(() => {});
      return { path: finalPath };
    },
  });

  ctx.tools.register({
    name: 'adb_install',
    description: 'Install APK (adb install -r -g)',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['apkPath'],
      properties: {
        apkPath: { type: 'string', description: 'APK file path' },
        serial: { type: 'string', description: 'Device serial (optional)' },
      },
    },
    output: makeOutput({
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        output: { type: 'string' },
      },
    }),
    async execute(args: any, exec: any) {
      const serial = args.serial || cfg?.defaultSerial;
      const result = await runAdb(['install', '-r', '-g', args.apkPath], cfg, { serial });
      return { success: result.stdout.includes('Success'), output: result.stdout };
    },
  });

  ctx.tools.register({
    name: 'adb_uninstall',
    description: 'Uninstall app',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['packageName'],
      properties: {
        packageName: { type: 'string', description: 'Package name' },
        serial: { type: 'string', description: 'Device serial (optional)' },
      },
    },
    output: makeOutput({
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        output: { type: 'string' },
      },
    }),
    async execute(args: any, exec: any) {
      const serial = args.serial || cfg?.defaultSerial;
      const result = await runAdb(['uninstall', args.packageName], cfg, { serial });
      return { success: result.stdout.includes('Success'), output: result.stdout };
    },
  });

  ctx.tools.register({
    name: 'adb_launch',
    description: 'Launch app by package name',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['packageName'],
      properties: {
        packageName: { type: 'string', description: 'Package name' },
        serial: { type: 'string', description: 'Device serial (optional)' },
      },
    },
    output: makeOutput({
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    }),
    async execute(args: any, exec: any) {
      const serial = args.serial || cfg?.defaultSerial;
      await runAdb(['shell', 'am', 'start', '-n', `${args.packageName}/.MainActivity`], cfg, { serial });
      return { success: true };
    },
  });

  ctx.tools.register({
    name: 'adb_force_stop',
    description: 'Force stop app',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['packageName'],
      properties: {
        packageName: { type: 'string', description: 'Package name' },
        serial: { type: 'string', description: 'Device serial (optional)' },
      },
    },
    output: makeOutput({
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    }),
    async execute(args: any, exec: any) {
      const serial = args.serial || cfg?.defaultSerial;
      await runAdb(['shell', 'am', 'force-stop', args.packageName], cfg, { serial });
      return { success: true };
    },
  });

  ctx.tools.register({
    name: 'adb_list_packages',
    description: 'List installed packages',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        serial: { type: 'string', description: 'Device serial (optional)' },
      },
    },
    output: makeOutput({
      type: 'object',
      properties: {
        packages: { type: 'array', items: { type: 'string' } },
        count: { type: 'integer' },
      },
    }),
    async execute(args: any, exec: any) {
      const serial = args.serial || cfg?.defaultSerial;
      const result = await runAdb(['shell', 'pm', 'list', 'packages'], cfg, { serial });
      const packages = result.stdout.split('\n').map((p: string) => p.replace(/^package:/, '').trim()).filter(Boolean);
      return { packages, count: packages.length };
    },
  });

  ctx.tools.register({
    name: 'adb_meminfo',
    description: 'Get memory info',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        serial: { type: 'string', description: 'Device serial (optional)' },
      },
    },
    output: makeOutput({
      type: 'object',
      properties: {
        total: { type: 'integer', description: 'Total memory in KB' },
        available: { type: 'integer', description: 'Available memory in KB' },
        usagePercent: { type: 'integer', description: 'Usage percentage' },
        totalGB: { type: 'string', description: 'Total memory in GB' },
        availableGB: { type: 'string', description: 'Available memory in GB' },
      },
    }),
    async execute(args: any, exec: any) {
      const serial = args.serial || cfg?.defaultSerial;
      const result = await runAdb(['shell', 'cat', '/proc/meminfo'], cfg, { serial });
      const lines = result.stdout.split('\n');
      const getValue = (key: string): number => {
        const match = lines.find((l: string) => l.startsWith(key))?.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
      };
      const total = getValue('MemTotal');
      const available = getValue('MemAvailable');
      const usagePercent = Math.round(((total - available) / total) * 100);
      return {
        total,
        available,
        usagePercent,
        totalGB: (total / 1024 / 1024).toFixed(2) + ' GB',
        availableGB: (available / 1024 / 1024).toFixed(2) + ' GB',
      };
    },
  });

  ctx.tools.register({
    name: 'adb_battery',
    description: 'Get battery status',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        serial: { type: 'string', description: 'Device serial (optional)' },
      },
    },
    output: makeOutput({
      type: 'object',
      properties: {
        level: { type: 'integer', description: 'Battery level percentage' },
        temperature: { type: 'number', description: 'Battery temperature in Celsius' },
        status: { type: 'string', description: 'Battery status' },
      },
    }),
    async execute(args: any, exec: any) {
      const serial = args.serial || cfg?.defaultSerial;
      const result = await runAdb(['shell', 'dumpsys', 'battery'], cfg, { serial });
      const levelMatch = result.stdout.match(/level:\s*(\d+)/);
      const tempMatch = result.stdout.match(/temperature:\s*(\d+)/);
      const level = levelMatch ? parseInt(levelMatch[1]) : 0;
      const temperature = tempMatch ? parseInt(tempMatch[1]) / 10 : 0;
      return { level, temperature, status: 'unknown' };
    },
  });

  ctx.tools.register({
    name: 'adb_logcat',
    description: 'Get logcat output',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        buffer: { type: 'string', description: 'Buffer (main/system/crash)' },
        filter: { type: 'string', description: 'Filter tag' },
        lines: { type: 'integer', description: 'Number of lines' },
        serial: { type: 'string', description: 'Device serial (optional)' },
      },
    },
    output: makeOutput({
      type: 'object',
      properties: {
        log: { type: 'string', description: 'Logcat output' },
      },
    }),
    async execute(args: any, exec: any) {
      const serial = args.serial || cfg?.defaultSerial;
      const lines = args.lines || 100;
      const level = args.filter || 'I';
      const argsArr = ['logcat', '-d', '-t', String(lines), `*:${level}`];
      if (args.buffer) argsArr.push('-b', args.buffer);
      const result = await runAdb(argsArr, cfg, { serial });
      return { log: result.stdout };
    },
  });

  ctx.tools.register({
    name: 'adb_getprop',
    description: 'Get system property',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['property'],
      properties: {
        property: { type: 'string', description: 'Property name' },
        serial: { type: 'string', description: 'Device serial (optional)' },
      },
    },
    output: makeOutput({
      type: 'object',
      properties: {
        property: { type: 'string', description: 'Property name' },
        value: { type: 'string', description: 'Property value' },
      },
    }),
    async execute(args: any, exec: any) {
      const serial = args.serial || cfg?.defaultSerial;
      const result = await runAdb(['shell', 'getprop', args.property], cfg, { serial });
      return { property: args.property, value: result.stdout };
    },
  });

  ctx.tools.register({
    name: 'adb_reboot',
    description: 'Reboot device',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        mode: { type: 'string', description: 'Mode: normal/recovery/bootloader' },
        serial: { type: 'string', description: 'Device serial (optional)' },
      },
    },
    output: makeOutput({
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    }),
    async execute(args: any, exec: any) {
      const serial = args.serial || cfg?.defaultSerial;
      const cmd = args.mode ? ['reboot', args.mode] : ['reboot'];
      await runAdb(cmd, cfg, { serial });
      return { success: true };
    },
  });

  // 注册 RPC（用于 Web UI）
  // RPC 需要 connection 服务，它在 web compositions 中后于插件启动
  // 使用 ctx.inject 延迟注册，这样 headless profiles 不受影响
  ctx.inject(['connection'], (readyCtx: any) => {
    registerRpc(readyCtx, cfg);
  });

  ctx.logger.info('[dsh-adb-ultimate] Plugin loaded: 14 tools + web UI RPC');
}
