import { Component } from 'react';
import ErrorScreen from './ErrorScreen';

/** Catches render errors below it and shows the SYSTEM ERROR screen instead of a blank page. */
export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Fun Spot crashed:', error, info?.componentStack);
    this.setState({ errorInfo: info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorScreen
          code="ERR_RENDER"
          message={this.state.error?.message || 'Something went wrong.'}
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={() => this.setState({ hasError: false, error: null, errorInfo: null })}
        />
      );
    }
    return this.props.children;
  }
}
