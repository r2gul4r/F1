"use client";

import React, { ReactNode } from "react";

type HudErrorBoundaryProps = {
  children: ReactNode;
};

type HudErrorBoundaryState = {
  hasError: boolean;
};

export class HudErrorBoundary extends React.Component<HudErrorBoundaryProps, HudErrorBoundaryState> {
  state: HudErrorBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError(): HudErrorBoundaryState {
    return {
      hasError: true
    };
  }

  render() {
    if (this.state.hasError) {
      return <div className="hud-fallback muted">HUD 일시 중단</div>;
    }

    return this.props.children;
  }
}
