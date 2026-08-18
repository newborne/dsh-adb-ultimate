# dsh-adb-ultimate

> 全功能 ADB 设备管理插件 for [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness)

## 安装

```bash
dsh plugin --profile web add github:yourname/dsh-adb-ultimate
```

或从 npm 安装：

```bash
dsh plugin --profile web add dsh-adb-ultimate
```

## 功能

| 分类 | 工具 | 说明 |
|------|------|------|
| **设备管理** | `adb_list_devices` | 列出已连接设备 |
| | `adb_connect` | 连接无线设备 |
| | `adb_disconnect` | 断开设备 |
| | `adb_pair` | 配对设备 |
| | `adb_device_info` | 获取设备信息 |
| **屏幕操作** | `adb_screenshot` | 截图 |
| | `adb_screen_record` | 录屏 |
| | `adb_screen_on` | 亮屏 |
| | `adb_screen_off` | 灭屏 |
| **输入模拟** | `adb_input_tap` | 点击 |
| | `adb_input_swipe` | 滑动 |
| | `adb_input_text` | 输入文本 |
| | `adb_input_keyevent` | 按键事件 |
| **应用管理** | `adb_install` | 安装 APK |
| | `adb_uninstall` | 卸载 |
| | `adb_launch` | 启动应用 |
| | `adb_force_stop` | 强制停止 |
| | `adb_list_packages` | 列出应用 |
| **文件管理** | `adb_pull` | 拉取文件 |
| | `adb_push` | 推送文件 |
| | `adb_shell` | 执行 Shell |
| | `adb_ls` | 列出目录 |
| **性能监控** | `adb_meminfo` | 内存信息 |
| | `adb_cpuinfo` | CPU 信息 |
| | `adb_fps` | 帧率 |
| | `adb_battery` | 电池信息 |
| | `adb_perf_snapshot` | 性能快照 |
| **日志调试** | `adb_logcat` | 日志 |
| | `adb_bugreport` | Bug 报告 |
| | `adb_dumpsys` | 系统服务 |
| | `adb_getprop` | 系统属性 |
| **系统控制** | `adb_reboot` | 重启设备 |

## 配置

```yaml
# cordis.patch.yml
- id: dsh-adb-ultimate
  config:
    adbPath: auto              # 自动探测 ADB
    defaultSerial: ~            # 默认设备
    timeoutMs: 30000            # 超时
```

## 开发

```bash
npm install
npm run build    # 编译 TypeScript
npm test         # 运行测试
```

## License

MIT
