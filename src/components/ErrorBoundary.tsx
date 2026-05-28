import { Component, type ErrorInfo, type ReactNode } from 'react'
import './ErrorBoundary.css'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Logged to console for debugging; never rendered to the DOM so no
    // stack-trace leak to the page surface.
    console.error('Weather render boundary caught error:', error, info.componentStack)
  }

  handleReset = (): void => {
    this.setState({ hasError: false })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="section error-boundary fade-in">
          <div className="error-boundary-icon" aria-hidden="true">!</div>
          <div className="error-boundary-title">Couldn't render weather data</div>
          <div className="error-boundary-msg">
            Something went wrong displaying the latest data.
          </div>
          <button
            type="button"
            className="error-boundary-btn"
            onClick={this.handleReset}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
