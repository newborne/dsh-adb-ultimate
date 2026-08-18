/**
 * dsh-adb-ultimate - 全功能 ADB 设备管理插件
 *
 * 插件入口：导出工具定义
 */

import * as adbTools from './tools/index.js';

// 插件名称
export const name = 'dsh-adb-ultimate';

// 插件版本
export const version = '1.0.0';

// 工具定义
export const toolDefinitions = [
  // ========== 设备管理 ==========
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
      { name: 'port', description: '端口号，默认 5555', type: 'number', required: false },
    ],
  },
  {
    name: 'adb_disconnect',
    description: '断开无线设备连接',
    parameters: [
      { name: 'host', description: '设备 IP 地址', type: 'string', required: true },
      { name: 'port', description: '端口号，默认 5555', type: 'number', required: false },
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

  // ========== 屏幕操作 ==========
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
      { name: 'duration', description: '录制时长(秒)', type: 'number', required: false },
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

  // ========== 输入模拟 ==========
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
      { name: 'duration', description: '持续时间(ms)', type: 'number', required: false },
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

  // ========== 应用管理 ==========
  {
    name: 'adb_install',
    description: '安装 APK',
    parameters: [
      { name: 'apkPath', description: 'APK 文件路径', type: 'string', required: true },
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

  // ========== 文件管理 ==========
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

  // ========== 性能监控 ==========
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

  // ========== 日志调试 ==========
  {
    name: 'adb_logcat',
    description: '获取日志',
    parameters: [
      { name: 'buffer', description: '缓冲区 (main/system/crash)', type: 'string', required: false },
      { name: 'filter', description: '过滤标签', type: 'string', required: false },
      { name: 'lines', description: '行数', type: 'number', required: false },
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

  // ========== 系统控制 ==========
  {
    name: 'adb_reboot',
    description: '重启设备',
    parameters: [
      { name: 'mode', description: '重启模式 (normal/recovery/bootloader)', type: 'string', required: false },
      { name: 'serial', description: '设备序列号', type: 'string', required: false },
    ],
  },
];

// 导出工具函数
export const adb_list_devices = adbTools.adb_list_devices;
export const adb_connect = adbTools.adb_connect;
export const adb_disconnect = adbTools.adb_disconnect;
export const adb_pair = adbTools.adb_pair;
export const adb_device_info = adbTools.adb_device_info;
export const adb_screenshot = adbTools.adb_screenshot;
export const adb_screen_record = adbTools.adb_screen_record;
export const adb_screen_on = adbTools.adb_screen_on;
export const adb_screen_off = adbTools.adb_screen_off;
export const adb_input_tap = adbTools.adb_input_tap;
export const adb_input_swipe = adbTools.adb_input_swipe;
export const adb_input_text = adbTools.adb_input_text;
export const adb_input_keyevent = adbTools.adb_input_keyevent;
export const adb_install = adbTools.adb_install;
export const adb_uninstall = adbTools.adb_uninstall;
export const adb_launch = adbTools.adb_launch;
export const adb_force_stop = adbTools.adb_force_stop;
export const adb_list_packages = adbTools.adb_list_packages;
export const adb_pull = adbTools.adb_pull;
export const adb_push = adbTools.adb_push;
export const adb_shell = adbTools.adb_shell;
export const adb_ls = adbTools.adb_ls;
export const adb_meminfo = adbTools.adb_meminfo;
export const adb_cpuinfo = adbTools.adb_cpuinfo;
export const adb_fps = adbTools.adb_fps;
export const adb_battery = adbTools.adb_battery;
export const adb_perf_snapshot = adbTools.adb_perf_snapshot;
export const adb_logcat = adbTools.adb_logcat;
export const adb_bugreport = adbTools.adb_bugreport;
export const adb_dumpsys = adbTools.adb_dumpsys;
export const adb_getprop = adbTools.adb_getprop;
export const adb_reboot = adbTools.adb_reboot;

// 默认导出
export default {
  name,
  version,
  toolDefinitions,
};
