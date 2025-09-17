// Global store for payment success state that persists across component unmounts
class PaymentSuccessStore {
  private listeners: Set<() => void> = new Set();
  private isOpen = false;
  private amount = 0;

  show(amount: number) {
    console.log('[PaymentSuccessStore] SHOWING SUCCESS MODAL - amount:', amount);
    this.isOpen = true;
    this.amount = amount;
    this.notifyListeners();
    
    // Also store in sessionStorage to survive page refreshes
    sessionStorage.setItem('payment_success_active', JSON.stringify({ isOpen: true, amount }));
  }

  hide() {
    console.log('[PaymentSuccessStore] Hiding success modal');
    this.isOpen = false;
    this.amount = 0;
    this.notifyListeners();
    sessionStorage.removeItem('payment_success_active');
  }

  getState() {
    // Check sessionStorage first
    const stored = sessionStorage.getItem('payment_success_active');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.isOpen) {
          this.isOpen = true;
          this.amount = data.amount;
        }
      } catch {}
    }
    return { isOpen: this.isOpen, amount: this.amount };
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }
}

export const paymentSuccessStore = new PaymentSuccessStore();

// Make it globally available for debugging
(window as any).__PAYMENT_SUCCESS_STORE = paymentSuccessStore;
