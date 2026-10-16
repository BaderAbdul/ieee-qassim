"use client";
import { Component, Fragment, type ReactNode } from 'react';

/** Layout/session errors need a visible recovery even when the normal app UI cannot mount. */
export default class SessionRecoveryBoundary extends Component<{ children: ReactNode }, { failed: boolean; attempt: number }> {
  state = { failed: false, attempt: 0 };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.error('Session view failed', { name: error.name }); }
  render() {
    if (this.state.failed) return <div role="alert" style={{ minHeight: '100vh', display: 'grid', placeContent: 'center', gap: 20, padding: 24, textAlign: 'center', background: '#f8fafc', color: '#0f172a' }}>
      <h1>تعذر فتح حسابك / Could not open your account</h1>
      <p>أعد المحاولة لإكمال الدخول. / Please retry to finish signing in.</p>
      <button onClick={() => this.setState(state => ({ failed: false, attempt: state.attempt + 1 }))} style={{ padding: '14px 24px', border: 0, borderRadius: 12, background: '#2563eb', color: 'white', cursor: 'pointer' }}>إعادة المحاولة / Retry</button>
    </div>;
    return <Fragment key={this.state.attempt}>{this.props.children}</Fragment>;
  }
}
