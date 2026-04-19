"use client";

import { Component } from "react";
import ApiErrorSnackbar from "./ApiErrorSnackbar";
import { buildFrontendErrorReport } from "../lib/storage";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorReport: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info.componentStack);
    this.setState({
      errorReport: buildFrontendErrorReport(error, info?.componentStack || ""),
    });
  }

  handleReset() {
    this.setState({ error: null, errorReport: null });
  }

  render() {
    const { error, errorReport } = this.state;
    const { children } = this.props;

    if (!error) {
      return children;
    }

    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "2rem",
          textAlign: "center",
          backgroundColor: "var(--bg, #0F1117)",
          color: "var(--text-primary, #e5e7eb)",
        }}
      >
        <p style={{ fontSize: "1.1rem", fontWeight: 600 }}>Something went wrong</p>
        <p style={{ fontSize: "0.875rem", opacity: 0.6, maxWidth: "36ch" }}>
          {error?.message || "An unexpected frontend error occurred."}
        </p>
        <button
          onClick={() => this.handleReset()}
          style={{
            marginTop: "0.5rem",
            padding: "0.5rem 1.25rem",
            borderRadius: "9999px",
            border: "1px solid var(--surface-border, #374151)",
            backgroundColor: "transparent",
            color: "inherit",
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          Try again
        </button>
        <button
          onClick={() => window.location.assign("/")}
          style={{
            padding: "0.5rem 1.25rem",
            borderRadius: "9999px",
            border: "none",
            backgroundColor: "var(--accent, #6366f1)",
            color: "#fff",
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          Go home
        </button>
        <ApiErrorSnackbar
          error={errorReport}
          defaultOpen
          onClose={() => this.setState({ errorReport: null })}
        />
      </div>
    );
  }
}

export { ErrorBoundary };
export default ErrorBoundary;
