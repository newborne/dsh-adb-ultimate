/**
 * dsh-adb-ultimate - Professional ADB Device Manager Web UI
 * 
 * Features:
 * - Real-time screen monitoring with play/pause
 * - Comprehensive performance dashboard (auto-refresh every 2s)
 * - Advanced app management with search, sort, details
 * - Color-coded logcat viewer with filters
 * - Complete device information
 */

window.__ModuleLoader__.load({
  id: 'dsh-adb-ultimate',
  factory: (require) => {
    'use strict'
    const module = { exports: {} }

    const React = require('react')
    const CHANNEL = '/dsh-adb-ultimate'

    // ============================================================
    // CONSTANTS & STYLES
    // ============================================================
    
    const COLORS = {
      // Dark theme palette
      bg: 'var(--dsh-bg, #1a1a2e)',
      bgSecondary: 'var(--dsh-bg-secondary, #16213e)',
      bgTertiary: 'var(--dsh-bg-tertiary, #0f3460)',
      accent: 'var(--dsh-accent, #4285f4)',
      accentSoft: 'var(--dsh-accent-soft, rgba(66,133,244,0.15))',
      text: 'var(--dsh-text, #e4e4e7)',
      textSecondary: 'var(--dsh-text-secondary, #a1a1aa)',
      border: 'var(--dsh-border, #2a2a3e)',
      
      // Status colors
      success: '#22c55e',
      successBg: 'rgba(34,197,94,0.15)',
      warning: '#f59e0b',
      warningBg: 'rgba(245,158,11,0.15)',
      error: '#ef4444',
      errorBg: 'rgba(239,68,68,0.15)',
      info: '#3b82f6',
      infoBg: 'rgba(59,130,246,0.15)',
      
      // Log level colors
      logVerbose: '#9ca3af',
      logDebug: '#60a5fa',
      logInfo: '#22c55e',
      logWarn: '#f59e0b',
      logError: '#ef4444',
      logFatal: '#dc2626',
    }

    // Style helpers
    const h = React.createElement
    
    const styles = {
      container: {
        padding: 16,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontSize: 13,
        color: COLORS.text,
        background: COLORS.bg,
        minHeight: '100%',
        boxSizing: 'border-box',
      },
      header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 16,
        borderBottom: `1px solid ${COLORS.border}`,
      },
      title: {
        fontSize: 18,
        fontWeight: 700,
        color: COLORS.text,
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      },
      card: {
        background: COLORS.bgSecondary,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
      },
      cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
      },
      cardTitle: {
        fontSize: 14,
        fontWeight: 600,
        color: COLORS.text,
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      },
      label: {
        fontSize: 11,
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        fontWeight: 500,
      },
      grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 16,
        marginBottom: 16,
      },
      grid2: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 12,
      },
      row: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      },
      btn: {
        padding: '8px 16px',
        borderRadius: 8,
        border: 'none',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 500,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        transition: 'all 0.2s',
      },
      btnPrimary: {
        background: COLORS.accent,
        color: '#fff',
      },
      btnSuccess: {
        background: COLORS.success,
        color: '#fff',
      },
      btnDanger: {
        background: COLORS.error,
        color: '#fff',
      },
      btnWarning: {
        background: COLORS.warning,
        color: '#000',
      },
      btnGhost: {
        background: 'transparent',
        color: COLORS.textSecondary,
        border: `1px solid ${COLORS.border}`,
      },
      btnSmall: {
        padding: '4px 10px',
        fontSize: 11,
        borderRadius: 6,
      },
      input: {
        padding: '8px 12px',
        borderRadius: 8,
        border: `1px solid ${COLORS.border}`,
        background: COLORS.bg,
        color: COLORS.text,
        fontSize: 13,
        outline: 'none',
        transition: 'border-color 0.2s',
      },
      select: {
        padding: '8px 12px',
        borderRadius: 8,
        border: `1px solid ${COLORS.border}`,
        background: COLORS.bg,
        color: COLORS.text,
        fontSize: 13,
        outline: 'none',
        cursor: 'pointer',
      },
      badge: {
        padding: '2px 8px',
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 500,
      },
      divider: {
        height: 1,
        background: COLORS.border,
        margin: '16px 0',
      },
      mono: {
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
        fontSize: 12,
      },
      scrollable: {
        maxHeight: 400,
        overflowY: 'auto',
      },
    }

    // ============================================================
    // UTILITY FUNCTIONS
    // ============================================================
    
    function formatBytes(kb, decimals = 1) {
      if (kb === 0) return '0 KB'
      const k = 1024
      const sizes = ['KB', 'MB', 'GB', 'TB']
      const i = Math.floor(Math.log(kb * 1024) / Math.log(k))
      return parseFloat((kb / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i]
    }

    function formatNumber(num) {
      return num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') || '0'
    }

    function getStatusColor(value, thresholds = { warning: 60, error: 85 }) {
      if (value >= thresholds.error) return COLORS.error
      if (value >= thresholds.warning) return COLORS.warning
      return COLORS.success
    }

    function getBatteryIcon(level, charging) {
      if (charging) return '🔌'
      if (level > 80) return '🔋'
      if (level > 60) return '🔋'
      if (level > 40) return '🔋'
      if (level > 20) return '🪫'
      return '⚠️'
    }

    // ============================================================
    // UI COMPONENTS
    // ============================================================

    // Progress Bar Component
    function ProgressBar({ value, max = 100, color, height = 8, showLabel = true }) {
      const percent = Math.min(100, Math.max(0, (value / max) * 100))
      const barColor = color || getStatusColor(percent)
      
      return h('div', { style: { marginTop: 8 } },
        showLabel && h('div', { style: { ...styles.row, justifyContent: 'space-between', marginBottom: 4 } },
          h('span', { style: { ...styles.label, color: COLORS.textSecondary } }, 'Usage'),
          h('span', { style: { fontSize: 12, fontWeight: 600, color: barColor } }, `${Math.round(percent)}%`)
        ),
        h('div', { 
          style: { 
            height, 
            background: COLORS.bg, 
            borderRadius: height / 2, 
            overflow: 'hidden' 
          } 
        },
          h('div', { 
            style: { 
              width: `${percent}%`, 
              height: '100%', 
              background: barColor, 
              borderRadius: height / 2, 
              transition: 'width 0.5s ease-out' 
            } 
          })
        )
      )
    }

    // Metric Card Component
    function MetricCard({ icon, title, value, subValue, color, children }) {
      return h('div', { style: { ...styles.card } },
        h('div', { style: styles.cardHeader },
          h('span', { style: { fontSize: 16 } }, icon),
          h('span', { style: { ...styles.label, marginLeft: 8 } }, title)
        ),
        h('div', { style: { fontSize: 24, fontWeight: 700, color: color || COLORS.text, margin: '8px 0' } }, value),
        subValue && h('div', { style: { fontSize: 11, color: COLORS.textSecondary } }, subValue),
        children
      )
    }

    // Info Row Component
    function InfoRow({ label, value, mono = false, copyable = false }) {
      return h('div', { 
        style: { 
          ...styles.row, 
          justifyContent: 'space-between', 
          padding: '6px 0',
          borderBottom: `1px solid ${COLORS.border}`,
        } 
      },
        h('span', { style: { color: COLORS.textSecondary, fontSize: 12 } }, label),
        h('span', { 
          style: { 
            fontSize: 12, 
            fontWeight: 500, 
            color: COLORS.text,
            fontFamily: mono ? styles.mono.fontFamily : 'inherit',
            maxWidth: '60%',
            textAlign: 'right',
            wordBreak: 'break-all',
          } 
        }, value || 'N/A')
      )
    }

    // Status Badge Component
    function StatusBadge({ text, color, background }) {
      return h('span', {
        style: {
          ...styles.badge,
          background: background || `${color}20`,
          color: color,
        }
      }, text)
    }

    // Tab Button Component
    function TabButton({ active, onClick, icon, label, count }) {
      return h('button', {
        onClick,
        style: {
          ...styles.btn,
          ...styles.btnSmall,
          background: active ? COLORS.accent : 'transparent',
          color: active ? '#fff' : COLORS.textSecondary,
          border: active ? 'none' : `1px solid ${COLORS.border}`,
        }
      }, [
        icon && h('span', { key: 'icon' }, icon),
        h('span', { key: 'label' }, label),
        count !== undefined && h('span', {
          key: 'count',
          style: {
            marginLeft: 4,
            padding: '1px 6px',
            borderRadius: 10,
            fontSize: 10,
            background: active ? 'rgba(255,255,255,0.2)' : COLORS.bg,
          }
        }, count)
      ])
    }

    // Empty State Component
    function EmptyState({ icon, title, description }) {
      return h('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
          textAlign: 'center',
        }
      },
        h('div', { style: { fontSize: 48, marginBottom: 16 } }, icon || '📱'),
        h('div', { style: { fontSize: 16, fontWeight: 600, color: COLORS.text, marginBottom: 8 } }, title || 'No Data'),
        description && h('div', { style: { fontSize: 13, color: COLORS.textSecondary } }, description)
      )
    }

    // Loading Spinner Component
    function Spinner({ size = 24, color = COLORS.accent }) {
      return h('div', {
        style: {
          width: size,
          height: size,
          border: `2px solid ${color}30`,
          borderTopColor: color,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }
      },
        h('style', { type: 'text/css' }, `
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `)
      )
    }

    // ============================================================
    // DEVICE CARD COMPONENT
    // ============================================================
    
    function DeviceCard({ device, selected, onSelect, onDisconnect }) {
      const isOnline = device.state === 'device'
      
      return h('div', {
        onClick: () => onSelect(device),
        style: {
          ...styles.card,
          cursor: 'pointer',
          background: selected?.serial === device.serial ? COLORS.accentSoft : COLORS.bgSecondary,
          border: selected?.serial === device.serial ? `2px solid ${COLORS.accent}` : `1px solid ${COLORS.border}`,
          transition: 'all 0.2s',
        }
      },
        h('div', { style: { ...styles.row, justifyContent: 'space-between' } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
            h('div', {
              style: {
                width: 40,
                height: 40,
                borderRadius: 10,
                background: isOnline ? COLORS.successBg : COLORS.errorBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
              }
            }, isOnline ? '📱' : '📴'),
            h('div', null,
              h('div', { style: { fontWeight: 600, fontSize: 14 } }, device.model || 'Unknown Device'),
              h('div', { style: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 } }, device.serial)
            )
          ),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            StatusBadge({
              text: isOnline ? 'Online' : device.state,
              color: isOnline ? COLORS.success : COLORS.error,
            }),
            h('button', {
              onClick: (e) => { e.stopPropagation(); onDisconnect(device); },
              style: {
                background: COLORS.errorBg,
                border: `1px solid ${COLORS.error}`,
                borderRadius: 6,
                color: COLORS.error,
                cursor: 'pointer',
                padding: '4px 8px',
                fontSize: 12,
                fontWeight: 600,
              },
              title: '断开连接',
            }, '✕')
          )
        ),
        device.product && h('div', { 
          style: { 
            marginTop: 8, 
            paddingTop: 8, 
            borderTop: `1px solid ${COLORS.border}`,
            fontSize: 11,
            color: COLORS.textSecondary,
          } 
        }, `Product: ${device.product}`)
      )
    }

    // ============================================================
    // MAIN DEVICE VIEW COMPONENT
    // ============================================================
    
    function DeviceView(props) {
      const runtime = props.runtime
      
      // State
      const [devices, setDevices] = React.useState([])
      const [selected, setSelected] = React.useState(null)
      const [activeTab, setActiveTab] = React.useState('info')
      const [busy, setBusy] = React.useState(false)
      const [error, setError] = React.useState(null)
      
      // Screen state
      const [screenImage, setScreenImage] = React.useState(null)
      const [screenPlaying, setScreenPlaying] = React.useState(false)
      const [screenInterval, setScreenInterval] = React.useState(null)
      const [screenLoading, setScreenLoading] = React.useState(false)
      const [deviceResolution, setDeviceResolution] = React.useState(null)
      
      // Performance state
      const [perfData, setPerfData] = React.useState(null)
      const [perfInterval, setPerfInterval] = React.useState(null)
      
      // Apps state
      const [packages, setPackages] = React.useState([])
      const [pkgSearch, setPkgSearch] = React.useState('')
      const [pkgSort, setPkgSort] = React.useState('name')
      const [selectedPkg, setSelectedPkg] = React.useState(null)
      const [appDetail, setAppDetail] = React.useState(null)
      const [installing, setInstalling] = React.useState(false)
      const [installProgress, setInstallProgress] = React.useState(0)
      
      // Process state
      const [processes, setProcesses] = React.useState([])
      const [processSearch, setProcessSearch] = React.useState('')
      
      // Logcat state
      const [logText, setLogText] = React.useState('')
      const [logFilter, setLogFilter] = React.useState({ level: 'I', tag: '', lines: 100 })
      const [logAutoRefresh, setLogAutoRefresh] = React.useState(false)
      const [logInterval, setLogInterval] = React.useState(null)
      const [logLevels, setLogLevels] = React.useState({ V: true, D: true, I: true, W: true, E: true })
      
      // Info state
      const [deviceInfo, setDeviceInfo] = React.useState(null)
      
      // Connection history
      const [history, setHistory] = React.useState(() => {
        try { return JSON.parse(localStorage.getItem('dsh-adb-ultimate-history') || '[]') } 
        catch { return [] }
      })
      const [connectIP, setConnectIP] = React.useState('')
      const [connectPort, setConnectPort] = React.useState('5555')
      const [pairingCode, setPairingCode] = React.useState('')
      const [isPairMode, setIsPairMode] = React.useState(false)

      // ============================================================
      // API CALLS
      // ============================================================
      
      const api = {
        listDevices: () => runtime.listDevices(),
        getDeviceInfo: (serial) => runtime.getDeviceInfo(serial),
        screenshotBase64: (serial) => runtime.screenshotBase64(serial),
        enhancedPerf: (serial) => runtime.enhancedPerf(serial),
        listPackages: (serial) => runtime.listPackages(serial),
        processList: (serial) => runtime.processList(serial),
        logcat: (options, serial) => runtime.logcat({ ...options }, serial),
        connect: (host, port) => runtime.connect(host, port),
        disconnect: (host, port) => runtime.disconnect(host, port),
        pair: (host, port, code) => runtime.pair(host, port, code),
        install: (apkPath, serial) => runtime.install(apkPath, serial),
        uninstall: (pkg, serial) => runtime.uninstall(pkg, serial),
        forceStop: (pkg, serial) => runtime.forceStop(pkg, serial),
        getAppInfo: (pkg, serial) => runtime.getAppInfo(pkg, serial),
        getPermissions: (pkg, serial) => runtime.getPermissions(pkg, serial),
        getActivities: (pkg, serial) => runtime.getActivities(pkg, serial),
        getServices: (pkg, serial) => runtime.getServices(pkg, serial),
        reboot: (mode, serial) => runtime.reboot(mode, serial),
        getprop: (prop, serial) => runtime.getprop(prop, serial),
      }

      // ============================================================
      // EFFECTS
      // ============================================================
      
      // Load devices on mount
      React.useEffect(() => {
        loadDevices()
      }, [])
      
      // Clear intervals on unmount
      React.useEffect(() => {
        return () => {
          clearInterval(screenInterval)
          clearInterval(perfInterval)
          clearInterval(logInterval)
        }
      }, [])
      
      // Load data when device selected
      React.useEffect(() => {
        if (!selected) return
        
        setActiveTab('info')
        setScreenImage(null)
        setScreenPlaying(false)
        setPerfData(null)
        setPackages([])
        setProcesses([])
        setLogText('')
        setAppDetail(null)
        setSelectedPkg(null)
        
        clearInterval(screenInterval)
        clearInterval(perfInterval)
        clearInterval(logInterval)
        
        loadDeviceInfo()
        loadEnhancedPerf()
        loadPackages()
      }, [selected])
      
      // Tab-specific effects
      React.useEffect(() => {
        if (!selected) return
        
        if (activeTab === 'perf') {
          startPerfRefresh()
        } else {
          clearInterval(perfInterval)
          setPerfInterval(null)
        }
        
        if (activeTab === 'log') {
          loadLogcat()
        }
        
        if (activeTab === 'screen') {
          loadResolution()
        }
      }, [activeTab, selected])
      
      // ============================================================
      // DATA LOADING FUNCTIONS
      // ============================================================
      
      const loadDevices = async () => {
        setBusy(true)
        setError(null)
        try {
          const data = await api.listDevices()
          setDevices(data.devices || [])
        } catch (e) {
          setError(e.message || String(e))
        } finally {
          setBusy(false)
        }
      }
      
      const loadDeviceInfo = async () => {
        if (!selected) return
        try {
          const [info, wmSize] = await Promise.all([
            api.getDeviceInfo(selected.serial),
            api.getprop('ro.build.version.release', selected.serial).catch(() => ({ value: '' })),
          ])
          
          // Get more info
          const [manufacturer, hardware, kernel, securityPatch, sdk] = await Promise.all([
            api.getprop('ro.product.manufacturer', selected.serial).catch(() => ({ value: '' })),
            api.getprop('ro.hardware', selected.serial).catch(() => ({ value: '' })),
            api.getprop('ro.kernel.version', selected.serial).catch(() => ({ value: '' })),
            api.getprop('ro.build.version.security_patch', selected.serial).catch(() => ({ value: '' })),
            api.getprop('ro.build.version.sdk', selected.serial).catch(() => ({ value: '' })),
          ])
          
          // Try to get resolution
          let resolution = null
          try {
            const res = await runtime.adb_shell
              ? runtime.adb_shell('wm size', selected.serial)
              : Promise.reject()
          } catch {
            resolution = null
          }
          
          setDeviceInfo({
            basic: info.basic || {},
            system: info.system || {},
            manufacturer: manufacturer.value || '',
            hardware: hardware.value || '',
            kernel: kernel.value || '',
            securityPatch: securityPatch.value || '',
            sdk: sdk.value || '',
            resolution: resolution || null,
          })
        } catch (e) {
          console.error('Failed to load device info:', e)
        }
      }
      
      const loadEnhancedPerf = async () => {
        if (!selected) return
        try {
          const data = await api.enhancedPerf(selected.serial)
          setPerfData(data)
        } catch (e) {
          console.error('Failed to load perf data:', e)
        }
      }
      
      const loadPackages = async () => {
        if (!selected) return
        try {
          const data = await api.listPackages(selected.serial)
          setPackages(data.packages || [])
        } catch (e) {
          console.error('Failed to load packages:', e)
        }
      }
      
      const loadProcesses = async () => {
        if (!selected) return
        try {
          const data = await api.processList(selected.serial)
          setProcesses(data.processes || [])
        } catch (e) {
          console.error('Failed to load processes:', e)
        }
      }
      
      const loadLogcat = async () => {
        if (!selected) return
        try {
          const data = await api.logcat({ ...logFilter }, selected.serial)
          setLogText(data.log || '')
        } catch (e) {
          setLogText('Failed to load logs: ' + e.message)
        }
      }
      
      const loadScreenshot = async () => {
        if (!selected) return
        if (screenLoading) return // Skip if already loading
        try {
          setScreenLoading(true)
          // Try new screenCapture RPC first, fallback to screenshotBase64
          let data;
          try {
            data = await api.screenCapture(selected.serial)
          } catch (e) {
            data = await api.screenshotBase64(selected.serial)
          }
          if (data.base64) {
            setScreenImage(`data:image/png;base64,${data.base64}`)
          } else if (data.frame) {
            setScreenImage(`data:image/png;base64,${data.frame}`)
            setDeviceResolution(`${data.width}x${data.height}`)
          }
        } catch (e) {
          console.error('Screenshot failed:', e)
        } finally {
          setScreenLoading(false)
        }
      }
      
      // Handle touch-to-tap on screen image
      const handleScreenTap = async (e) => {
        if (!selected || screenPlaying) return
        const img = e.currentTarget
        const rect = img.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        // Normalize to 0-1
        const normalizedX = x / rect.width
        const normalizedY = y / rect.height
        try {
          await api.tapAt(normalizedX, normalizedY, true, selected.serial)
          // Refresh screen after tap
          setTimeout(loadScreenshot, 300)
        } catch (e) {
          console.error('Tap failed:', e)
        }
      }
      
      const loadResolution = async () => {
        if (!selected) return
        try {
          const result = await api.getprop('ro.build.version.release', selected.serial)
          // Parse wm size from dumpsys
          setDeviceResolution(null)
        } catch (e) {
          // Ignore
        }
      }
      
      const loadAppDetail = async (pkg) => {
        if (!selected || !pkg) return
        try {
          const [info, permissions, activities, services] = await Promise.all([
            api.getAppInfo(pkg, selected.serial),
            api.getPermissions(pkg, selected.serial),
            api.getActivities(pkg, selected.serial),
            api.getServices(pkg, selected.serial),
          ])
          setAppDetail({ info, permissions, activities, services })
        } catch (e) {
          setAppDetail({ error: e.message })
        }
      }
      
      // ============================================================
      // REFRESH HANDLERS
      // ============================================================
      
      const startPerfRefresh = () => {
        loadEnhancedPerf()
        clearInterval(perfInterval)
        const interval = setInterval(loadEnhancedPerf, 2000)
        setPerfInterval(interval)
      }
      
      const toggleScreen = () => {
        if (screenPlaying) {
          clearInterval(screenInterval)
          setScreenInterval(null)
          setScreenPlaying(false)
        } else {
          loadScreenshot()
          const interval = setInterval(loadScreenshot, 1000)
          setScreenInterval(interval)
          setScreenPlaying(true)
        }
      }
      
      const toggleLogAutoRefresh = () => {
        if (logAutoRefresh) {
          clearInterval(logInterval)
          setLogInterval(null)
          setLogAutoRefresh(false)
        } else {
          loadLogcat()
          const interval = setInterval(loadLogcat, 2000)
          setLogInterval(interval)
          setLogAutoRefresh(true)
        }
      }
      
      // ============================================================
      // ACTION HANDLERS
      // ============================================================
      
      const handleConnect = () => {
        if (!connectIP) return
        setBusy(true)
        
        const promise = isPairMode && pairingCode
          ? api.pair(connectIP, parseInt(connectPort) || 5555, pairingCode)
          : api.connect(connectIP, parseInt(connectPort) || 5555)
        
        promise
          .then(async () => {
            addToHistory(connectIP, connectPort)
            await loadDevices()
            // Auto-select first device if none selected
            const data = await api.listDevices()
            const newDevices = data.devices || []
            if (!selected && newDevices.length > 0) {
              setSelected(newDevices[0])
            }
            setConnectIP('')
            setPairingCode('')
            setIsPairMode(false)
          })
          .catch(e => setError(e.message))
          .finally(() => setBusy(false))
      }
      
      const handleDisconnect = async (device) => {
        if (!confirm(`断开 ${device.model || device.serial}？`)) return
        try {
          const [host, port] = device.serial.includes(':') ? device.serial.split(':') : [device.serial, null]
          await api.disconnect(host, port || undefined)
          if (selected?.serial === device.serial) setSelected(null)
          loadDevices()
        } catch (e) {
          alert('断开失败: ' + e.message)
        }
      }
      
      const handleUninstall = async (pkg) => {
        if (!selected || !pkg) return
        if (!confirm(`Uninstall ${pkg}?`)) return
        try {
          await api.uninstall(pkg, selected.serial)
          alert('Uninstalled successfully')
          loadPackages()
          setAppDetail(null)
          setSelectedPkg(null)
        } catch (e) {
          alert('Uninstall failed: ' + e.message)
        }
      }
      
      const handleForceStop = async (pkg) => {
        if (!selected || !pkg) return
        try {
          await api.forceStop(pkg, selected.serial)
          alert('Force stopped')
        } catch (e) {
          alert('Force stop failed: ' + e.message)
        }
      }
      
      const handleInstall = async (apkPath) => {
        if (!selected || !apkPath) return
        setInstalling(true)
        setInstallProgress(0)
        try {
          await api.install(apkPath, selected.serial)
          setInstallProgress(100)
          alert('Installed successfully')
          loadPackages()
        } catch (e) {
          alert('Install failed: ' + e.message)
        } finally {
          setInstalling(false)
        }
      }
      
      const handleReboot = (mode) => {
        if (!selected) return
        if (!confirm(`Reboot to ${mode || 'normal'}?`)) return
        api.reboot(mode || 'normal', selected.serial)
          .then(() => alert('Reboot command sent'))
          .catch(e => alert('Reboot failed: ' + e.message))
      }
      
      const handlePkgClick = (pkg) => {
        setSelectedPkg(pkg)
        loadAppDetail(pkg)
      }
      
      const saveHistory = (newHistory) => {
        setHistory(newHistory)
        localStorage.setItem('dsh-adb-ultimate-history', JSON.stringify(newHistory.slice(0, 10)))
      }
      
      const addToHistory = (ip, port) => {
        const key = `${ip}:${port}`
        const newHistory = history.filter(h => h.key !== key)
        newHistory.unshift({ key, ip, port, time: Date.now() })
        saveHistory(newHistory)
      }
      
      const deleteHistory = (e, key) => {
        e.stopPropagation()
        saveHistory(history.filter(h => h.key !== key))
      }
      
      // ============================================================
      // FILTERING & SORTING
      // ============================================================
      
      const filteredPackages = React.useMemo(() => {
        let result = pkgSearch
          ? packages.filter(p => p.toLowerCase().includes(pkgSearch.toLowerCase()))
          : packages
        
        return result.sort((a, b) => {
          if (pkgSort === 'name') return a.localeCompare(b)
          return 0
        })
      }, [packages, pkgSearch, pkgSort])
      
      const filteredProcesses = React.useMemo(() => {
        return processSearch
          ? processes.filter(p => 
              p.name.toLowerCase().includes(processSearch.toLowerCase()) ||
              p.pid.includes(processSearch) ||
              p.user.toLowerCase().includes(processSearch.toLowerCase())
            )
          : processes
      }, [processes, processSearch])
      
      const filteredLogLines = React.useMemo(() => {
        if (!logText) return []
        return logText.split('\n').filter(line => {
          if (!line.trim()) return false
          
          // Level filter
          const levelMatch = line.match(/^[A-Z]\//)
          if (levelMatch) {
            const level = levelMatch[0][0]
            if (!logLevels[level]) return false
          }
          
          // Tag filter
          if (logFilter.tag && !line.toLowerCase().includes(logFilter.tag.toLowerCase())) {
            return false
          }
          
          return true
        })
      }, [logText, logFilter.tag, logLevels])
      
      // ============================================================
      // RENDER FUNCTIONS
      // ============================================================
      
      const renderTabs = () => {
        const tabs = [
          { id: 'info', label: '信息', icon: '📋' },
          { id: 'screen', label: '屏幕', icon: '🖥️' },
          { id: 'perf', label: '性能', icon: '📊' },
          { id: 'apps', label: '应用', icon: '📦', count: packages.length },
          { id: 'process', label: '进程', icon: '⚙️', count: processes.length },
          { id: 'log', label: '日志', icon: '📝' },
        ]
        
        return h('div', {
          style: {
            display: 'flex',
            gap: 8,
            marginBottom: 16,
            borderBottom: `1px solid ${COLORS.border}`,
            paddingBottom: 12,
            flexWrap: 'wrap',
          }
        },
          tabs.map(tab =>
            h(TabButton, {
              key: tab.id,
              active: activeTab === tab.id,
              onClick: () => {
                setActiveTab(tab.id)
                if (tab.id === 'process') loadProcesses()
              },
              icon: tab.icon,
              label: tab.label,
              count: tab.count,
            })
          )
        )
      }
      
      const renderInfoTab = () => {
        if (!deviceInfo) {
          return h('div', { style: { display: 'flex', justifyContent: 'center', padding: 40 } },
            h(Spinner)
          )
        }
        
        const { basic, system } = deviceInfo
        
        return h('div', null,
          // Basic Info Card
          h('div', { style: styles.card },
            h('div', { style: styles.cardHeader },
              h('span', { style: styles.cardTitle }, '📱 基本信息')
            ),
            h('div', null,
              InfoRow({ label: '型号', value: basic.model }),
              InfoRow({ label: '品牌', value: basic.brand }),
              InfoRow({ label: '制造商', value: deviceInfo.manufacturer }),
              InfoRow({ label: '序列号', value: basic.serial, mono: true }),
            )
          ),
          
          // System Info Card
          h('div', { style: styles.card },
            h('div', { style: styles.cardHeader },
              h('span', { style: styles.cardTitle }, '⚙️ 系统信息')
            ),
            h('div', null,
              InfoRow({ label: 'Android 版本', value: system.androidVersion }),
              InfoRow({ label: 'SDK 级别', value: system.sdk }),
              InfoRow({ label: '安全补丁', value: deviceInfo.securityPatch }),
              InfoRow({ label: '内核版本', value: deviceInfo.kernel, mono: true }),
              InfoRow({ label: '硬件平台', value: deviceInfo.hardware }),
            )
          ),
          
          // Quick Actions
          h('div', { style: styles.card },
            h('div', { style: styles.cardHeader },
              h('span', { style: styles.cardTitle }, '⚡ 快捷操作')
            ),
            h('div', { style: { ...styles.grid2, gap: 8 } },
              h('button', { ...styles.btn, ...styles.btnPrimary, onClick: loadScreenshot }, '📷 截图'),
              h('button', { ...styles.btn, ...styles.btnWarning, onClick: () => handleReboot('recovery') }, '🔄 Recovery'),
              h('button', { ...styles.btn, ...styles.btnDanger, onClick: () => handleReboot('bootloader') }, '📦 Bootloader'),
              h('button', { ...styles.btn, ...styles.btnGhost, onClick: () => handleReboot('normal') }, '🔃 重启'),
            )
          )
        )
      }
      
      const renderScreenTab = () => {
        return h('div', null,
          // Controls
          h('div', { style: { ...styles.card } },
            h('div', { style: { ...styles.row, gap: 12, flexWrap: 'wrap' } },
              h('button', {
                ...styles.btn,
                ...(screenPlaying ? styles.btnDanger : styles.btnSuccess),
                onClick: toggleScreen
              }, screenPlaying ? '⏸️ 暂停' : '▶️ 播放'),
              
              h('button', {
                ...styles.btn,
                ...styles.btnGhost,
                onClick: loadScreenshot,
                disabled: !selected
              }, '🔄 刷新'),
              
              h('span', { 
                style: { 
                  marginLeft: 'auto',
                  fontSize: 12,
                  color: COLORS.textSecondary,
                  alignSelf: 'center'
                } 
              }, screenPlaying ? '实时刷新中 (1s)' : '点击画面触屏')
            ),
            
            deviceResolution && h('div', { 
              style: { 
                marginTop: 8, 
                fontSize: 12, 
                color: COLORS.textSecondary 
              } 
            }, `分辨率: ${deviceResolution}`)
          ),
          
          // Screen Display
          h('div', {
            style: {
              ...styles.card,
              background: '#000',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 400,
              maxHeight: 600,
              overflow: 'hidden',
            }
          },
            screenImage
              ? h('img', {
                  src: screenImage,
                  style: {
                    maxWidth: '100%',
                    maxHeight: 580,
                    objectFit: 'contain',
                    borderRadius: 4,
                    cursor: screenPlaying ? 'default' : 'crosshair',
                  },
                  onClick: handleScreenTap,
                  title: screenPlaying ? '' : '点击画面触屏',
                })
              : h(EmptyState, {
                  icon: '🖥️',
                  title: '无屏幕数据',
                  description: '点击"播放"开始实时监控，或点击"刷新"获取当前屏幕',
                })
          )
        )
      }
      
      const renderPerfTab = () => {
        const { memory, battery, cpu } = perfData || {}
        
        return h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 } },
          // Memory Card - 内存
          h('div', {
            style: {
              ...styles.card,
              background: COLORS.bgSecondary,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              padding: 16,
              textAlign: 'center',
            }
          },
            h('div', { style: { fontSize: 32, marginBottom: 8 } }, '💾'),
            h('div', { style: { fontSize: 24, fontWeight: 700, color: memory ? getStatusColor(memory.usagePercent) : COLORS.text } },
              memory ? `${memory.usagePercent}%` : '—'
            ),
            h('div', { style: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 } }, '内存使用'),
            memory && h('div', { style: { fontSize: 11, color: COLORS.textSecondary, marginTop: 8 } },
              `${memory.usedGB} / ${memory.totalGB} GB`
            )
          ),
          
          // Battery Card - 电池
          h('div', {
            style: {
              ...styles.card,
              background: COLORS.bgSecondary,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              padding: 16,
              textAlign: 'center',
            }
          },
            h('div', { style: { fontSize: 32, marginBottom: 8 } }, '🔋'),
            h('div', { style: { fontSize: 24, fontWeight: 700, color: battery ? getStatusColor(100 - battery.level, { warning: 30, error: 15 }) : COLORS.text } },
              battery ? `${battery.level}%` : '—'
            ),
            h('div', { style: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 } }, '电池电量'),
            battery && h('div', { style: { fontSize: 11, color: COLORS.textSecondary, marginTop: 8 } },
              `温度: ${battery.temperature}°C`
            )
          ),
          
          // CPU Card - 处理器
          h('div', {
            style: {
              ...styles.card,
              background: COLORS.bgSecondary,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              padding: 16,
              textAlign: 'center',
            }
          },
            h('div', { style: { fontSize: 32, marginBottom: 8 } }, '🖥️'),
            h('div', { style: { fontSize: 24, fontWeight: 700, color: COLORS.info } },
              cpu ? `${cpu.cores}核` : '—'
            ),
            h('div', { style: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 } }, 'CPU 核心'),
            cpu?.model && h('div', { style: { fontSize: 10, color: COLORS.textSecondary, marginTop: 8, wordBreak: 'break-all' } },
              cpu.model
            )
          )
        )
      }
      
      const renderAppsTab = () => {
        return h('div', null,
          // Search and Sort Bar
          h('div', { style: { ...styles.card } },
            h('div', { style: { ...styles.row, gap: 8, marginBottom: 12 } },
              h('input', {
                style: { ...styles.input, flex: 1 },
                placeholder: '🔍 搜索应用...',
                value: pkgSearch,
                onChange: e => setPkgSearch(e.target.value),
              }),
              h('select', {
                style: styles.select,
                value: pkgSort,
                onChange: e => setPkgSort(e.target.value),
              },
                h('option', { value: 'name' }, '按名称排序'),
                h('option', { value: 'size' }, '按大小排序'),
                h('option', { value: 'date' }, '按安装日期'),
              )
            ),
            
            // Package List
            h('div', {
              style: {
                ...styles.scrollable,
                maxHeight: selectedPkg ? 200 : 400,
                background: COLORS.bg,
                borderRadius: 8,
                border: `1px solid ${COLORS.border}`,
              }
            },
              filteredPackages.length === 0
                ? h(EmptyState, { icon: '📦', title: '无应用', description: pkgSearch ? '未找到匹配的应用' : '暂无已安装应用' })
                : filteredPackages.slice(0, 200).map(pkg =>
                    h('div', {
                      key: pkg,
                      onClick: () => handlePkgClick(pkg),
                      style: {
                        padding: '8px 12px',
                        borderBottom: `1px solid ${COLORS.border}`,
                        cursor: 'pointer',
                        background: selectedPkg === pkg ? COLORS.accentSoft : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'background 0.1s',
                      },
                      onMouseEnter: e => selectedPkg !== pkg && (e.target.style.background = COLORS.bgSecondary),
                      onMouseLeave: e => selectedPkg !== pkg && (e.target.style.background = 'transparent'),
                    },
                      h('span', { style: { fontSize: 16 } }, '📦'),
                      h('span', { 
                        style: { 
                          fontSize: 12, 
                          fontFamily: styles.mono.fontFamily,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        } 
                      }, pkg)
                    )
                  )
            ),
            
            h('div', { 
              style: { 
                marginTop: 8, 
                fontSize: 11, 
                color: COLORS.textSecondary 
              } 
            }, `共 ${packages.length} 个应用${pkgSearch ? ` (显示 ${filteredPackages.length} 个)` : ''}`)
          ),
          
          // App Detail Panel
          selectedPkg && appDetail && h('div', { style: styles.card },
            h('div', { style: styles.cardHeader },
              h('span', { style: styles.cardTitle }, `📦 ${selectedPkg}`),
              h('div', { style: { ...styles.row, gap: 8 } },
                h('button', {
                  ...styles.btn,
                  ...styles.btnDanger,
                  ...styles.btnSmall,
                  onClick: () => handleUninstall(selectedPkg)
                }, '卸载'),
                h('button', {
                  ...styles.btn,
                  ...styles.btnWarning,
                  ...styles.btnSmall,
                  onClick: () => handleForceStop(selectedPkg)
                }, '强制停止'),
                h('button', {
                  ...styles.btn,
                  ...styles.btnGhost,
                  ...styles.btnSmall,
                  onClick: () => setSelectedPkg(null)
                }, '✕')
              )
            ),
            
            // App Info
            appDetail.info && h('div', null,
              InfoRow({ label: '版本名', value: appDetail.info.versionName }),
              InfoRow({ label: '版本码', value: appDetail.info.versionCode }),
              InfoRow({ label: '目标 SDK', value: appDetail.info.targetSdk }),
              InfoRow({ label: '安装位置', value: appDetail.info.installLocation }),
            ),
            
            // Permissions Section
            h('div', { style: { ...styles.divider } }),
            h('div', { style: { ...styles.label, marginBottom: 8 } }, '🔐 权限'),
            h('div', {
              style: {
                maxHeight: 150,
                overflowY: 'auto',
                background: COLORS.bg,
                borderRadius: 8,
                padding: 8,
              }
            },
              appDetail.permissions?.length > 0
                ? appDetail.permissions.map((perm, idx) =>
                    h('div', {
                      key: idx,
                      style: {
                        ...styles.row,
                        padding: '4px 0',
                        gap: 8,
                      }
                    },
                      h('span', { 
                        style: { 
                          fontSize: 14,
                          color: perm.granted ? COLORS.success : COLORS.error,
                        } 
                      }, perm.granted ? '✅' : '❌'),
                      h('span', { 
                        style: { 
                          fontSize: 11, 
                          fontFamily: styles.mono.fontFamily,
                          wordBreak: 'break-all',
                        } 
                      }, perm.name)
                    )
                  )
                : h('div', { style: { color: COLORS.textSecondary, fontSize: 12 } }, '无权限信息')
            ),
            
            // Activities Section
            h('div', { style: { ...styles.divider } }),
            h('div', { style: { ...styles.label, marginBottom: 8 } }, '🎯 Activities'),
            h('div', {
              style: {
                maxHeight: 100,
                overflowY: 'auto',
                background: COLORS.bg,
                borderRadius: 8,
                padding: 8,
              }
            },
              appDetail.activities?.length > 0
                ? appDetail.activities.slice(0, 20).map((act, idx) =>
                    h('div', {
                      key: idx,
                      style: {
                        fontSize: 11,
                        fontFamily: styles.mono.fontFamily,
                        padding: '2px 0',
                        wordBreak: 'break-all',
                      }
                    }, act)
                  )
                : h('div', { style: { color: COLORS.textSecondary, fontSize: 12 } }, '无 Activity 信息')
            ),
            
            // Services Section
            h('div', { style: { ...styles.divider } }),
            h('div', { style: { ...styles.label, marginBottom: 8 } }, '⚙️ Services'),
            h('div', {
              style: {
                maxHeight: 100,
                overflowY: 'auto',
                background: COLORS.bg,
                borderRadius: 8,
                padding: 8,
              }
            },
              appDetail.services?.length > 0
                ? appDetail.services.slice(0, 20).map((svc, idx) =>
                    h('div', {
                      key: idx,
                      style: {
                        fontSize: 11,
                        fontFamily: styles.mono.fontFamily,
                        padding: '2px 0',
                        wordBreak: 'break-all',
                      }
                    }, svc)
                  )
                : h('div', { style: { color: COLORS.textSecondary, fontSize: 12 } }, '无 Service 信息')
            )
          ),
          
          // App Detail Loading
          selectedPkg && !appDetail && h('div', { style: { ...styles.card, textAlign: 'center', padding: 40 } },
            h(Spinner)
          )
        )
      }
      
      const renderProcessTab = () => {
        return h('div', null,
          // Search Bar
          h('div', { style: { ...styles.card } },
            h('div', { style: { ...styles.row, gap: 8 } },
              h('input', {
                style: { ...styles.input, flex: 1 },
                placeholder: '🔍 搜索进程...',
                value: processSearch,
                onChange: e => setProcessSearch(e.target.value),
              }),
              h('button', {
                ...styles.btn,
                ...styles.btnPrimary,
                onClick: loadProcesses,
              }, '🔄 刷新')
            ),
            h('div', { 
              style: { 
                marginTop: 8, 
                fontSize: 11, 
                color: COLORS.textSecondary 
              } 
            }, `共 ${processes.length} 个进程${processSearch ? ` (显示 ${filteredProcesses.length} 个)` : ''}`)
          ),
          
          // Process List
          h('div', {
            style: {
              background: COLORS.bg,
              borderRadius: 8,
              border: `1px solid ${COLORS.border}`,
              fontFamily: styles.mono.fontFamily,
              fontSize: 11,
            }
          },
            // Header
            h('div', {
              style: {
                ...styles.row,
                padding: '8px 12px',
                background: COLORS.bgSecondary,
                borderBottom: `1px solid ${COLORS.border}`,
                fontWeight: 600,
                position: 'sticky',
                top: 0,
                zIndex: 1,
              }
            },
              h('span', { style: { width: 90, color: COLORS.textSecondary } }, 'USER'),
              h('span', { style: { width: 70, color: COLORS.textSecondary } }, 'PID'),
              h('span', { style: { width: 70, color: COLORS.textSecondary } }, 'PPID'),
              h('span', { style: { color: COLORS.textSecondary } }, 'NAME')
            ),
            
            // Process Rows
            h('div', { style: { maxHeight: 400, overflowY: 'auto' } },
              filteredProcesses.length === 0
                ? h(EmptyState, { icon: '⚙️', title: '无进程', description: processSearch ? '未找到匹配的进程' : '暂无进程数据' })
                : filteredProcesses.map((proc, idx) =>
                    h('div', {
                      key: `${proc.pid}-${idx}`,
                      style: {
                        ...styles.row,
                        padding: '6px 12px',
                        borderBottom: `1px solid ${COLORS.border}`,
                        transition: 'background 0.1s',
                      },
                      onMouseEnter: e => e.currentTarget.style.background = COLORS.bgSecondary,
                      onMouseLeave: e => e.currentTarget.style.background = 'transparent',
                    },
                      h('span', { style: { width: 90, color: COLORS.info, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis' } }, proc.user),
                      h('span', { style: { width: 70, color: COLORS.warning, flexShrink: 0 } }, proc.pid),
                      h('span', { style: { width: 70, color: COLORS.textSecondary, flexShrink: 0 } }, proc.ppid || '—'),
                      h('span', { 
                        style: { 
                          color: COLORS.text, 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap',
                          flex: 1,
                        } 
                      }, proc.name)
                    )
                  )
            )
          )
        )
      }
      
      const renderLogTab = () => {
        return h('div', null,
          // Log Controls
          h('div', { style: { ...styles.card } },
            // Level Filters
            h('div', { style: { ...styles.row, gap: 8, marginBottom: 12, flexWrap: 'wrap' } },
              h('span', { style: { ...styles.label, marginRight: 4 } }, '级别:'),
              ['V', 'D', 'I', 'W', 'E'].map(level => {
                const colors = {
                  V: COLORS.logVerbose,
                  D: COLORS.logDebug,
                  I: COLORS.logInfo,
                  W: COLORS.logWarn,
                  E: COLORS.logError,
                }
                return h('button', {
                  key: level,
                  onClick: () => setLogLevels(l => ({ ...l, [level]: !l[level] })),
                  style: {
                    ...styles.btn,
                    ...styles.btnSmall,
                    background: logLevels[level] ? colors[level] + '30' : COLORS.bg,
                    color: logLevels[level] ? colors[level] : COLORS.textSecondary,
                    border: `1px solid ${logLevels[level] ? colors[level] + '50' : COLORS.border}`,
                  }
                }, level)
              }),
            ),
            
            // Tag Filter and Lines
            h('div', { style: { ...styles.row, gap: 8, marginBottom: 12 } },
              h('input', {
                style: { ...styles.input, flex: 1 },
                placeholder: '🏷️ 标签过滤',
                value: logFilter.tag,
                onChange: e => setLogFilter(f => ({ ...f, tag: e.target.value })),
              }),
              h('input', {
                style: { ...styles.input, width: 70 },
                type: 'number',
                placeholder: '行数',
                value: logFilter.lines,
                onChange: e => setLogFilter(f => ({ ...f, lines: parseInt(e.target.value) || 100 })),
              }),
            ),
            
            // Action Buttons
            h('div', { style: { ...styles.row, gap: 8 } },
              h('button', { ...styles.btn, ...styles.btnPrimary, onClick: loadLogcat }, '🔄 刷新'),
              h('button', {
                ...styles.btn,
                ...(logAutoRefresh ? styles.btnSuccess : styles.btnGhost),
                onClick: toggleLogAutoRefresh
              }, logAutoRefresh ? '⏸️ 停止自动' : '▶️ 自动刷新'),
              h('button', { ...styles.btn, ...styles.btnGhost, onClick: () => setLogText('') }, '🗑️ 清空'),
              h('button', { ...styles.btn, ...styles.btnGhost, onClick: () => {
                const blob = new Blob([logText], { type: 'text/plain' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `logcat_${Date.now()}.txt`
                a.click()
              }}, '💾 导出'),
            )
          ),
          
          // Log Content
          h('div', {
            style: {
              background: '#0d1117',
              borderRadius: 8,
              border: `1px solid ${COLORS.border}`,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontSize: 11,
              maxHeight: 500,
              overflowY: 'auto',
            }
          },
            filteredLogLines.length === 0
              ? h('div', { style: { padding: 40, textAlign: 'center', color: COLORS.textSecondary } }, '（暂无日志）')
              : filteredLogLines.map((line, idx) => {
                  let color = COLORS.text
                  let background = 'transparent'
                  
                  const levelMatch = line.match(/^[A-Z]\//)
                  if (levelMatch) {
                    const level = levelMatch[0][0]
                    const levelColors = {
                      V: COLORS.logVerbose,
                      D: COLORS.logDebug,
                      I: COLORS.logInfo,
                      W: COLORS.logWarn,
                      E: COLORS.logError,
                      F: COLORS.logFatal,
                    }
                    color = levelColors[level] || color
                    if (level === 'F' || level === 'E') {
                      background = COLORS.errorBg
                    } else if (level === 'W') {
                      background = COLORS.warningBg
                    }
                  }
                  
                  return h('div', {
                    key: idx,
                    style: {
                      color,
                      background,
                      lineHeight: 1.6,
                      padding: '2px 12px',
                      borderBottom: '1px solid #1a1a2a',
                      wordBreak: 'break-all',
                      whiteSpace: 'pre-wrap',
                    }
                  }, line)
                })
          ),
          
          // Legend
          h('div', {
            style: {
              display: 'flex',
              gap: 16,
              marginTop: 12,
              fontSize: 10,
              flexWrap: 'wrap',
            }
          },
            h('span', { style: { color: COLORS.logVerbose } }, 'V=Verbose'),
            h('span', { style: { color: COLORS.logDebug } }, 'D=Debug'),
            h('span', { style: { color: COLORS.logInfo } }, 'I=Info'),
            h('span', { style: { color: COLORS.logWarn } }, 'W=Warning'),
            h('span', { style: { color: COLORS.logError } }, 'E=Error'),
            h('span', { style: { color: COLORS.logFatal } }, 'F=Fatal'),
          )
        )
      }
      
      // ============================================================
      // MAIN RENDER
      // ============================================================
      
      return h('div', { style: styles.container },
        // Header
        h('div', { style: styles.header },
          h('h2', { style: styles.title }, '📱 ADB Ultimate'),
          h('button', {
            ...styles.btn,
            ...styles.btnPrimary,
            onClick: loadDevices,
            disabled: busy,
          }, busy ? h(Spinner, { size: 16 }) : '🔄 刷新设备')
        ),
        
        // Error Messages
        error && error.includes('ADB未安装') && h('div', { 
          style: { 
            ...styles.card,
            background: `linear-gradient(135deg, ${COLORS.warningBg}, ${COLORS.successBg})`,
            border: `1px solid ${COLORS.warning}30`,
          } 
        },
          h('div', { style: { fontSize: 14, fontWeight: 600, marginBottom: 8, color: COLORS.warning } }, '🔧 ADB 未安装'),
          h('div', { style: { fontSize: 13, marginBottom: 12 } }, '请点击下方按钮复制安装指令，粘贴给 Agent 执行'),
          h('div', { 
            style: { 
              background: 'rgba(0,0,0,0.3)', 
              borderRadius: 8, 
              padding: 12,
              marginBottom: 12
            }
          },
            h('div', { style: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 6 } }, '复制此提示词给 Agent：'),
            h('div', { style: { fontSize: 13, fontFamily: styles.mono.fontFamily, lineHeight: 1.5 } }, 
              '安装最新版的ADB并适配当前平台，测试命令成功调用。'
            ),
            h('button', {
              ...styles.btn,
              ...styles.btnSuccess,
              style: { marginTop: 8 },
              onClick: () => {
                navigator.clipboard.writeText('安装最新版的ADB并适配当前平台，测试命令成功调用。')
                alert('已复制！粘贴给 Agent 执行')
              }
            }, '📋 复制')
          )
        ),
        
        error && !error.includes('ADB未安装') && h('div', { 
          style: { 
            ...styles.card,
            background: COLORS.errorBg,
            border: `1px solid ${COLORS.error}30`,
            color: COLORS.error,
          } 
        }, error),
        
        // Connection Card
        h('div', { style: { ...styles.card, background: COLORS.accentSoft } },
          h('div', { style: { ...styles.label, marginBottom: 12 } }, '➕ 连接新设备'),
          h('div', { style: { ...styles.row, gap: 8 } },
            h('input', {
              style: { ...styles.input, flex: 1 },
              placeholder: 'IP 地址',
              value: connectIP,
              onChange: e => setConnectIP(e.target.value),
              onKeyPress: e => e.key === 'Enter' && handleConnect()
            }),
            h('input', {
              style: { ...styles.input, width: 80 },
              placeholder: '端口',
              value: connectPort,
              onChange: e => setConnectPort(e.target.value),
            }),
            h('button', {
              ...styles.btn,
              ...styles.btnSuccess,
              onClick: handleConnect,
              disabled: busy || !connectIP,
            }, isPairMode ? '🔗 配对' : '🔌 连接')
          ),
          
          isPairMode && h('div', { style: { ...styles.row, gap: 8, marginTop: 8 } },
            h('input', {
              style: { ...styles.input, flex: 1 },
              placeholder: '配对码',
              value: pairingCode,
              onChange: e => setPairingCode(e.target.value),
            }),
            h('button', { ...styles.btn, ...styles.btnGhost, onClick: () => { setIsPairMode(false); setPairingCode('') } }, '取消')
          ),
          
          !isPairMode && h('button', {
            ...styles.btn,
            ...styles.btnGhost,
            style: { marginTop: 8, fontSize: 11 },
            onClick: () => setIsPairMode(true)
          }, '首次连接？使用配对码'),
          
          // History
          history.length > 0 && h('div', { style: { marginTop: 12, paddingTop: 12, borderTop: `1px solid ${COLORS.border}` } },
            h('div', { style: { ...styles.label, marginBottom: 8 } }, '📜 历史记录'),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              history.map(item =>
                h('div', {
                  key: item.key,
                  style: {
                    ...styles.row,
                    gap: 4,
                    padding: '4px 8px',
                    background: COLORS.bg,
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 11,
                  },
                  onClick: async () => {
                    setBusy(true)
                    try {
                      await api.connect(item.ip, parseInt(item.port) || 5555)
                      await loadDevices()
                      const data = await api.listDevices()
                      const newDevices = data.devices || []
                      if (!selected && newDevices.length > 0) {
                        setSelected(newDevices[0])
                      }
                    } catch (e) {
                      alert('连接失败: ' + e.message)
                    } finally {
                      setBusy(false)
                    }
                  }
                },
                  h('span', null, `${item.ip}:${item.port}`),
                  h('button', {
                    style: { 
                      padding: 0, 
                      background: 'none', 
                      border: 'none', 
                      color: COLORS.error,
                      cursor: 'pointer',
                      fontSize: 10,
                    },
                    onClick: (e) => deleteHistory(e, item.key)
                  }, '✕')
                )
              )
            )
          )
        ),
        
        // Device List
        h('div', { style: { ...styles.label, marginBottom: 8 } }, `已连接设备 (${devices.length})`),
        devices.length === 0
          ? h('div', { style: { ...styles.card, textAlign: 'center', padding: 32, color: COLORS.textSecondary } }, '暂无设备')
          : devices.map(d => h(DeviceCard, { key: d.serial, device: d, selected, onSelect: setSelected, onDisconnect: handleDisconnect })),
        
        // Selected Device Panel
        selected && h('div', { style: styles.card },
          h('div', { 
            style: { 
              ...styles.cardHeader, 
              marginBottom: 16,
              paddingBottom: 12,
              borderBottom: `1px solid ${COLORS.border}`,
            } 
          },
            h('span', { style: { fontSize: 16, fontWeight: 600 } }, `📱 ${selected.model || selected.serial}`),
            StatusBadge({ 
              text: '已连接', 
              color: COLORS.success,
              background: COLORS.successBg,
            })
          ),
          
          renderTabs(),
          
          activeTab === 'info' && renderInfoTab(),
          activeTab === 'screen' && renderScreenTab(),
          activeTab === 'perf' && renderPerfTab(),
          activeTab === 'apps' && renderAppsTab(),
          activeTab === 'process' && renderProcessTab(),
          activeTab === 'log' && renderLogTab(),
        )
      )
    }
    
    // ============================================================
    // APPLY TO DSH
    // ============================================================
    
    function apply(ctx) {
      const slots = ctx.get('slots')
      const connection = ctx.get('connection')
      if (slots === undefined || connection === undefined || connection.rpc === undefined) return
      
      // Create runtime
      function unwrap(value) {
        if (typeof value === 'object' && value !== null && 'ok' in value) {
          if (value.ok === true && 'value' in value) return value.value
          if (value.ok === false && value.error) {
            throw new Error(value.error.message ?? 'dsh-adb-ultimate request failed')
          }
        }
        return value
      }
      
      const runtime = {
        listDevices: () => connection.rpc.call(CHANNEL, 'listDevices', {}).then(unwrap),
        connect: (host, port) => connection.rpc.call(CHANNEL, 'connect', { host, port }).then(unwrap),
        disconnect: (host, port) => connection.rpc.call(CHANNEL, 'disconnect', { host, port }).then(unwrap),
        pair: (host, port, code) => connection.rpc.call(CHANNEL, 'pair', { host, port, pairingCode: code }).then(unwrap),
        getDeviceInfo: (serial) => connection.rpc.call(CHANNEL, 'getDeviceInfo', { serial }).then(unwrap),
        screenshot: (savePath, serial) => connection.rpc.call(CHANNEL, 'screenshot', { savePath, serial }).then(unwrap),
        screenshotBase64: (serial) => connection.rpc.call(CHANNEL, 'screenshotBase64', { serial }).then(unwrap),
        screenOn: (serial) => connection.rpc.call(CHANNEL, 'screenOn', { serial }).then(unwrap),
        screenOff: (serial) => connection.rpc.call(CHANNEL, 'screenOff', { serial }).then(unwrap),
        inputTap: (x, y, serial) => connection.rpc.call(CHANNEL, 'inputTap', { x, y, serial }).then(unwrap),
        inputSwipe: (x1, y1, x2, y2, duration, serial) => connection.rpc.call(CHANNEL, 'inputSwipe', { x1, y1, x2, y2, duration, serial }).then(unwrap),
        inputText: (text, serial) => connection.rpc.call(CHANNEL, 'inputText', { text, serial }).then(unwrap),
        inputKeyevent: (keyCode, serial) => connection.rpc.call(CHANNEL, 'inputKeyevent', { keyCode, serial }).then(unwrap),
        listPackages: (serial) => connection.rpc.call(CHANNEL, 'listPackages', { serial }).then(unwrap),
        install: (apkPath, serial) => connection.rpc.call(CHANNEL, 'install', { apkPath, serial }).then(unwrap),
        uninstall: (packageName, serial) => connection.rpc.call(CHANNEL, 'uninstall', { packageName, serial }).then(unwrap),
        launch: (packageName, serial) => connection.rpc.call(CHANNEL, 'launch', { packageName, serial }).then(unwrap),
        forceStop: (packageName, serial) => connection.rpc.call(CHANNEL, 'forceStop', { packageName, serial }).then(unwrap),
        meminfo: (serial) => connection.rpc.call(CHANNEL, 'meminfo', { serial }).then(unwrap),
        cpuinfo: (serial) => connection.rpc.call(CHANNEL, 'cpuinfo', { serial }).then(unwrap),
        fps: (serial) => connection.rpc.call(CHANNEL, 'fps', { serial }).then(unwrap),
        battery: (serial) => connection.rpc.call(CHANNEL, 'battery', { serial }).then(unwrap),
        perfSnapshot: (serial) => connection.rpc.call(CHANNEL, 'perfSnapshot', { serial }).then(unwrap),
        enhancedPerf: (serial) => connection.rpc.call(CHANNEL, 'enhancedPerf', { serial }).then(unwrap),
        processList: (serial) => connection.rpc.call(CHANNEL, 'processList', { serial }).then(unwrap),
        logcat: (options, serial) => connection.rpc.call(CHANNEL, 'logcat', { ...options, serial }).then(unwrap),
        bugreport: (savePath, serial) => connection.rpc.call(CHANNEL, 'bugreport', { savePath, serial }).then(unwrap),
        dumpsys: (service, serial) => connection.rpc.call(CHANNEL, 'dumpsys', { service, serial }).then(unwrap),
        getprop: (property, serial) => connection.rpc.call(CHANNEL, 'getprop', { property, serial }).then(unwrap),
        reboot: (mode, serial) => connection.rpc.call(CHANNEL, 'reboot', { mode, serial }).then(unwrap),
        getAppInfo: (packageName, serial) => connection.rpc.call(CHANNEL, 'getAppInfo', { packageName, serial }).then(unwrap),
        getPermissions: (packageName, serial) => connection.rpc.call(CHANNEL, 'getPermissions', { packageName, serial }).then(unwrap),
        getActivities: (packageName, serial) => connection.rpc.call(CHANNEL, 'getActivities', { packageName, serial }).then(unwrap),
        getServices: (packageName, serial) => connection.rpc.call(CHANNEL, 'getServices', { packageName, serial }).then(unwrap),
        // v1.2: UI Tree & Semantic Control
        getUiTree: (serial, compact) => connection.rpc.call(CHANNEL, 'getUiTree', { serial, compact }).then(unwrap),
        tapElement: (selector, serial) => connection.rpc.call(CHANNEL, 'tapElement', { selector, serial }).then(unwrap),
        waitForElement: (selector, timeout, serial) => connection.rpc.call(CHANNEL, 'waitForElement', { selector, timeout, serial }).then(unwrap),
        scrollToElement: (selector, maxSwipes, serial) => connection.rpc.call(CHANNEL, 'scrollToElement', { selector, maxSwipes, serial }).then(unwrap),
        longPress: (x, y, duration, serial) => connection.rpc.call(CHANNEL, 'longPress', { x, y, duration, serial }).then(unwrap),
        launchApp: (package, activity, serial) => connection.rpc.call(CHANNEL, 'launchApp', { package, activity, serial }).then(unwrap),
        // v2.0: Streaming
        screenCapture: (serial) => connection.rpc.call(CHANNEL, 'screenCapture', { serial }).then(unwrap),
        screenSize: (serial) => connection.rpc.call(CHANNEL, 'screenSize', { serial }).then(unwrap),
        tapAt: (x, y, normalized, serial) => connection.rpc.call(CHANNEL, 'tapAt', { x, y, normalized, serial }).then(unwrap),
        swipeAt: (x1, y1, x2, y2, duration, normalized, serial) => connection.rpc.call(CHANNEL, 'swipeAt', { x1, y1, x2, y2, duration, normalized, serial }).then(unwrap),
      }
      
      slots.inject('conversation.view', () => slots.register(
        { name: 'conversation.view', id: 'adb-ultimate', order: 25, label: '📱 设备' },
        (props) => h(DeviceView, { ...props, runtime })
      ))
    }
    
    module.exports = { apply }
    return module.exports
  },
})
