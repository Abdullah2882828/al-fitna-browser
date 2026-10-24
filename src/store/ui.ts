export interface ToastMessage {
  id: string;
  text: string;
  type: 'info' | 'success' | 'warn' | 'error';
  duration?: number;
}

export interface UIState {
  toasts: ToastMessage[];
  isLibraryOpen: boolean;
  isSelfTestOpen: boolean;
}

class UIStore {
  private state: UIState = {
    toasts: [],
    isLibraryOpen: false,
    isSelfTestOpen: false
  };
  private listeners: Set<() => void> = new Set();

  getSnapshot = (): UIState => {
    return this.state;
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  showToast(text: string, type: ToastMessage['type'] = 'info', duration = 3000) {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    const toast: ToastMessage = { id, text, type, duration };
    this.state = {
      ...this.state,
      toasts: [...this.state.toasts, toast]
    };
    this.notify();

    setTimeout(() => {
      this.removeToast(id);
    }, duration);
  }

  removeToast(id: string) {
    this.state = {
      ...this.state,
      toasts: this.state.toasts.filter(t => t.id !== id)
    };
    this.notify();
  }

  setLibraryOpen(open: boolean) {
    this.state = { ...this.state, isLibraryOpen: open };
    this.notify();
  }

  setSelfTestOpen(open: boolean) {
    this.state = { ...this.state, isSelfTestOpen: open };
    this.notify();
  }
}

export const uiStore = new UIStore();
