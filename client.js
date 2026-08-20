/**
 * dsh-adb-ultimate Web UI (client half)
 * 注入到 DSH 会话视图的"设备"面板
 * 
 * 使用 window.__ModuleLoader__.load() 加载
 * 通过 rpc.call() 与 Host 通信
 */

window.__ModuleLoader__.load({
  id: 'dsh-adb-ultimate',
  factory: (require) => {
    'use strict'
    const module = { exports: {} }

    const React = require('react')
    const CHANNEL = '/dsh-adb-ultimate'

    // 工具名称列表
    const TOOLS = [
      'adb_list_devices', 'adb_connect', 'adb_disconnect', 'adb_pair', 'adb_device_info',
      'adb_screenshot', 'adb_screen_record', 'adb_screen_on', 'adb_screen_off',
      'adb_input_tap', 'adb_input_swipe', 'adb_input_text', 'adb_input_keyevent',
      'adb_install', 'adb_uninstall', 'adb_launch', 'adb_force_stop', 'adb_list_packages',
      'adb_pull', 'adb_push', 'adb_shell', 'adb_ls',
      'adb_meminfo', 'adb_cpuinfo', 'adb_fps', 'adb_battery', 'adb_perf_snapshot',
      'adb_logcat', 'adb_bugreport', 'adb_dumpsys', 'adb_getprop', 'adb_reboot'
    ]

    // 样式
    const h = React.createElement
    const ROW = { display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }
    const BTN = { padding: '4px 12px', cursor: 'pointer', border: 'none', borderRadius: 4 }
    const INPUT = { padding: '4px 8px', border: '1px solid var(--dsh-border, #333)', borderRadius: 4 }
    const CARD = { border: '1px solid var(--dsh-border, #333)', borderRadius: 8, padding: 12, marginBottom: 12 }
    const LABEL = { color: 'var(--dsh-text-secondary, #888)', fontSize: 12 }

    // 工具调用封装
    function unwrap(value) {
      if (typeof value !== 'object' || value === null) {
        throw new Error('dsh-adb-ultimate host returned invalid response')
      }
      if (value.ok === true && 'value' in value) return value.value
      if (value.ok === false && value.error) {
        throw new Error(value.error.message ?? 'dsh-adb-ultimate request failed')
      }
      throw new Error('dsh-adb-ultimate host returned invalid response')
    }

    function createRuntime(rpc) {
      const call = (method, params) => rpc.call(CHANNEL, method, params).then(unwrap)

      return {
        // 设备管理
        listDevices: () => call('listDevices', {}),
        connect: (host, port) => call('connect', { host, port }),
        disconnect: (host, port) => call('disconnect', { host, port }),
        pair: (host, port, pairingCode) => call('pair', { host, port, pairingCode }),
        getDeviceInfo: (serial) => call('getDeviceInfo', { serial }),

        // 屏幕操作
        screenshot: (savePath, serial) => call('screenshot', { savePath, serial }),
        screenOn: (serial) => call('screenOn', { serial }),
        screenOff: (serial) => call('screenOff', { serial }),

        // 输入模拟
        inputTap: (x, y, serial) => call('inputTap', { x, y, serial }),
        inputSwipe: (x1, y1, x2, y2, duration, serial) => call('inputSwipe', { x1, y1, x2, y2, duration, serial }),
        inputText: (text, serial) => call('inputText', { text, serial }),
        inputKeyevent: (keyCode, serial) => call('inputKeyevent', { keyCode, serial }),

        // 应用管理
        listPackages: (serial) => call('listPackages', { serial }),
        install: (apkPath, serial) => call('install', { apkPath, serial }),
        uninstall: (packageName, serial) => call('uninstall', { packageName, serial }),
        launch: (packageName, serial) => call('launch', { packageName, serial }),
        forceStop: (packageName, serial) => call('forceStop', { packageName, serial }),

        // 性能监控
        meminfo: (serial) => call('meminfo', { serial }),
        cpuinfo: (serial) => call('cpuinfo', { serial }),
        fps: (serial) => call('fps', { serial }),
        battery: (serial) => call('battery', { serial }),
        perfSnapshot: (serial) => call('perfSnapshot', { serial }),

        // 日志调试
        logcat: (options, serial) => call('logcat', { ...options, serial }),
        bugreport: (savePath, serial) => call('bugreport', { savePath, serial }),
        dumpsys: (service, serial) => call('dumpsys', { service, serial }),
        getprop: (property, serial) => call('getprop', { property, serial }),

        // 系统控制
        reboot: (mode, serial) => call('reboot', { mode, serial }),
      }
    }

    // 设备卡片组件
    function DeviceCard({ device, selected, onSelect }) {
      const isOnline = device.state === 'device'
      return h('div', {
        onClick: () => onSelect(device),
        style: {
          ...CARD,
          cursor: 'pointer',
          background: selected?.serial === device.serial ? 'var(--dsh-accent-soft, rgba(66,133,244,.15))' : 'transparent',
          border: selected?.serial === device.serial ? '2px solid var(--dsh-accent, #4285f4)' : '1px solid var(--dsh-border, #333)',
        }
      },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
          h('strong', null, device.model || 'Unknown Device'),
          h('span', {
            style: {
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 11,
              background: isOnline ? '#22c55e' : '#ef4444',
              color: '#fff'
            }
          }, isOnline ? '在线' : device.state)
        ),
        h('div', { style: { fontSize: 12, color: 'var(--dsh-text-secondary, #888)' } },
          h('div', null, device.serial),
          device.product && h('div', null, `产品: ${device.product}`)
        )
      )
    }

    // 性能指标行
    function MetricRow({ label, value }) {
      return h('tr', null,
        h('td', { style: { padding: '4px 12px 4px 0', color: 'var(--dsh-text-secondary, #888)', whiteSpace: 'nowrap' } }, label),
        h('td', { style: { padding: '4px 0', fontWeight: 500 } }, String(value))
      )
    }

    // 主视图组件
    function DeviceView(props) {
      const runtime = props.runtime
      const [devices, setDevices] = React.useState([])
      const [selected, setSelected] = React.useState(null)
      const [activeTab, setActiveTab] = React.useState('info')
      const [info, setInfo] = React.useState(null)
      const [mem, setMem] = React.useState(null)
      const [battery, setBattery] = React.useState(null)
      const [packages, setPackages] = React.useState([])
      const [pkgSearch, setPkgSearch] = React.useState('')
      const [logText, setLogText] = React.useState('')
      const [logFilter, setLogFilter] = React.useState({ level: 'I', lines: 50 })
      const [connectIP, setConnectIP] = React.useState('')
      const [connectPort, setConnectPort] = React.useState('5555')
      const [pairingCode, setPairingCode] = React.useState('')
      const [isPairMode, setIsPairMode] = React.useState(false)
      const [error, setError] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const [history, setHistory] = React.useState(() => {
        try { return JSON.parse(localStorage.getItem('dsh-adb-ultimate-history') || '[]') } 
        catch { return [] }
      })

      // 保存历史到 localStorage
      const saveHistory = (newHistory) => {
        setHistory(newHistory)
        localStorage.setItem('dsh-adb-ultimate-history', JSON.stringify(newHistory.slice(0, 10)))
      }

      // 添加到历史记录
      const addToHistory = (ip, port) => {
        const key = `${ip}:${port}`
        const newHistory = history.filter(h => h.key !== key)
        newHistory.unshift({ key, ip, port, time: Date.now() })
        saveHistory(newHistory)
      }

      // 点击历史记录
      const handleHistoryClick = (item) => {
        setConnectIP(item.ip)
        setConnectPort(item.port)
      }

      // 删除历史记录
      const deleteHistory = (e, key) => {
        e.stopPropagation()
        saveHistory(history.filter(h => h.key !== key))
      }

      // 加载设备列表
      const loadDevices = React.useCallback(() => {
        setBusy(true)
        setError(null)
        runtime.listDevices()
          .then(data => setDevices(data.devices || []))
          .catch(e => setError(String(e.message || e)))
          .finally(() => setBusy(false))
      }, [runtime])

      React.useEffect(loadDevices, [runtime])

      // 选择设备后加载信息
      React.useEffect(() => {
        if (!selected) return
        setActiveTab('info')
        setInfo(null)
        setMem(null)
        setBattery(null)

        runtime.getDeviceInfo(selected.serial)
          .then(setInfo)
          .catch(e => setError(String(e.message || e)))

        runtime.meminfo(selected.serial)
          .then(setMem)
          .catch(() => {})

        runtime.battery(selected.serial)
          .then(setBattery)
          .catch(() => {})
      }, [selected, runtime])

      // 加载包列表
      const loadPackages = React.useCallback(() => {
        if (!selected) return
        runtime.listPackages(selected.serial)
          .then(data => setPackages(data.packages || []))
          .catch(() => {})
      }, [selected, runtime])

      // 加载日志
      const loadLogcat = () => {
        if (!selected) return
        runtime.logcat({ ...logFilter }, selected.serial)
          .then(data => setLogText(data.log || ''))
          .catch(() => setLogText('获取日志失败'))
      }

      const handleConnect = () => {
        if (!connectIP) return
        setBusy(true)
        if (isPairMode) {
          // 配对模式 - 需要配对码
          if (!pairingCode) {
            setError('请输入配对码')
            setBusy(false)
            return
          }
          runtime.pair(connectIP, parseInt(connectPort) || 5555, pairingCode)
            .then((data) => {
              alert('配对成功: ' + (data.output || ''))
              addToHistory(connectIP, connectPort)
              loadDevices()
              setConnectIP('')
              setPairingCode('')
              setIsPairMode(false)
            })
            .catch(e => setError(String(e.message || e)))
            .finally(() => setBusy(false))
        } else {
          // 普通连接模式
          runtime.connect(connectIP, parseInt(connectPort) || 5555)
            .then(() => { 
              addToHistory(connectIP, connectPort)
              loadDevices()
              setConnectIP('')
            })
            .catch(e => setError(String(e.message || e)))
            .finally(() => setBusy(false))
        }
      }

      const handleScreenshot = () => {
        if (!selected) return
        runtime.screenshot(null, selected.serial)
          .then(data => alert('截图已保存: ' + data.path))
          .catch(e => setError(String(e.message || e)))
      }

      const handleReboot = (mode) => {
        if (!selected) return
        if (!confirm(`确定要重启到 ${mode || 'normal'} 吗？`)) return
        runtime.reboot(mode || 'normal', selected.serial)
          .then(() => alert('重启命令已发送'))
          .catch(e => setError(String(e.message || e)))
      }

      const filteredPackages = pkgSearch
        ? packages.filter(p => p.toLowerCase().includes(pkgSearch.toLowerCase()))
        : packages.slice(0, 100)

      return h('div', { style: { padding: 12, fontFamily: 'inherit', fontSize: 13 } },

        // 头部
        h('div', { style: { ...ROW, justifyContent: 'space-between', marginBottom: 12 } },
          h('strong', { style: { fontSize: 16 } }, '📱 ADB Ultimate'),
          h('button', { style: { ...BTN, background: 'var(--dsh-accent, #4285f4)', color: '#fff' }, onClick: loadDevices, disabled: busy }, busy ? '加载中…' : '🔄 刷新')
        ),

        error && h('div', { 
          style: { 
            color: error.includes('ADB 未安装') ? '#f59e0b' : '#ef4444', 
            margin: '8px 0', 
            padding: 12, 
            background: error.includes('ADB 未安装') ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', 
            borderRadius: 4,
            whiteSpace: 'pre-line',
            fontSize: 12,
            lineHeight: 1.5
          } 
        }, error),

        // 连接新设备
        h('div', { style: { ...CARD, background: 'var(--dsh-accent-soft, rgba(66,133,244,.1))' } },
          h('div', { style: { ...LABEL, marginBottom: 8 } }, '➕ 连接新设备'),
          h('div', { style: ROW },
            h('input', { style: { ...INPUT, flex: 1 }, placeholder: 'IP 地址', value: connectIP, onChange: e => setConnectIP(e.target.value) }),
            h('input', { style: { ...INPUT, width: 80 }, placeholder: '端口', value: connectPort, onChange: e => setConnectPort(e.target.value) }),
            h('button', { style: { ...BTN, background: '#22c55e', color: '#fff' }, onClick: handleConnect, disabled: busy || !connectIP }, '连接')
          ),
          isPairMode && h('div', { style: { ...ROW, marginTop: 8 } },
            h('input', { style: { ...INPUT, flex: 1 }, placeholder: '配对码 (首次连接需要)', value: pairingCode, onChange: e => setPairingCode(e.target.value) }),
            h('button', { style: { ...BTN, background: '#f59e0b', color: '#000' }, onClick: handleConnect, disabled: busy || !connectIP || !pairingCode }, '配对'),
            h('button', { style: { ...BTN, background: 'transparent', color: 'var(--dsh-text-secondary, #888)' }, onClick: () => { setIsPairMode(false); setPairingCode('') } }, '取消')
          ),
          !isPairMode && h('button', {
            style: { ...BTN, marginTop: 8, fontSize: 11, color: 'var(--dsh-text-secondary, #888)' },
            onClick: () => setIsPairMode(true)
          }, '首次连接？使用配对码'),

          // 历史记录
          history.length > 0 && h('div', { style: { marginTop: 10, borderTop: '1px solid var(--dsh-border, #333)', paddingTop: 8 } },
            h('div', { style: { ...LABEL, marginBottom: 6 } }, '📜 历史记录'),
            history.map(item => 
              h('div', {
                key: item.key,
                style: { ...ROW, justifyContent: 'space-between', padding: '4px 0', cursor: 'pointer' },
                onClick: () => handleHistoryClick(item)
              },
                h('span', { style: { fontSize: 12 } }, item.ip + ':' + item.port),
                h('button', {
                  style: { ...BTN, padding: '2px 6px', fontSize: 10, background: 'transparent', color: '#ef4444' },
                  onClick: (e) => deleteHistory(e, item.key)
                }, '✕')
              )
            )
          )
        ),

        // 设备列表
        h('div', { style: { ...LABEL, marginBottom: 8 } }, `已连接设备 (${devices.length})`),
        devices.length === 0
          ? h('div', { style: { color: 'var(--dsh-text-secondary, #888)', padding: 16, textAlign: 'center' } }, '暂无设备')
          : devices.map(d => h(DeviceCard, { key: d.serial, device: d, selected, onSelect: setSelected })),

        // 选中设备的详情
        selected && h('div', { style: { ...CARD, marginTop: 12 } },

          // Tab 切换
          h('div', { style: { display: 'flex', gap: 4, marginBottom: 12, borderBottom: '1px solid var(--dsh-border, #333)', paddingBottom: 8 } },
            ['info', 'perf', 'apps', 'log'].map(tab =>
              h('button', {
                key: tab,
                onClick: () => { setActiveTab(tab); if (tab === 'apps') loadPackages(); if (tab === 'log') loadLogcat() },
                style: {
                  ...BTN,
                  background: activeTab === tab ? 'var(--dsh-accent, #4285f4)' : 'transparent',
                  color: activeTab === tab ? '#fff' : 'inherit'
                }
              }, { info: '📋 信息', perf: '📊 性能', apps: '📦 应用', log: '📝 日志' }[tab])
            )
          ),

          // 信息 Tab
          activeTab === 'info' && h('div', null,
            info && h('table', { style: { width: '100%', borderCollapse: 'collapse' } },
              [
                ['型号', info.basic?.model],
                ['品牌', info.basic?.brand],
                ['Android', info.system?.androidVersion],
                ['安全补丁', info.system?.securityPatch],
                ['SDK', info.system?.sdk],
                ['序列号', info.basic?.serial],
              ].map(([label, value]) => value && h(MetricRow, { key: label, label, value }))
            ),
            h('div', { style: { ...ROW, marginTop: 12, gap: 8 } },
              h('button', { style: { ...BTN, background: '#4285f4', color: '#fff' }, onClick: handleScreenshot }, '📷 截图'),
              h('button', { style: { ...BTN, background: '#f59e0b', color: '#000' }, onClick: () => handleReboot('recovery') }, 'Recovery'),
              h('button', { style: { ...BTN, background: '#ef4444', color: '#fff' }, onClick: () => handleReboot('bootloader') }, 'Bootloader'),
            )
          ),

          // 性能 Tab
          activeTab === 'perf' && h('div', null,
            h('table', { style: { width: '100%', borderCollapse: 'collapse' } },
              mem && h(MetricRow, { label: '内存', value: `${mem.totalGB || '-'} / 使用率 ${mem.usagePercent}%` }),
              battery && h(MetricRow, { label: '电池', value: `${battery.level}% ${battery.temperature}°C` }),
              info?.hardware?.cpu && h(MetricRow, { label: 'CPU', value: `${info.hardware.cpu.cores} 核` }),
              info?.hardware?.storage && h(MetricRow, { label: '存储', value: `${info.hardware.storage.free}GB 可用 / ${info.hardware.storage.total}GB` }),
            ),
            h('button', {
              style: { ...BTN, marginTop: 12, background: 'var(--dsh-accent, #4285f4)', color: '#fff' },
              onClick: () => runtime.perfSnapshot(selected.serial).then(data => { setMem(data.memory); setBattery(data.battery) }).catch(() => {})
            }, '🔄 刷新性能')
          ),

          // 应用 Tab
          activeTab === 'apps' && h('div', null,
            h('input', {
              style: { ...INPUT, width: '100%', marginBottom: 12 },
              placeholder: '搜索应用…',
              value: pkgSearch,
              onChange: e => setPkgSearch(e.target.value)
            }),
            h('div', { style: { maxHeight: 300, overflowY: 'auto', fontFamily: 'monospace', fontSize: 12 } },
              filteredPackages.map(pkg => h('div', {
                key: pkg,
                style: { padding: '4px 8px', borderBottom: '1px solid var(--dsh-border, #333)', cursor: 'pointer' },
                onClick: () => {
                  if (confirm(`启动 ${pkg}?`)) {
                    runtime.launch(pkg, selected.serial).catch(() => {})
                  }
                }
              }, pkg))
            ),
            h('div', { style: { ...LABEL, marginTop: 8 } }, `共 ${packages.length} 个应用${pkgSearch ? ` (显示 ${filteredPackages.length} 个)` : ''}`)
          ),

          // 日志 Tab
          activeTab === 'log' && h('div', null,
            h('div', { style: { ...ROW, marginBottom: 8, gap: 8 } },
              h('select', { style: INPUT, value: logFilter.level, onChange: e => setLogFilter(f => ({ ...f, level: e.target.value })) },
                ['V', 'D', 'I', 'W', 'E', 'F'].map(l => h('option', { key: l, value: l }, l))
              ),
              h('input', { style: { ...INPUT, width: 60 }, type: 'number', value: logFilter.lines, onChange: e => setLogFilter(f => ({ ...f, lines: parseInt(e.target.value) || 50 })) }),
              h('span', { style: LABEL }, '行'),
              h('button', { style: { ...BTN, background: '#4285f4', color: '#fff' }, onClick: loadLogcat }, '🔄 刷新'),
              h('button', { style: { ...BTN, background: '#22c55e', color: '#fff' }, onClick: () => runtime.logcat({ ...logFilter, lines: 500 }, selected.serial).then(d => setLogText(d.log || '')).catch(() => {}) }, '📥 导出')
            ),
            h('pre', {
              style: { maxHeight: 400, overflowY: 'auto', fontFamily: 'monospace', fontSize: 11, background: 'var(--dsh-bg-secondary, #1a1a1a)', padding: 8, borderRadius: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }
            }, logText || '（暂无日志）')
          )
        )
      )
    }

    // 应用到 DSH
    function apply(ctx) {
      const slots = ctx.get('slots')
      const connection = ctx.get('connection')
      if (slots === undefined || connection === undefined || connection.rpc === undefined) return

      const runtime = createRuntime(connection.rpc)

      slots.inject('conversation.view', () => slots.register(
        { name: 'conversation.view', id: 'adb-ultimate', order: 25, label: '📱 设备' },
        (props) => h(DeviceView, { ...props, runtime })
      ))
    }

    module.exports = { apply }
    return module.exports
  },
})
