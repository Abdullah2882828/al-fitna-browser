export type ThemeMode = 'light' | 'dark';
export type WindowSizePreset = 'compact' | 'medium' | 'large';

export interface WindowDimensions {
  width: number;
  height: number;
}

export const WINDOW_PRESETS: Record<WindowSizePreset, WindowDimensions> = {
  compact: { width: 280, height: 420 },
  medium: { width: 320, height: 500 },
  large: { width: 360, height: 620 }
};

export interface SettingsState {
  theme: ThemeMode;
  preset: WindowSizePreset;
  windowSize: WindowDimensions;
  windowPos: { x: number; y: number } | null;
  activeTab: 'browser' | 'clipper' | 'github' | 'uploader' | 'settings';
  fitnaUrlOverride: string;
  pinHash: string;
  isLocked: boolean;
  activityLogs: { id: string; time: number; text: string; type: 'info' | 'success' | 'warn' | 'error' }[];
}

const SETTINGS_KEY = 'al_fitna_settings_v1';

function getDefaultTheme(): ThemeMode {
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function loadInitialSettings(): SettingsState {
  const defaultState: SettingsState = {
    theme: getDefaultTheme(),
    preset: 'medium',
    windowSize: WINDOW_PRESETS.medium,
    windowPos: null,
    activeTab: 'clipper',
    fitnaUrlOverride: '',
    pinHash: '',
    isLocked: false,
    activityLogs: [
      {
        id: 'init',
        time: Date.now(),
        text: 'تم تشغيل تطبيق الفطنة بنجاح',
        type: 'info'
      }
    ]
  };

  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...defaultState,
        ...parsed,
        isLocked: !!parsed.pinHash // lock if PIN is configured
      };
    }
  } catch {
    // fallback
  }

  return defaultState;
}

class SettingsStore {
  private state: SettingsState = loadInitialSettings();
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.applyTheme(this.state.theme);
  }

  getSnapshot = (): SettingsState => {
    return this.state;
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private notify() {
    this.save();
    this.listeners.forEach((cb) => cb());
  }

  private save() {
    try {
      const { isLocked, ...toSave } = this.state;
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(toSave));
    } catch {
      // quota or private mode
    }
  }

  private applyTheme(theme: ThemeMode) {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }

  setTheme(theme: ThemeMode) {
    this.state = { ...this.state, theme };
    this.applyTheme(theme);
    this.notify();
  }

  toggleTheme() {
    this.setTheme(this.state.theme === 'light' ? 'dark' : 'light');
  }

  setPreset(preset: WindowSizePreset) {
    const windowSize = WINDOW_PRESETS[preset];
    this.state = { ...this.state, preset, windowSize };
    this.notify();
  }

  setWindowSize(size: WindowDimensions) {
    this.state = { ...this.state, windowSize: size };
    this.notify();
  }

  setWindowPos(pos: { x: number; y: number } | null) {
    this.state = { ...this.state, windowPos: pos };
    this.notify();
  }

  setActiveTab(tab: SettingsState['activeTab']) {
    this.state = { ...this.state, activeTab: tab };
    this.notify();
  }

  setFitnaUrlOverride(url: string) {
    this.state = { ...this.state, fitnaUrlOverride: url };
    this.notify();
  }

  setPin(pin: string) {
    const pinHash = pin.trim() ? btoa(pin.trim()) : '';
    this.state = { ...this.state, pinHash, isLocked: false };
    this.notify();
  }

  unlock(pin: string): boolean {
    if (!this.state.pinHash) return true;
    if (btoa(pin.trim()) === this.state.pinHash) {
      this.state = { ...this.state, isLocked: false };
      this.notify();
      return true;
    }
    return false;
  }

  lock() {
    if (this.state.pinHash) {
      this.state = { ...this.state, isLocked: true };
      this.notify();
    }
  }

  log(text: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') {
    const newLog = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      time: Date.now(),
      text,
      type
    };
    const logs = [newLog, ...this.state.activityLogs].slice(0, 100);
    this.state = { ...this.state, activityLogs: logs };
    this.notify();
  }

  clearLogs() {
    this.state = { ...this.state, activityLogs: [] };
    this.notify();
  }
}

export const settingsStore = new SettingsStore();
