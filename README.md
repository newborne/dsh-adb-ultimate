# dsh-adb-ultimate

> 全功能 ADB 设备管理插件 for [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Plugin ID](https://img.shields.io/badge/Plugin-dsh--adb--ultimate-blue)](https://github.com/yourname/dsh-adb-ultimate)

## 📱 简介

`dsh-adb-ultimate` 是一款为 DeepSeek Harness 设计的全功能 ADB 设备管理插件，支持：

- 🔌 **设备管理** - 连接、配对、发现多台 Android 设备
- 📸 **屏幕操作** - 截图、录屏、实时屏幕预览
- 🎮 **输入模拟** - 点击、滑动、文本输入、按键事件
- 📦 **应用管理** - 安装、卸载、启动、停止应用
- 📁 **文件管理** - 文件拉取/推送、目录浏览
- 📊 **性能监控** - 内存、CPU、帧率、电池实时监控
- 📝 **日志调试** - Logcat、BugReport、dumpsys
- 🔄 **系统控制** - 重启、关机、进入 Recovery/Bootloader

## 🚀 安装

### 从 GitHub 安装 (推荐)

```bash
dsh plugin --profile web add github:yourname/dsh-adb-ultimate
```

### 从 npm 安装

```bash
dsh plugin --profile web add dsh-adb-ultimate
```

### 手动安装

1. 克隆仓库：
```bash
git clone https://github.com/yourname/dsh-adb-ultimate.git
cd dsh-adb-ultimate
```

2. 安装依赖：
```bash
npm install
```

3. 构建：
```bash
npm run build
```

4. 链接到 DSH：
```bash
npm link
```

5. 在 DSH 中激活：
```bash
dsh plugin --profile web add ./dsh-adb-ultimate
```

## ⚙️ 配置

在 DSH 配置文件中添加：

```yaml
plugins:
  - id: dsh-adb-ultimate
    config:
      # ADB 路径，auto 表示自动探测
      adbPath: auto

      # 默认设备序列号
      defaultSerial: ~

      # 命令超时 (毫秒)
      timeoutMs: 30000

      # 截图保存目录
      screenshotDir: ~/.dsh/storages/dsh-adb-ultimate/screenshots

      # 性能监控采样间隔 (毫秒)
      monitorInterval: 1000

      # 告警阈值
      alertThresholds:
        cpu: 80        # CPU > 80%
        memory: 90     # 内存 > 90%
        batteryTemp: 45 # 电池温度 > 45°C
        fps: 30        # FPS < 30
```

## 📖 使用方法

### 前提条件

1. **安装 ADB**
   - Linux/macOS: `sudo apt install adb` 或 `brew install adb`
   - Windows: 下载 [Android SDK Platform Tools](https://developer.android.com/studio/releases/platform-tools)

2. **启用设备 ADB**
   - 在设备上进入「开发者选项」
   - 启用「USB 调试」或「无线调试」

### Agent 工具调用

在 DSH Agent 对话中，你可以直接调用以下工具：

#### 设备管理

```javascript
// 列出所有已连接设备
await adb_list_devices();

// 连接到无线设备
await adb_connect("192.168.1.100", 5555);

// 断开连接
await adb_disconnect("192.168.1.100", 5555);

// 配对设备 (需要配对码)
await adb_pair("192.168.1.100", 39223, "123456");

// 获取设备完整信息
await adb_device_info("192.168.1.100:5555");
```

#### 屏幕操作

```javascript
// 截图
await adb_screenshot("/tmp/screen.png");

// 录屏 (30秒)
await adb_screen_record(30, "/tmp/video.mp4");

// 点亮屏幕
await adb_screen_on();

// 关闭屏幕
await adb_screen_off();
```

#### 输入模拟

```javascript
// 点击屏幕 (坐标 500, 500)
await adb_input_tap(500, 500);

// 滑动 (从 500,500 滑到 500,800)
await adb_input_swipe(500, 500, 500, 800, 300);

// 输入文本
await adb_input_text("Hello World");

// 按键事件 (26=电源键)
await adb_input_keyevent(26);
```

#### 应用管理

```javascript
// 安装 APK
await adb_install("/path/to/app.apk", { replace: true, grant: true });

// 卸载应用
await adb_uninstall("com.example.app");

// 启动应用
await adb_launch("com.example.app");

// 强制停止
await adb_force_stop("com.example.app");

// 列出已安装应用
await adb_list_packages();
```

#### 文件管理

```javascript
// 从设备拉取文件
await adb_pull("/sdcard/screenshot.png", "/tmp/screen.png");

// 推送文件到设备
await adb_push("/local/file.apk", "/sdcard/file.apk");

// 执行 Shell 命令
await adb_shell("ls -la /sdcard");

// 列出目录
await adb_ls("/sdcard");
```

#### 性能监控

```javascript
// 获取内存信息
await adb_meminfo();

// 获取 CPU 信息
await adb_cpuinfo();

// 获取帧率
await adb_fps();

// 获取电池信息
await adb_battery();

// 获取完整性能快照
await adb_perf_snapshot();
```

#### 日志调试

```javascript
// 获取日志 (最近100行)
await adb_logcat({ lines: 100 });

// 获取指定过滤的日志
await adb_logcat({ filter: "ActivityManager", lines: 50 });

// 获取 Bug 报告
await adb_bugreport("/tmp/bugreport.zip");

// 获取系统服务信息
await adb_dumpsys("meminfo");

// 获取系统属性
await adb_getprop("ro.build.version.release");
```

#### 系统控制

```javascript
// 重启设备 (普通重启)
await adb_reboot("normal");

// 重启到 Recovery
await adb_reboot("recovery");

// 重启到 Bootloader
await adb_reboot("bootloader");
```

### 常用按键码

| 按键 | 键码 | 按键 | 键码 |
|------|------|------|------|
| 电源键 | 26 | 返回 | 4 |
| Home | 3 | 菜单 | 82 |
| 音量+ | 24 | 音量- | 25 |
| 静音 | 164 | 亮/暗 | 223 |

## 🛠️ 工具列表

| 分类 | 工具 | 描述 |
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
| | `adb_uninstall` | 卸载应用 |
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
| **系统控制** | `adb_reboot` | 重启 |

## 🔧 开发

### 项目结构

```
dsh-adb-ultimate/
├── src/
│   ├── index.ts          # 插件入口
│   ├── adb.ts            # ADB 核心封装
│   ├── types.ts          # 类型定义
│   └── tools/
│       └── index.ts      # 工具集
├── cordis.patch.yml      # 插件配置
├── package.json
├── tsconfig.json
└── README.md
```

### 构建

```bash
npm install
npm run build
```

### 测试

```bash
# 先连接设备
adb connect 192.168.1.100:5555

# 运行测试
npm test
```

### 发布

```bash
# 登录 npm
npm login

# 发布
npm publish --access public
```

## 📄 License

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [dsh-adb](https://github.com/SamXiaBing/dsh-adb) - 借鉴其 Agent 工具设计
- [adbkit](https://github.com/openstf/adbkit) - ADB 协议参考
- [Android SDK Platform Tools](https://developer.android.com/studio/releases/platform-tools) - ADB 官方文档

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

- GitHub Issues: [https://github.com/yourname/dsh-adb-ultimate/issues](https://github.com/yourname/dsh-adb-ultimate/issues)
- Email: your.email@example.com
