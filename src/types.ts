/**
 * 类型定义
 */

// 工具定义
export interface Tool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  returns: ToolReturn;
}

export interface ToolParameter {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  default?: any;
  enum?: string[];
}

export interface ToolReturn {
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
}

// 工具执行结果
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

// 设备信息
export interface Device {
  serial: string;
  state: 'device' | 'offline' | 'unauthorized' | 'no device';
  product?: string;
  model?: string;
  device?: string;
  transportId?: string;
}

// 电池信息
export interface BatteryInfo {
  level: number;          // 电量百分比
  status: string;         // 状态 (charging/discharging/full)
  health: string;         // 健康度
  temperature: number;     // 温度 (°C)
  voltage: number;         // 电压 (mV)
  technology: string;      // 电池技术
  ACpowered: boolean;     // AC充电
  USBpowered: boolean;    // USB充电
  Wirelesspowered: boolean; // 无线充电
}

// 内存信息
export interface MemoryInfo {
  total: number;          // 总内存 (KB)
  free: number;           // 空闲内存 (KB)
  available: number;       // 可用内存 (KB)
  used: number;           // 已使用 (KB)
  usagePercent: number;    // 使用率
  swapTotal: number;       // Swap总大小
  swapFree: number;        // Swap可用
}

// CPU信息
export interface CpuInfo {
  cores: number;          // 核心数
  architecture: string;    // 架构
  model: string;          // 型号
  bogoMips: number;       // BogoMIPS
  features: string[];     // CPU特性
}

// 应用信息
export interface AppInfo {
  packageName: string;     // 包名
  versionName: string;    // 版本名
  versionCode: number;     // 版本号
  dataDir: string;        // 数据目录
  apkPath: string;        // APK路径
  installed: string;       // 安装时间
  updated: string;        // 更新时间
  size: number;           // 应用大小
}

// 性能快照
export interface PerfSnapshot {
  timestamp: string;
  device: string;
  memory: MemoryInfo;
  cpu: { usage: number };
  fps: number;
  battery: BatteryInfo;
  topApps: { name: string; cpu: number; memory: number }[];
}

// 屏幕信息
export interface ScreenInfo {
  width: number;
  height: number;
  density: number;
  densityDpi: number;
  rotation: number;
}

// 文件信息
export interface FileInfo {
  path: string;
  name: string;
  size: number;
  mode: string;
  mtime: string;
  isDirectory: boolean;
  isFile: boolean;
}

// Logcat 条目
export interface LogcatEntry {
  time: string;
  level: 'V' | 'D' | 'I' | 'W' | 'E' | 'F' | 'S';
  tag: string;
  pid: number;
  message: string;
}

// 设备完整信息
export interface DeviceFullInfo {
  basic: {
    serial: string;
    model: string;
    brand: string;
    device: string;
    product: string;
  };
  system: {
    androidVersion: string;
    securityPatch: string;
    sdk: number;
    buildId: string;
    buildType: string;
  };
  hardware: {
    cpu: CpuInfo;
    memory: MemoryInfo;
    storage: { total: number; free: number };
  };
  screen: ScreenInfo;
  battery: BatteryInfo;
  network: {
    ip: string;
    mac: string;
  };
}
