export type EngineType = 'DIRECT' | 'RELAY' | 'CUSTOM' | 'EXTERNAL' | 'NATIVE';

export interface RelayConfig {
  url: string;
  key: string;
  status: 'unknown' | 'ok' | 'fail';
  lastChecked?: number;
}

export interface CustomConfig {
  template: string; // e.g. https://myproxy.com/?url={url}
}

export interface EnginesState {
  relay: RelayConfig;
  custom: CustomConfig;
  enabledEngines: Record<EngineType, boolean>;
  siteOverrides: Record<string, EngineType>;
}

const ENGINES_STORAGE_KEY = 'al_fitna_engines_v1';

// Known domains that send X-Frame-Options: DENY / CSP frame-ancestors 'none'
export const KNOWN_BLOCKED_DOMAINS = [
  'chatgpt.com',
  'openai.com',
  'deepseek.com',
  'claude.ai',
  'anthropic.com',
  'gemini.google.com',
  'google.com',
  'github.com',
  'kimi.moonshot.cn',
  'qwenlm.ai',
  'grok.com',
  'x.com',
  'twitter.com'
];

function loadEnginesState(): EnginesState {
  const defaultState: EnginesState = {
    relay: {
      url: '',
      key: '',
      status: 'unknown'
    },
    custom: {
      template: ''
    },
    enabledEngines: {
      DIRECT: true,
      RELAY: false,
      CUSTOM: false,
      EXTERNAL: true,
      NATIVE: false
    },
    siteOverrides: {}
  };

  try {
    const raw = localStorage.getItem(ENGINES_STORAGE_KEY);
    if (raw) {
      return { ...defaultState, ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }

  return defaultState;
}

class EnginesStore {
  private state: EnginesState = loadEnginesState();
  private listeners: Set<() => void> = new Set();

  getSnapshot = (): EnginesState => {
    return this.state;
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private notify() {
    try {
      localStorage.setItem(ENGINES_STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // ignore
    }
    this.listeners.forEach((cb) => cb());
  }

  setRelayConfig(config: Partial<RelayConfig>) {
    this.state = {
      ...this.state,
      relay: { ...this.state.relay, ...config }
    };
    this.notify();
  }

  setCustomTemplate(template: string) {
    this.state = {
      ...this.state,
      custom: { ...this.state.custom, template }
    };
    this.notify();
  }

  toggleEngine(engine: EngineType, enabled: boolean) {
    this.state = {
      ...this.state,
      enabledEngines: { ...this.state.enabledEngines, [engine]: enabled }
    };
    this.notify();
  }

  setSiteOverride(domain: string, engine: EngineType) {
    this.state = {
      ...this.state,
      siteOverrides: { ...this.state.siteOverrides, [domain]: engine }
    };
    this.notify();
  }

  async checkRelayHealth(): Promise<boolean> {
    const { url, key } = this.state.relay;
    if (!url) {
      this.setRelayConfig({ status: 'fail', lastChecked: Date.now() });
      return false;
    }

    try {
      const trimmedUrl = url.replace(/\/+$/, '');
      const testUrl = `${trimmedUrl}/?k=${encodeURIComponent(key)}`;
      const resp = await fetch(testUrl, { method: 'GET', mode: 'cors' });
      const text = await resp.text();
      const isOk = resp.ok && text.includes('Al-Fitna Relay OK');
      this.setRelayConfig({ status: isOk ? 'ok' : 'fail', lastChecked: Date.now() });
      return isOk;
    } catch {
      this.setRelayConfig({ status: 'fail', lastChecked: Date.now() });
      return false;
    }
  }

  resolveEngineForUrl(targetUrl: string): EngineType {
    try {
      const hostname = new URL(targetUrl).hostname.toLowerCase();
      // 1. Check site specific override
      for (const [domain, engine] of Object.entries(this.state.siteOverrides)) {
        if (hostname.includes(domain)) {
          if (this.state.enabledEngines[engine]) {
            return engine;
          }
        }
      }

      // 2. Check if known blocked domain
      const isBlocked = KNOWN_BLOCKED_DOMAINS.some(d => hostname.includes(d));
      if (isBlocked) {
        if (this.state.enabledEngines.RELAY && this.state.relay.status === 'ok') return 'RELAY';
        if (this.state.enabledEngines.CUSTOM && this.state.custom.template) return 'CUSTOM';
        return 'EXTERNAL';
      }

      // 3. Fallback chain: DIRECT -> RELAY -> CUSTOM -> EXTERNAL
      if (this.state.enabledEngines.DIRECT) return 'DIRECT';
      if (this.state.enabledEngines.RELAY && this.state.relay.status === 'ok') return 'RELAY';
      if (this.state.enabledEngines.CUSTOM && this.state.custom.template) return 'CUSTOM';
      return 'EXTERNAL';
    } catch {
      return 'EXTERNAL';
    }
  }
}

export const enginesStore = new EnginesStore();
