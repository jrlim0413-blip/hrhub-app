import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[HRHub ErrorBoundary] Uncaught render error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      localStorage.removeItem("hrhub_pwa_supervisor");
    } catch { }
    window.location.href = window.location.origin + window.location.pathname;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-lg shadow-rose-950/50">
            ⚠️
          </div>
          <h2 className="text-lg font-black tracking-tight text-white mb-2">
            HRHub Portal Notice
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
            Nagkaroon ng pansamantalang error sa pag-load ng portal. I-click ang reload upang i-refresh ang iyong session.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            <button
              onClick={this.handleReload}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl transition shadow-md cursor-pointer"
            >
              🔄 Refresh Portal
            </button>
            <button
              onClick={this.handleReset}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-bold text-xs rounded-xl transition border border-slate-700 cursor-pointer"
            >
              🏠 Go to Main Portal
            </button>
          </div>
          {this.state.error?.message && (
            <p className="mt-6 text-[10px] text-slate-600 font-mono max-w-xs truncate">
              {this.state.error.message}
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

