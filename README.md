# dsh-adb-ultimate

全功能 ADB 设备管理插件，专为 [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) 设计。

## 功能特性

### 🔌 设备连接
- **无线连接** - 通过 IP 地址连接 Android 设备
- **WiFi 配对** - 支持首次连接时的配对验证
- **历史记录** - 自动保存连接历史，快速重连
- **多设备管理** - 同时管理多台设备

### 📱 Agent 工具集 (32个)

| 分类 | 工具 | 说明 |
|------|------|------|
| **设备管理** | `adb_list_devices` | 列出所有已连接设备 |
| | `adb_connect` | 连接无线设备 (IP:Port) |
| | `adb_disconnect` | 断开指定设备或全部断开 |
| | `adb_pair` | WiFi 配对 (需要配对码) |
| | `adb_device_info` | 获取设备详细信息 |
| **屏幕操作** | `adb_screenshot` | 截图并保存到本地 |
| | `adb_screen_on` | 唤醒屏幕 |
| | `adb_screen_off` | 关闭屏幕 |
| **输入模拟** | `adb_input_tap` | 模拟点击 |
| | `adb_input_swipe` | 模拟滑动 |
| | `adb_input_text` | 输入文本 |
| | `adb_input_keyevent` | 按键事件 |
| **应用管理** | `adb_install` | 安装 APK |
| | `adb_uninstall` | 卸载应用 |
| | `adb_launch` | 启动应用 |
| | `adb_force_stop` | 强制停止应用 |
| | `adb_list_packages` | 列出已安装应用 |
| **文件管理** | `adb_pull` | 从设备拉取文件 |
| | `adb_push` | 推送文件到设备 |
| | `adb_shell` | 执行 Shell 命令 |
| | `adb_ls` | 列出目录文件 |
| **性能监控** | `adb_meminfo` | 内存使用信息 |
| | `adb_cpuinfo` | CPU 信息 |
| | `adb_fps` | 实时帧率 |
| | `adb_battery` | 电池状态 |
| | `adb_perf_snapshot` | 综合性能快照 |
| **日志调试** | `adb_logcat` | 查看设备日志 |
| | `adb_bugreport` | 抓取 Bug 报告 |
| | `adb_dumpsys` | 查询系统服务 |
| | `adb_getprop` | 读取系统属性 |
| **系统控制** | `adb_reboot` | 重启设备 |

### 💻 Web UI 面板

在会话视图中集成设备管理面板，包含四个功能标签页：

| 标签 | 功能 |
|------|------|
| 📋 **信息** | 设备型号、品牌、系统版本、序列号、安全补丁等 |
| 📊 **性能** | 实时内存、CPU、帧率、电池状态监控 |
| 📦 **应用** | 浏览、搜索已安装应用 |
| 📝 **日志** | 实时 logcat 输出，支持过滤 |

### 🔒 安全特性

- **本地 RPC 通道** - 仅接受来自 loopback 的请求
- **超时保护** - 所有 ADB 命令设有超时限制
- **错误分类** - 结构化错误码便于调试

## 安装

### 方式一：GitHub 安装

```bash
dsh plugin --profile web add github:yourusername/dsh-adb-ultimate
```

### 方式二：本地安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/dsh-adb-ultimate.git
# 安装到 DSH
dsh plugin --profile web add /path/to/dsh-adb-ultimate
```

### 方式三：开发模式

```bash
# 进入项目目录
cd dsh-adb-ultimate

# 安装依赖
npm install

# 构建
npm run build

# 链接到 DSH (开发时)
dsh plugin --profile web add /home/droid/dsh-adb-ultimate
```

## 使用指南

### 首次连接配对设备

1. 打开设备面板，点击「首次连接？使用配对码」
2. 输入设备的 IP 地址和随机端口号
3. 输入配对码，点击「配对」
4. 配对成功后，使用显示的连接端口进行连接

### 连接已配对设备

1. 输入设备 IP 和端口号（通常是 5555 或配对后显示的端口）
2. 点击「连接」
3. 连接成功后设备会出现在设备列表中

### 使用 Agent 工具

```
# 查看设备列表
adb_list_devices

# 连接无线设备
adb_connect ip:port

# 安装应用
adb_install /path/to/app.apk

# 截图
adb_screenshot

# 查看应用列表
adb_list_packages

# 抓取日志
adb_logcat
```

## 配置

在 DSH 配置文件中添加：

```yaml
plugins:
  dsh-adb-ultimate:
    adbPath: /usr/local/bin/adb  # ADB 路径，默认自动探测
    defaultSerial: 192.168.1.100:5555  # 默认设备
    timeoutMs: 30000  # 命令超时，默认 30 秒
```

## 项目结构

```
dsh-adb-ultimate/
├── src/
│   ├── index.ts          # 插件入口、RPC 处理器
│   └── tools/            # 工具函数实现
│       └── index.ts
├── client.js             # Web UI 面板 (注入到会话视图)
├── lib/                  # TypeScript 编译输出
├── cordis.patch.yml      # Cordis 插件配置
├── package.json
├── tsconfig.json
└── README.md
```

## 技术栈

- **TypeScript** - 类型安全
- **Cordis** - DSH 插件框架
- **React** - Web UI 面板
- **ADB** - Android Debug Bridge

## 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 代码检查
npm run lint
```

## License

MIT
