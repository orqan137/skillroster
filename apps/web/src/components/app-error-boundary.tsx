import { Component, type ErrorInfo, type ReactNode } from "react";
import { PageState } from "./page-state";

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("SkillRoster UI render failure", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.failed) return <PageState message="화면 표시 오류" onRetry={() => window.location.reload()} />;
    return this.props.children;
  }
}
