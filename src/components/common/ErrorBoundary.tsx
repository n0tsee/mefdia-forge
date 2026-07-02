import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/// Catches render-time exceptions so a bug shows a readable message instead of
/// a blank window - important in the production build where devtools are off.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Render error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-3 bg-base-950 p-8 text-center">
          <p className="text-lg font-semibold text-danger">Произошла ошибка интерфейса</p>
          <pre className="max-w-xl overflow-auto rounded-lg bg-base-900 p-4 text-left text-xs text-base-300">
            {this.state.error.message}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Попробовать снова
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
