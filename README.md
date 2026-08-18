# dsh-adb-ultimate

> 全功能 ADB 设备管理插件 for [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📱 简介

`dsh-adb-ultimate` 是一款为 DeepSeek Harness 设计的全功能 ADB 设备管理插件，包含 **Web UI 界面** 和 **Agent 工具集**。

### 功能特性

| 模块 | 功能 |
|------|------|
| 📋 **设备管理** | 连接、配对、发现多台 Android 设备 |
| 🖥️ **屏幕预览** | 实时屏幕监控、触摸交互 |
| 📊 **性能监控** | CPU、内存、帧率、电池实时仪表盘 |
| 📦 **应用管理** | 安装、卸载、启动、停止应用 |
| 📁 **文件管理** | 文件拉取/推送、目录浏览 |
| 📝 **Logcat** | 实时日志监控、过滤、导出 |
| ⌨️ **Shell 终端** | 交互式命令执行 |
| 🤖 **Agent 工具** | 30+ 工具函数供 AI 调用 |

## 🚀 快速开始

### 1. 安装插件

```bash
dsh plugin --profile web add github:yourname/dsh-adb-ultimate
```

### 2. 启动 Web 服务

```bash
cd dsh-adb-ultimate
npm install
npm run dev
```

访问 `http://localhost:3456` 打开 Web UI。

### 3. 在 Agent 中使用

连接设备后，可以直接用自然语言让 Agent 操作设备：

```
用户: "查看设备信息"
Agent: 调用 adb_device_info

用户: "截个图"
Agent: 调用 adb_screenshot

用户: "安装这个应用到设备"
Agent: 调用 adb_install
```

## 🌐 Web UI 功能

### 设备管理面板
- 设备卡片展示：品牌、型号、IP、连接状态
- 一键连接/断开无线设备
- 配对码配对支持
- 设备详情：Android 版本、CPU、内存、存储

### 屏幕预览
- 实时屏幕显示
- 触摸操作：点击、滑动
- 快捷按键：Home、返回、最近任务
- 一键截图

### 性能监控仪表盘
- CPU 使用率（实时图表）
- 内存使用情况
- 电池状态（电量、温度）
- 帧率监控
- 存储空间
- 网络状态
- 历史趋势图

### 应用管理
- 应用列表（支持搜索）
- 应用详情
- 一键启动/停止
- 卸载应用

### 文件管理
- 目录浏览
- 文件拉取到本地
- 文件推送到设备

### Logcat 日志
- 实时日志流
- 级别过滤
- 标签过滤
- 日志搜索
- 导出日志

### Shell 终端
- 执行任意 shell 命令
- 命令历史
- 输出分页

## 🤖 Agent 工具

插件提供 30+ 工具函数，Agent 可根据场景自动调用：

### 设备管理
| 工具 | 说明 |
|------|------|
| `adb_list_devices` | 列出已连接设备 |
| `adb_connect` | 连接无线设备 |
| `adb_disconnect` | 断开设备 |
| `adb_pair` | 配对设备 |
| `adb_device_info` | 获取设备信息 |

### 屏幕操作
| 工具 | 说明 |
|------|------|
| `adb_screenshot` | 截图 |
| `adb_screen_record` | 录屏 |
| `adb_screen_on` | 亮屏 |
| `adb_screen_off` | 灭屏 |

### 输入模拟
| 工具 | 说明 |
|------|------|
| `adb_input_tap` | 点击 |
| `adb_input_swipe` | 滑动 |
| `adb_input_text` | 输入文本 |
| `adb_input_keyevent` | 按键 |

### 应用管理
| 工具 | 说明 |
|------|------|
| `adb_install` | 安装 APK |
| `adb_uninstall` | 卸载 |
| `adb_launch` | 启动 |
| `adb_force_stop` | 强制停止 |
| `adb_list_packages` | 列出应用 |

### 性能监控
| 工具 | 说明 |
|------|------|
| `adb_meminfo` | 内存信息 |
| `adb_cpuinfo` | CPU 信息 |
| `adb_fps` | 帧率 |
| `adb_battery` | 电池 |
| `adb_perf_snapshot` | 完整快照 |

### 日志调试
| 工具 | 说明 |
|------|------|
| `adb_logcat` | 日志 |
| `adb_bugreport` | Bug 报告 |
| `adb_dumpsys` | 系统服务 |
| `adb_getprop` | 系统属性 |

## ⚙️ 配置

```yaml
# cordis.patch.yml
- id: dsh-adb-ultimate
  config:
    adbPath: auto              # 自动探测
    defaultSerial: ~            # 默认设备
    timeoutMs: 30000            # 超时
    webPort: 3456              # Web 端口
```

## 📁 项目结构

```
dsh-adb-ultimate/
├── src/
│   ├── index.ts          # 插件入口
│   ├── adb.ts            # ADB 核心封装
│   ├── server.ts         # Web 服务端
│   ├── types.ts          # 类型定义
│   └── tools/
│       └── index.ts      # 工具函数
├── web/
│   └── public/
│       ├── index.html    # Web UI
│       ├── style.css     # 样式
│       └── app.js        # 前端逻辑
├── lib/                   # 编译输出
├── cordis.patch.yml      # 插件配置
└── README.md
```

## 🛠️ 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 运行 Web 服务
npm run dev

# 或一键启动
npm start
```

## 📄 License

MIT License

## 🙏 参考

- [dsh-adb](https://github.com/SamXiaBing/dsh-adb) - ADB 设备台架运维工具集
- [adbkit](https://github.com/openstf/adbkit) - Pure Node.js ADB Client
