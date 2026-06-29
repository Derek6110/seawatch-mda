import { Component } from 'react';

// Prevents one panel's render error from blanking the entire console.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('Panel error:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="p-4 text-sm text-red-300">
          <div className="font-semibold mb-1">{this.props.label || 'Panel'} failed to render.</div>
          <div className="text-xs text-slate-400 break-words">{String(this.state.error.message || this.state.error)}</div>
          <button onClick={() => this.setState({ error: null })}
            className="mt-2 text-xs px-2 py-1 rounded bg-navy-700 hover:bg-navy-600 text-white">Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}
