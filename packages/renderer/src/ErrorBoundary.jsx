import { Component } from "react";

/**
 * ErrorBoundary для архетипов рендерера.
 * При ошибке в дочернем дереве — показывает fallback с деталями,
 * не роняя всё приложение. Кнопка «Повторить» сбрасывает state.
 */
export default class ArchetypeErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error(`[ArchetypeErrorBoundary] ${this.props.archetype || "unknown"}:`, error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: 24, margin: 16, borderRadius: 8,
          background: "var(--idf-danger-light, #fef2f2)",
          border: "1px solid var(--idf-danger-text, #fca5a5)",
        }}>
          <div style={{ fontWeight: 600, color: "var(--idf-danger, #dc2626)", marginBottom: 8, fontSize: 14 }}>
            Ошибка рендера{this.props.archetype ? ` (${this.props.archetype})` : ""}
          </div>
          <pre style={{
            fontSize: 11, color: "var(--idf-text, #374151)",
            background: "var(--idf-surface, #fff)", padding: 12,
            borderRadius: 6, overflow: "auto", maxHeight: 200,
            whiteSpace: "pre-wrap", wordBreak: "break-word",
          }}>
            {this.state.error.message}
            {this.state.errorInfo?.componentStack?.slice(0, 500)}
          </pre>
          <button
            onClick={() => this.setState({ error: null, errorInfo: null })}
            style={{
              marginTop: 8, padding: "6px 16px", borderRadius: 6,
              border: "1px solid var(--idf-border, #d1d5db)",
              background: "var(--idf-surface, #fff)",
              color: "var(--idf-text, #374151)",
              fontSize: 12, cursor: "pointer",
            }}
          >
            Повторить
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
