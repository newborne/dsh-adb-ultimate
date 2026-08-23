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
    // error.code === 'ENOENT' 是文件不存在
    // error.code === 127 是 shell 找不到命令
    if (error.code === 'ENOENT' || error.code === 127) {
      return { 
        exitCode: -1, 
        stdout: '', 
        stderr: 'ADB未安装，请复制以下内容给Agent: 安装谷歌官方ADB包，版本>=34.0.5，测试命令成功调用。' 
      };
    }
    if (error.killed) {
      return { exitCode: -2, stdout: '', stderr: '命令超时' };
    }
    return { exitCode: -3, stdout: '', stderr: error.message || '未知错误' };
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

// ============================================================
// UI Tree 解析
// ============================================================

interface UiNode {
  index: number;
  text: string;
  contentDesc: string;
  resourceId: string;
  className: string;
  packageName: string;
  clickable: boolean;
  enabled: boolean;
  bounds: { left: number; top: number; right: number; bottom: number };
  children: UiNode[];
}

interface Selector {
  text?: string;
  textContains?: string;
  description?: string;
  resourceId?: string;
  className?: string;
  packageName?: string;
  index?: number;
}

// 解析 uiautomator dump 输出
function parseUiTree(xml: string): UiNode[] {
  const nodes: UiNode[] = [];
  
  // 匹配每个 node 元素
  const nodeRegex = /<node[^>]*\/?>/g;
  let match;
  let index = 0;
  
  while ((match = nodeRegex.exec(xml)) !== null) {
    const nodeStr = match[0];
    const node: UiNode = {
      index: index++,
      text: '',
      contentDesc: '',
      resourceId: '',
      className: '',
      packageName: '',
      clickable: false,
      enabled: true,
      bounds: { left: 0, top: 0, right: 0, bottom: 0 },
      children: [],
    };
    
    // 解析属性
    const attrRegex = /(\w+)="([^"]*)"/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(nodeStr)) !== null) {
      const [, key, value] = attrMatch;
      switch (key) {
        case 'text': node.text = value; break;
        case 'content-desc': node.contentDesc = value; break;
        case 'resource-id': node.resourceId = value; break;
        case 'class': node.className = value; break;
        case 'package': node.packageName = value; break;
        case 'clickable': node.clickable = value === 'true'; break;
        case 'enabled': node.enabled = value === 'true'; break;
        case 'bounds': {
          const [l, t, r, b] = value.replace(/[\[\]]/g, '').split(',').map(Number);
          node.bounds = { left: l, top: t, right: r, bottom: b };
          break;
        }
      }
    }
    
    nodes.push(node);
  }
  
  return nodes;
}

// 查找匹配选择器的节点
function findNodesBySelector(nodes: UiNode[], selector: Selector): UiNode[] {
  const results: UiNode[] = [];
  
  for (const node of nodes) {
    let match = true;
    
    if (selector.text !== undefined && node.text !== selector.text) match = false;
    if (selector.textContains !== undefined && !node.text.includes(selector.textContains) && !node.contentDesc.includes(selector.textContains)) match = false;
    if (selector.description !== undefined && node.contentDesc !== selector.description) match = false;
    if (selector.resourceId !== undefined && !node.resourceId.includes(selector.resourceId)) match = false;
    if (selector.className !== undefined && !node.className.includes(selector.className)) match = false;
    if (selector.packageName !== undefined && node.packageName !== selector.packageName) match = false;
    
    if (match) results.push(node);
  }
  
  return results;
}

// 获取节点的中心点
function getNodeCenter(node: UiNode): { x: number; y: number } {
  const { left, top, right, bottom } = node.bounds;
  return {
    x: Math.round((left + right) / 2),
    y: Math.round((top + bottom) / 2),
  };
}

// 压缩 UI 树（省 token）
function compactUiTree(nodes: UiNode[]): string[] {
  const lines: string[] = [];
  
  function traverse(node: UiNode, depth: number = 0) {
    const indent = '  '.repeat(depth);
    const parts: string[] = [];
    
    if (node.text) parts.push(`"${node.text}"`);
    if (node.contentDesc) parts.push(`desc="${node.contentDesc}"`);
    if (node.resourceId) {
      const id = node.resourceId.split('/').pop() || node.resourceId;
      parts.push(`id="${id}"`);
    }
    if (node.className) {
      const cls = node.className.split('.').pop() || node.className;
      parts.push(`<${cls}>`);
    }
    if (node.clickable) parts.push('[clickable]');
    if (!node.enabled) parts.push('[disabled]');
    
    if (parts.length > 0) {
      lines.push(`${indent}└ ${parts.join(' ')}`);
    }
    
    for (const child of node.children) {
      traverse(child, depth + 1);
    }
  }
  
  for (const node of nodes) {
    traverse(node);
  }
  
  return lines;
}

// 获取完整 UI 树（原始格式）
function dumpUiTree(nodes: UiNode[]): string {
  const lines: string[] = [];
  
  for (const node of nodes) {
    const { left, top, right, bottom } = node.bounds;
    lines.push(`[${node.index}] ${node.className.split('.').pop()} text="${node.text}" desc="${node.contentDesc}" id="${node.resourceId}" clickable=${node.clickable} bounds=[${left},${top},${right},${bottom}]`);
  }
  
  return lines.join('\n');
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
        if (result.exitCode !== 0) throw new Error(result.stderr || '连接失败');
        return { ok: true, value: { target, connected: true, output: result.stdout } };
      }

      case 'pair': {
        const host = payload.host;
        const port = payload.port || 5555;
        const pairingCode = payload.pairingCode;
        const { appendFileSync } = await import('fs');
        appendFileSync('/tmp/dsh-adb-pair.log', `[${new Date().toISOString()}] pair called: host=${host}, port=${port}, code=${pairingCode}\n`);
        if (!pairingCode) {
          throw new Error('pairingCode 是必填的');
        }
        const target = `${host}:${port}`;
        const cmd = `${getAdbPath()} pair ${target} ${pairingCode}`;
        appendFileSync('/tmp/dsh-adb-pair.log', `[${new Date().toISOString()}] exec cmd: ${cmd}\n`);
        try {
          const { stdout, stderr } = await execAsync(cmd, { timeout: 30000 });
          appendFileSync('/tmp/dsh-adb-pair.log', `[${new Date().toISOString()}] exec done: stdout=${stdout}, stderr=${stderr}\n`);
          const combinedOutput = (stdout + stderr).toLowerCase();
          if (!combinedOutput.includes('success')) {
            throw new Error(stderr || stdout || '配对失败');
          }
          appendFileSync('/tmp/dsh-adb-pair.log', `[${new Date().toISOString()}] pair SUCCESS\n`);
          return { 
            ok: true, 
            value: { 
              target, 
              paired: true, 
              message: `配对成功！`
            } 
          };
        } catch (error: any) {
          appendFileSync('/tmp/dsh-adb-pair.log', `[${new Date().toISOString()}] pair ERROR: ${error.message}\n`);
          throw new Error(error.message || '配对失败，请检查 IP、端口和配对码是否正确');
        }
      }

      case 'generateQrCode': {
        // 生成二维码配对信息
        const generateString = (length: number) => {
          const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
          let result = '';
          for (let i = 0; i < length; i++) {
            result += charset.charAt(Math.floor(Math.random() * charset.length));
          }
          return result;
        };
        const name = `ADB_WIFI_${generateString(14)}-${generateString(6)}`;
        const password = generateString(21);
        const qrText = `WIFI:T:ADB;S:${name};P:${password};;`;
        ctx.logger.info(`[dsh-adb-ultimate] Generated QR code for pairing`);
        return { ok: true, value: { qrText, name, password } };
      }

      case 'waitForQrScan': {
        // 等待二维码被扫描，然后自动配对
        const password = payload.password;
        ctx.logger.info(`[dsh-adb-ultimate] Waiting for QR scan...`);
        // 等待设备通过 mDNS 广播
        for (let attempt = 1; attempt <= 30; attempt++) {
          try {
            const mdnsResult = await execAsync(`${getAdbPath()} mdns services`, { timeout: 5000 });
            const lines = mdnsResult.stdout.trim().split('\n');
            const match = lines.find((line: string) => line.includes('_adb-tls-pairing._tcp'));
            if (match) {
              const parts = match.trim().split(/\s+/);
              const addressPort = parts.find((p: string) => p.includes(':') && !p.includes('_adb'));
              if (addressPort) {
                const sepIndex = addressPort.lastIndexOf(':');
                const ip = addressPort.substring(0, sepIndex);
                const pairPort = addressPort.substring(sepIndex + 1);
                ctx.logger.info(`[dsh-adb-ultimate] Found device: ${ip}:${pairPort}`);
                // 配对
                const pairResult = await execAsync(`${getAdbPath()} pair ${ip}:${pairPort} ${password}`, { timeout: 15000 });
                ctx.logger.info(`[dsh-adb-ultimate] Pair result: ${pairResult.stdout}`);
                return { ok: true, value: { paired: true, output: pairResult.stdout } };
              }
            }
          } catch (e: any) {
            ctx.logger.info(`[dsh-adb-ultimate] mDNS attempt ${attempt}: ${e.message}`);
          }
          await new Promise(r => setTimeout(r, 1000));
        }
        return { ok: false, error: '等待扫描超时，请确保手机在同一个局域网且已打开"使用二维码配对设备"' };
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
        return { ok: true, value: {
          basic: { serial: serial || '', model: model.stdout, brand: brand.stdout },
          system: { androidVersion: androidVersion.stdout, sdk: parseInt(sdk.stdout) || 0 },
        } };
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

      case 'screenshotBase64': {
        const serial = payload.serial || cfg?.defaultSerial;
        const tempPath = '/sdcard/screenshot_base64.png';
        await runAdb(['shell', 'screencap', '-p', tempPath], cfg, { serial });
        const localPath = `/tmp/screenshot_${Date.now()}.png`;
        await runAdb(['pull', tempPath, localPath], cfg, { serial });
        await runAdb(['shell', 'rm', tempPath], cfg, { serial }).catch(() => {});
        // 读取文件并转为 base64
        const fs = await import('fs');
        const buffer = fs.readFileSync(localPath);
        const base64 = buffer.toString('base64');
        return { ok: true, value: { base64 } };
      }

      case 'processList': {
        const serial = payload.serial || cfg?.defaultSerial;
        const result = await runAdb(['shell', 'ps', '-A'], cfg, { serial });
        const processes = result.stdout
          .split('\n')
          .slice(1) // 跳过表头
          .map(line => {
            const parts = line.trim().split(/\s+/)
            if (parts.length < 9) return null
            const user = parts[0]
            const pid = parts[1]
            // 进程名是最后一部分，但需要处理多空格情况
            const name = parts.slice(8).join(' ')
            return { user, pid, name }
          })
          .filter(Boolean)
        return { ok: true, value: { processes } }
      }

      case 'enhancedPerf': {
        const serial = payload.serial || cfg?.defaultSerial;
        const [memResult, batteryResult, cpuResult] = await Promise.all([
          runAdb(['shell', 'cat', '/proc/meminfo'], cfg, { serial }),
          runAdb(['shell', 'dumpsys', 'battery'], cfg, { serial }),
          runAdb(['shell', 'cat', '/proc/cpuinfo'], cfg, { serial }),
        ])

        // 解析内存
        const memLines = memResult.stdout.split('\n')
        const getMemValue = (key: string): number => {
          const match = memLines.find((l: string) => l.startsWith(key))?.match(/(\d+)/)
          return match ? parseInt(match[1]) : 0
        }
        const memTotal = getMemValue('MemTotal')
        const memAvailable = getMemValue('MemAvailable') || getMemValue('MemFree')
        const memUsed = memTotal - memAvailable
        const memUsagePercent = memTotal > 0 ? Math.round((memUsed / memTotal) * 100) : 0

        // 解析电池
        const batteryLevelMatch = batteryResult.stdout.match(/level:\s*(\d+)/)
        const batteryTempMatch = batteryResult.stdout.match(/temperature:\s*(\d+)/)
        const batteryStatusMatch = batteryResult.stdout.match(/status:\s*(\w+)/)
        const batteryHealthMatch = batteryResult.stdout.match(/health:\s*(\w+)/)
        const batteryLevel = batteryLevelMatch ? parseInt(batteryLevelMatch[1]) : 0
        const batteryTemperature = batteryTempMatch ? (parseInt(batteryTempMatch[1]) / 10).toFixed(1) : '0'
        const batteryStatus = batteryStatusMatch ? batteryStatusMatch[1] : 'unknown'
        const batteryHealth = batteryHealthMatch ? batteryHealthMatch[1] : 'unknown'

        // 解析 CPU
        const cpuLines = cpuResult.stdout.split('\n')
        const cpuCores = cpuLines.filter((l: string) => l.startsWith('processor')).length || 4
        const cpuModelMatch = cpuResult.stdout.match(/Hardware\s*:\s*(.+)/)
        const cpuModel = cpuModelMatch ? cpuModelMatch[1].trim() : ''

        return {
          ok: true,
          value: {
            memory: {
              total: memTotal,
              available: memAvailable,
              used: memUsed,
              usagePercent: memUsagePercent,
              totalGB: (memTotal / 1024 / 1024).toFixed(1),
              availableGB: (memAvailable / 1024 / 1024).toFixed(1),
              usedGB: (memUsed / 1024 / 1024).toFixed(1),
            },
            battery: {
              level: batteryLevel,
              temperature: batteryTemperature,
              status: batteryStatus,
              health: batteryHealth,
            },
            cpu: {
              cores: cpuCores,
              model: cpuModel,
            },
          },
        }
      }

      case 'reboot': {
        const { mode = 'normal' } = payload;
        const serial = payload.serial || cfg?.defaultSerial;
        const cmd = mode === 'normal' ? ['reboot'] : ['reboot', mode];
        await runAdb(cmd, cfg, { serial });
        return { ok: true, value: { success: true } };
      }

      // v1.2: UI Tree
      case 'getUiTree': {
        const serial = payload.serial || cfg?.defaultSerial;
        const compact = payload.compact || false;
        await runAdb(['shell', 'uiautomator', 'dump', '/sdcard/dump.xml'], cfg, { serial });
        const dumpResult = await runAdb(['shell', 'cat', '/sdcard/dump.xml'], cfg, { serial });
        await runAdb(['shell', 'rm', '/sdcard/dump.xml'], cfg, { serial }).catch(() => {});
        const nodes = parseUiTree(dumpResult.stdout);
        const tree = compact ? compactUiTree(nodes).join('\n') : dumpUiTree(nodes);
        return { ok: true, value: { tree, count: nodes.length } };
      }

      case 'tapElement': {
        const { selector } = payload;
        const serial = payload.serial || cfg?.defaultSerial;
        await runAdb(['shell', 'uiautomator', 'dump', '/sdcard/dump.xml'], cfg, { serial });
        const dumpResult = await runAdb(['shell', 'cat', '/sdcard/dump.xml'], cfg, { serial });
        await runAdb(['shell', 'rm', '/sdcard/dump.xml'], cfg, { serial }).catch(() => {});
        const nodes = parseUiTree(dumpResult.stdout);
        const matches = findNodesBySelector(nodes, selector);
        if (matches.length === 0) {
          return { ok: false, error: { code: 'not_found', message: '未找到匹配的元素' } };
        }
        const target = matches[0];
        const center = getNodeCenter(target);
        await runAdb(['shell', 'input', 'tap', String(center.x), String(center.y)], cfg, { serial });
        return { ok: true, value: { success: true, element: { text: target.text, description: target.contentDesc, resourceId: target.resourceId, bounds: target.bounds, position: center } } };
      }

      case 'waitForElement': {
        const { selector, timeout = 10 } = payload;
        const serial = payload.serial || cfg?.defaultSerial;
        const startTime = Date.now();
        while (Date.now() - startTime < timeout * 1000) {
          await runAdb(['shell', 'uiautomator', 'dump', '/sdcard/dump.xml'], cfg, { serial });
          const dumpResult = await runAdb(['shell', 'cat', '/sdcard/dump.xml'], cfg, { serial });
          await runAdb(['shell', 'rm', '/sdcard/dump.xml'], cfg, { serial }).catch(() => {});
          const nodes = parseUiTree(dumpResult.stdout);
          const matches = findNodesBySelector(nodes, selector);
          if (matches.length > 0) {
            const target = matches[0];
            return { ok: true, value: { found: true, element: { text: target.text, description: target.contentDesc, resourceId: target.resourceId, bounds: target.bounds } } };
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        return { ok: true, value: { found: false } };
      }

      case 'scrollToElement': {
        const { selector, maxSwipes = 10 } = payload;
        const serial = payload.serial || cfg?.defaultSerial;
        const wmResult = await runAdb(['shell', 'wm', 'size'], cfg, { serial });
        const sizeMatch = wmResult.stdout.match(/(\d+)x(\d+)/);
        if (!sizeMatch) {
          return { ok: false, error: { code: 'internal', message: '无法获取屏幕分辨率' } };
        }
        const width = parseInt(sizeMatch[1]);
        const height = parseInt(sizeMatch[2]);
        for (let i = 0; i < maxSwipes; i++) {
          await runAdb(['shell', 'uiautomator', 'dump', '/sdcard/dump.xml'], cfg, { serial });
          const dumpResult = await runAdb(['shell', 'cat', '/sdcard/dump.xml'], cfg, { serial });
          await runAdb(['shell', 'rm', '/sdcard/dump.xml'], cfg, { serial }).catch(() => {});
          const nodes = parseUiTree(dumpResult.stdout);
          const matches = findNodesBySelector(nodes, selector);
          if (matches.length > 0) {
            const target = matches[0];
            return { ok: true, value: { found: true, element: { text: target.text, description: target.contentDesc, resourceId: target.resourceId, bounds: target.bounds }, swipes: i } };
          }
          const startX = Math.round(width / 2);
          const startY = Math.round(height * 0.8);
          const endX = Math.round(width / 2);
          const endY = Math.round(height * 0.3);
          await runAdb(['shell', 'input', 'swipe', String(startX), String(startY), String(endX), String(endY), '300'], cfg, { serial });
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        return { ok: true, value: { found: false, swipes: maxSwipes } };
      }

      case 'longPress': {
        const { x, y, duration = 500 } = payload;
        const serial = payload.serial || cfg?.defaultSerial;
        await runAdb(['shell', 'input', 'swipe', String(x), String(y), String(x), String(y), String(duration)], cfg, { serial });
        return { ok: true, value: { success: true } };
      }

      case 'launchApp': {
        const { package: pkg, activity } = payload;
        const serial = payload.serial || cfg?.defaultSerial;
        const component = activity ? `${pkg}/${activity}` : `${pkg}/.MainActivity`;
        await runAdb(['shell', 'am', 'start', '-n', component], cfg, { serial });
        return { ok: true, value: { success: true } };
      }

      // v2.0: Streaming RPC
      case 'screenCapture': {
        const serial = payload.serial || cfg?.defaultSerial;
        if (!serial) {
          return { ok: false, error: { code: 'param', message: '需要指定设备 serial' } };
        }
        try {
          await runAdb(['shell', 'screencap', '-p', '/sdcard/snapshot.png'], cfg, { serial });
          const localPath = `/tmp/snapshot_${serial.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
          await runAdb(['pull', '/sdcard/snapshot.png', localPath], cfg, { serial });
          await runAdb(['shell', 'rm', '/sdcard/snapshot.png'], cfg, { serial }).catch(() => {});
          const fs = await import('fs');
          const buffer = fs.readFileSync(localPath);
          const frame = buffer.toString('base64');
          fs.unlinkSync(localPath);
          const wmResult = await runAdb(['shell', 'wm', 'size'], cfg, { serial });
          const match = wmResult.stdout.match(/(\d+)x(\d+)/);
          const width = match ? parseInt(match[1]) : 0;
          const height = match ? parseInt(match[2]) : 0;
          return { ok: true, value: { frame, width, height, timestamp: Date.now() } };
        } catch (e: any) {
          return { ok: false, error: { code: 'internal', message: e.message || '截图失败' } };
        }
      }

      case 'tapAt': {
        const { x, y, normalized = false } = payload;
        const serial = payload.serial || cfg?.defaultSerial;
        if (!serial) {
          return { ok: false, error: { code: 'param', message: '需要指定设备 serial' } };
        }
        const wmResult = await runAdb(['shell', 'wm', 'size'], cfg, { serial });
        const match = wmResult.stdout.match(/(\d+)x(\d+)/);
        const width = match ? parseInt(match[1]) : 1080;
        const height = match ? parseInt(match[2]) : 1920;
        const deviceX = normalized ? Math.round(x * width) : Math.round(x);
        const deviceY = normalized ? Math.round(y * height) : Math.round(y);
        await runAdb(['shell', 'input', 'tap', String(deviceX), String(deviceY)], cfg, { serial });
        return { ok: true, value: { success: true, deviceX, deviceY } };
      }

      case 'swipeAt': {
        const { x1, y1, x2, y2, duration = 300, normalized = false } = payload;
        const serial = payload.serial || cfg?.defaultSerial;
        if (!serial) {
          return { ok: false, error: { code: 'param', message: '需要指定设备 serial' } };
        }
        const wmResult = await runAdb(['shell', 'wm', 'size'], cfg, { serial });
        const match = wmResult.stdout.match(/(\d+)x(\d+)/);
        const width = match ? parseInt(match[1]) : 1080;
        const height = match ? parseInt(match[2]) : 1920;
        const dx1 = normalized ? Math.round(x1 * width) : Math.round(x1);
        const dy1 = normalized ? Math.round(y1 * height) : Math.round(y1);
        const dx2 = normalized ? Math.round(x2 * width) : Math.round(x2);
        const dy2 = normalized ? Math.round(y2 * height) : Math.round(y2);
        await runAdb(['shell', 'input', 'swipe', String(dx1), String(dy1), String(dx2), String(dy2), String(duration)], cfg, { serial });
        return { ok: true, value: { success: true } };
      }

      case 'screenSize': {
        const serial = payload.serial || cfg?.defaultSerial;
        if (!serial) {
          return { ok: false, error: { code: 'param', message: '需要指定设备 serial' } };
        }
        const result = await runAdb(['shell', 'wm', 'size'], cfg, { serial });
        const match = result.stdout.match(/(\d+)x(\d+)/);
        if (!match) {
          return { ok: false, error: { code: 'internal', message: '无法获取屏幕分辨率' } };
        }
        return { ok: true, value: { width: parseInt(match[1]), height: parseInt(match[2]) } };
      }

      default:
        throw new Error(`unknown endpoint: ${endpoint}`);
    }
  } catch (error: any) {
    return { ok: false, error: { code: 'internal', message: error.message || String(error), details: {} } };
  }
}

// 注册 RPC
function registerRpc(ctx: any, cfg: any) {
  const connection = ctx.get('connection');
  const rpc = connection?.rpc;
  if (rpc === undefined) return;
  ctx.effect(() => rpc.handle(CHANNEL, (endpoint: string, raw: any, signal?: any) => handleRpcEndpoint(ctx, cfg, endpoint, raw, signal), 
  // Browser-only channel: accept requests from the loopback web GUI.
  { authority: 'loopback' }));
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
      return { ok: true, value: { path: finalPath } };
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
      return { ok: true, value: { success: result.stdout.includes('Success'), output: result.stdout } };
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
      return { ok: true, value: { success: result.stdout.includes('Success'), output: result.stdout } };
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
      return { ok: true, value: { success: true } };
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
      return { ok: true, value: { success: true } };
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
      return { ok: true, value: { packages, count: packages.length } };
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
      return { ok: true, value: { success: true } };
    },
  });

  // ============================================================
  // v1.2: 扩展 ADB 工具
  // ============================================================

  ctx.tools.register({
    name: 'adb_long_press',
    description: 'Long press on screen (tap + hold)',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['x', 'y'],
      properties: {
        x: { type: 'number', description: 'X coordinate' },
        y: { type: 'number', description: 'Y coordinate' },
        duration: { type: 'number', description: 'Duration in ms (default: 500)', default: 500 },
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
      const duration = args.duration || 500;
      await runAdb(['shell', 'input', 'swipe', String(args.x), String(args.y), String(args.x), String(args.y), String(duration)], cfg, { serial });
      return { ok: true, value: { success: true } };
    },
  });

  ctx.tools.register({
    name: 'adb_press_key',
    description: 'Press hardware/keyboard key (KEYCODE)',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['keycode'],
      properties: {
        keycode: { type: 'integer', description: 'Android KeyCode (3=BACK, 4=HOME, 26=POWER, 187=APP_SWITCH, 24=VOLUME_UP, 25=VOLUME_DOWN)' },
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
      await runAdb(['shell', 'input', 'keyevent', String(args.keycode)], cfg, { serial });
      return { ok: true, value: { success: true } };
    },
  });

  ctx.tools.register({
    name: 'adb_launch_app',
    description: 'Launch app by package name',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['package'],
      properties: {
        package: { type: 'string', description: 'Package name (e.g., com.android.chrome)' },
        activity: { type: 'string', description: 'Activity name (optional, starts main if not provided)' },
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
      let component = args.package;
      if (args.activity) {
        component = `${args.package}/${args.activity}`;
      }
      await runAdb(['shell', 'am', 'start', '-n', component], cfg, { serial });
      return { ok: true, value: { success: true } };
    },
  });

  ctx.tools.register({
    name: 'adb_clipboard_get',
    description: 'Get text from device clipboard',
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
        text: { type: 'string' },
      },
    }),
    async execute(args: any, exec: any) {
      const serial = args.serial || cfg?.defaultSerial;
      const result = await runAdb(['shell', 'am', 'broadcast', '-a', 'clipper.get'], cfg, { serial });
      return { ok: true, value: { text: result.stdout } };
    },
  });

  ctx.tools.register({
    name: 'adb_clipboard_set',
    description: 'Set text to device clipboard',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['text'],
      properties: {
        text: { type: 'string', description: 'Text to copy to clipboard' },
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
      // 使用 am broadcast 设置剪贴板
      await runAdb(['shell', 'am', 'broadcast', '-a', 'clipper.set', '--es', 'text', args.text], cfg, { serial });
      return { ok: true, value: { success: true } };
    },
  });

  // ============================================================
  // v1.2: UI 语义控制工具
  // ============================================================

  ctx.tools.register({
    name: 'adb_get_ui_tree',
    description: 'Get UI hierarchy tree (full version)',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        compact: { type: 'boolean', description: 'Return compact format to save tokens', default: false },
        serial: { type: 'string', description: 'Device serial (optional)' },
      },
    },
    output: makeOutput({
      type: 'object',
      properties: {
        tree: { type: 'string', description: 'UI tree in text format' },
        count: { type: 'number', description: 'Number of elements' },
      },
    }),
    async execute(args: any, exec: any) {
      const serial = args.serial || cfg?.defaultSerial;
      // 使用 uiautomator2 dump
      const result = await runAdb(['shell', 'uiautomator', 'dump', '/sdcard/dump.xml'], cfg, { serial });
      const pullResult = await runAdb(['shell', 'cat', '/sdcard/dump.xml'], cfg, { serial });
      await runAdb(['shell', 'rm', '/sdcard/dump.xml'], cfg, { serial }).catch(() => {});
      
      const nodes = parseUiTree(pullResult.stdout);
      const tree = args.compact ? compactUiTree(nodes).join('\n') : dumpUiTree(nodes);
      
      return { ok: true, value: { tree, count: nodes.length } };
    },
  });

  ctx.tools.register({
    name: 'adb_tap_element',
    description: 'Tap element by selector (text, description, resourceId, etc.)',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['selector'],
      properties: {
        selector: {
          type: 'object',
          description: 'Element selector (one of: text, textContains, description, resourceId)',
          properties: {
            text: { type: 'string', description: 'Exact text match' },
            textContains: { type: 'string', description: 'Text contains' },
            description: { type: 'string', description: 'Content description match' },
            resourceId: { type: 'string', description: 'Resource ID contains' },
            className: { type: 'string', description: 'Class name contains' },
            packageName: { type: 'string', description: 'Package name exact match' },
          },
        },
        serial: { type: 'string', description: 'Device serial (optional)' },
      },
    },
    output: makeOutput({
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        element: { type: 'object', description: 'Matched element info' },
      },
    }),
    async execute(args: any, exec: any) {
      const serial = args.serial || cfg?.defaultSerial;
      
      // Dump UI tree
      await runAdb(['shell', 'uiautomator', 'dump', '/sdcard/dump.xml'], cfg, { serial });
      const dumpResult = await runAdb(['shell', 'cat', '/sdcard/dump.xml'], cfg, { serial });
      await runAdb(['shell', 'rm', '/sdcard/dump.xml'], cfg, { serial }).catch(() => {});
      
      const nodes = parseUiTree(dumpResult.stdout);
      const matches = findNodesBySelector(nodes, args.selector);
      
      if (matches.length === 0) {
        return { ok: false, error: '未找到匹配的元素' };
      }
      
      // 选择第一个匹配的节点
      const target = matches[0];
      const center = getNodeCenter(target);
      
      // 点击
      await runAdb(['shell', 'input', 'tap', String(center.x), String(center.y)], cfg, { serial });
      
      return { 
        ok: true, 
        value: { 
          success: true, 
          element: {
            text: target.text,
            description: target.contentDesc,
            resourceId: target.resourceId,
            bounds: target.bounds,
            position: center,
          }
        } 
      };
    },
  });

  ctx.tools.register({
    name: 'adb_wait_for',
    description: 'Wait for element to appear on screen',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['selector'],
      properties: {
        selector: {
          type: 'object',
          description: 'Element selector',
          properties: {
            text: { type: 'string', description: 'Exact text match' },
            textContains: { type: 'string', description: 'Text contains' },
            description: { type: 'string', description: 'Content description match' },
            resourceId: { type: 'string', description: 'Resource ID contains' },
          },
        },
        timeout: { type: 'number', description: 'Timeout in seconds (default: 10)', default: 10 },
        serial: { type: 'string', description: 'Device serial (optional)' },
      },
    },
    output: makeOutput({
      type: 'object',
      properties: {
        found: { type: 'boolean', description: 'Whether element was found' },
        element: { type: 'object', description: 'Element info if found' },
      },
    }),
    async execute(args: any, exec: any) {
      const serial = args.serial || cfg?.defaultSerial;
      const timeout = args.timeout || 10;
      const startTime = Date.now();
      
      while (Date.now() - startTime < timeout * 1000) {
        await runAdb(['shell', 'uiautomator', 'dump', '/sdcard/dump.xml'], cfg, { serial });
        const dumpResult = await runAdb(['shell', 'cat', '/sdcard/dump.xml'], cfg, { serial });
        await runAdb(['shell', 'rm', '/sdcard/dump.xml'], cfg, { serial }).catch(() => {});
        
        const nodes = parseUiTree(dumpResult.stdout);
        const matches = findNodesBySelector(nodes, args.selector);
        
        if (matches.length > 0) {
          const target = matches[0];
          return { 
            ok: true, 
            value: { 
              found: true, 
              element: {
                text: target.text,
                description: target.contentDesc,
                resourceId: target.resourceId,
                bounds: target.bounds,
              }
            } 
          };
        }
        
        // 等待 500ms 再试
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      return { ok: true, value: { found: false } };
    },
  });

  ctx.tools.register({
    name: 'adb_scroll_to',
    description: 'Scroll to find element (swipe down until element appears)',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['selector'],
      properties: {
        selector: {
          type: 'object',
          description: 'Element selector',
          properties: {
            text: { type: 'string', description: 'Exact text match' },
            textContains: { type: 'string', description: 'Text contains' },
            description: { type: 'string', description: 'Content description match' },
            resourceId: { type: 'string', description: 'Resource ID contains' },
          },
        },
        maxSwipes: { type: 'number', description: 'Max swipe attempts (default: 10)', default: 10 },
        serial: { type: 'string', description: 'Device serial (optional)' },
      },
    },
    output: makeOutput({
      type: 'object',
      properties: {
        found: { type: 'boolean' },
        element: { type: 'object', description: 'Element info if found' },
        swipes: { type: 'number', description: 'Number of swipes performed' },
      },
    }),
    async execute(args: any, exec: any) {
      const serial = args.serial || cfg?.defaultSerial;
      const maxSwipes = args.maxSwipes || 10;
      
      // 获取屏幕分辨率
      const wmResult = await runAdb(['shell', 'wm', 'size'], cfg, { serial });
      const sizeMatch = wmResult.stdout.match(/(\d+)x(\d+)/);
      if (!sizeMatch) {
        return { ok: false, error: '无法获取屏幕分辨率' };
      }
      const width = parseInt(sizeMatch[1]);
      const height = parseInt(sizeMatch[2]);
      
      for (let i = 0; i < maxSwipes; i++) {
        // Dump and check
        await runAdb(['shell', 'uiautomator', 'dump', '/sdcard/dump.xml'], cfg, { serial });
        const dumpResult = await runAdb(['shell', 'cat', '/sdcard/dump.xml'], cfg, { serial });
        await runAdb(['shell', 'rm', '/sdcard/dump.xml'], cfg, { serial }).catch(() => {});
        
        const nodes = parseUiTree(dumpResult.stdout);
        const matches = findNodesBySelector(nodes, args.selector);
        
        if (matches.length > 0) {
          const target = matches[0];
          return { 
            ok: true, 
            value: { 
              found: true, 
              element: {
                text: target.text,
                description: target.contentDesc,
                resourceId: target.resourceId,
                bounds: target.bounds,
              },
              swipes: i 
            } 
          };
        }
        
        // 向上滑动 (从底部向上)
        const startX = Math.round(width / 2);
        const startY = Math.round(height * 0.8);
        const endX = Math.round(width / 2);
        const endY = Math.round(height * 0.3);
        await runAdb(['shell', 'input', 'swipe', String(startX), String(startY), String(endX), String(endY), '300'], cfg, { serial });
        
        // 等待滑动完成
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      return { ok: true, value: { found: false, swipes: maxSwipes } };
    },
  });

  // ============================================================
  // v2.0: 实时屏幕快照服务（轮询模式）
  // ============================================================

  // 屏幕快照缓存
  interface ScreenSnapshot {
    frame: string; // base64 编码的 PNG
    width: number;
    height: number;
    timestamp: number;
  }

  const screenSnapshots = new Map<string, ScreenSnapshot>();

  // 获取设备屏幕分辨率
  async function getDeviceScreenSize(serial: string): Promise<{ width: number; height: number }> {
    const result = await runAdb(['shell', 'wm', 'size'], {}, { serial });
    const match = result.stdout.match(/(\d+)x(\d+)/);
    if (match) {
      return { width: parseInt(match[1]), height: parseInt(match[2]) };
    }
    return { width: 1080, height: 1920 };
  }

  // 捕获屏幕快照
  async function captureScreenSnapshot(serial: string): Promise<ScreenSnapshot | null> {
    try {
      const { width, height } = await getDeviceScreenSize(serial);

      // 截图到设备临时文件
      await runAdb(['shell', 'screencap', '-p', '/sdcard/snapshot.png'], {}, { serial });

      // 拉取到本地
      const localPath = `/tmp/snapshot_${serial.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      await runAdb(['pull', '/sdcard/snapshot.png', localPath], {}, { serial });

      // 删除设备上的临时文件
      await runAdb(['shell', 'rm', '/sdcard/snapshot.png'], {}, { serial }).catch(() => {});

      // 读取并转为 base64
      const fs = await import('fs');
      const buffer = fs.readFileSync(localPath);
      const frame = buffer.toString('base64');
      fs.unlinkSync(localPath);

      return {
        frame,
        width,
        height,
        timestamp: Date.now(),
      };
    } catch (e) {
      return null;
    }
  }

  // 注册流媒体工具
  ctx.tools.register({
    name: 'adb_screen_capture',
    description: 'Capture current screen as base64 PNG (for streaming)',
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
        frame: { type: 'string', description: 'Base64 encoded PNG' },
        width: { type: 'number' },
        height: { type: 'number' },
        timestamp: { type: 'number' },
      },
    }),
    async execute(args: any, exec: any) {
      const serial = args.serial || cfg?.defaultSerial;
      if (!serial) {
        return { ok: false, error: '需要指定设备 serial' };
      }
      const snapshot = await captureScreenSnapshot(serial);
      if (!snapshot) {
        return { ok: false, error: '截图失败' };
      }
      // 缓存快照
      screenSnapshots.set(serial, snapshot);
      return { ok: true, value: snapshot };
    },
  });

  ctx.tools.register({
    name: 'adb_screen_stream_start',
    description: 'Start screen streaming session',
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
        sessionId: { type: 'string' },
        width: { type: 'number' },
        height: { type: 'number' },
      },
    }),
    async execute(args: any, exec: any) {
      const serial = args.serial || cfg?.defaultSerial;
      if (!serial) {
        return { ok: false, error: '需要指定设备 serial' };
      }
      const { width, height } = await getDeviceScreenSize(serial);
      const sessionId = `stream_${serial}_${Date.now()}`;
      return { 
        ok: true, 
        value: { 
          sessionId,
          width,
          height,
        } 
      };
    },
  });

  ctx.tools.register({
    name: 'adb_tap_at',
    description: 'Tap at screen coordinates (with coordinate transformation for streaming)',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['x', 'y'],
      properties: {
        x: { type: 'number', description: 'X coordinate (0-1 normalized, or absolute)' },
        y: { type: 'number', description: 'Y coordinate (0-1 normalized, or absolute)' },
        normalized: { type: 'boolean', description: 'If true, x/y are 0-1 normalized', default: false },
        serial: { type: 'string', description: 'Device serial (optional)' },
      },
    },
    output: makeOutput({
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        deviceX: { type: 'number' },
        deviceY: { type: 'number' },
      },
    }),
    async execute(args: any, exec: any) {
      const serial = args.serial || cfg?.defaultSerial;
      if (!serial) {
        return { ok: false, error: '需要指定设备 serial' };
      }

      const { width, height } = await getDeviceScreenSize(serial);
      let deviceX: number, deviceY: number;

      if (args.normalized) {
        // 归一化坐标 (0-1) 转换为绝对坐标
        deviceX = Math.round(args.x * width);
        deviceY = Math.round(args.y * height);
      } else {
        deviceX = Math.round(args.x);
        deviceY = Math.round(args.y);
      }

      await runAdb(['shell', 'input', 'tap', String(deviceX), String(deviceY)], {}, { serial });

      return { 
        ok: true, 
        value: { 
          success: true,
          deviceX,
          deviceY,
        } 
      };
    },
  });

  ctx.tools.register({
    name: 'adb_swipe_at',
    description: 'Swipe on screen',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['x1', 'y1', 'x2', 'y2'],
      properties: {
        x1: { type: 'number', description: 'Start X' },
        y1: { type: 'number', description: 'Start Y' },
        x2: { type: 'number', description: 'End X' },
        y2: { type: 'number', description: 'End Y' },
        duration: { type: 'number', description: 'Duration in ms', default: 300 },
        normalized: { type: 'boolean', description: 'If true, coordinates are 0-1 normalized', default: false },
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
      if (!serial) {
        return { ok: false, error: '需要指定设备 serial' };
      }

      const { width, height } = await getDeviceScreenSize(serial);
      let x1: number, y1: number, x2: number, y2: number;

      if (args.normalized) {
        x1 = Math.round(args.x1 * width);
        y1 = Math.round(args.y1 * height);
        x2 = Math.round(args.x2 * width);
        y2 = Math.round(args.y2 * height);
      } else {
        x1 = Math.round(args.x1);
        y1 = Math.round(args.y1);
        x2 = Math.round(args.x2);
        y2 = Math.round(args.y2);
      }

      await runAdb(['shell', 'input', 'swipe', String(x1), String(y1), String(x2), String(y2), String(args.duration || 300)], {}, { serial });

      return { ok: true, value: { success: true } };
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
