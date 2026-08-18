/**
 * dsh-adb-ultimate
 * 全功能ADB设备管理插件 for DeepSeek Harness
 */

import { AdbClient, DeviceInfo } from './adb';
import * as tools from './tools';

// 插件元数据
export const pluginMeta = {
  id: 'dsh-adb-ultimate',
  name: 'ADB Ultimate',
  version: '1.0.0',
  description: '全功能ADB设备管理解决方案',
  author: 'Your Name',
  license: 'MIT',
};

// 导出类型
export { DeviceInfo, AdbError } from './adb';
export type { Tool, ToolResult, Device, BatteryInfo, MemoryInfo, CpuInfo, AppInfo } from './types';

// 导出工具
export const adbTools = tools;

// 默认导出的工具列表
export const toolDefinitions = [
  // 设备管理
  tools.adb_list_devices,
  tools.adb_connect,
  tools.adb_disconnect,
  tools.adb_pair,
  tools.adb_device_info,

  // 屏幕操作
  tools.adb_screenshot,
  tools.adb_screen_record,
  tools.adb_screen_on,
  tools.adb_screen_off,

  // 输入模拟
  tools.adb_input_tap,
  tools.adb_input_swipe,
  tools.adb_input_text,
  tools.adb_input_keyevent,

  // 应用管理
  tools.adb_install,
  tools.adb_uninstall,
  tools.adb_launch,
  tools.adb_force_stop,
  tools.adb_list_packages,

  // 文件管理
  tools.adb_pull,
  tools.adb_push,
  tools.adb_shell,

  // 性能监控
  tools.adb_meminfo,
  tools.adb_cpuinfo,
  tools.adb_fps,
  tools.adb_battery,
  tools.adb_perf_snapshot,

  // 日志调试
  tools.adb_logcat,
  tools.adb_bugreport,
  tools.adb_dumpsys,
  tools.adb_getprop,

  // 系统控制
  tools.adb_reboot,
];

// 插件初始化
export async function onLoad(config: Record<string, any>): Promise<void> {
  console.log('[dsh-adb-ultimate] Plugin loaded with config:', config);
}

// 插件卸载
export async function onUnload(): Promise<void> {
  console.log('[dsh-adb-ultimate] Plugin unloaded');
}

// 设备连接回调
export async function onDeviceConnected(device: DeviceInfo): Promise<void> {
  console.log('[dsh-adb-ultimate] Device connected:', device.serial);
}

// 设备断开回调
export async function onDeviceDisconnected(serial: string): Promise<void> {
  console.log('[dsh-adb-ultimate] Device disconnected:', serial);
}

export default {
  meta: pluginMeta,
  tools: toolDefinitions,
  onLoad,
  onUnload,
  onDeviceConnected,
  onDeviceDisconnected,
};
