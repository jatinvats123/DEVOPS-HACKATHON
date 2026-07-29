import { Component } from 'react';
import { RiErrorWarningLine, RiRefreshLine } from '@remixicon/react';

/**
 * Error boundary.
 *
 * React unmounts the entire tree when a render throws. Without a boundary, one
 * bad value — a null monitor, a chart handed a malformed series — replaces the
 * whole application with a blank white page and an error only visible in the
 * devtools console. For a status dashboard that is the worst possible failure:
 * the operator concludes the *monitoring* is down and starts debugging the
 * wrong system.
 *
 * Must be a class: there is still no hook equivalent of componentDidCatch.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
    this.props.onError?.(error, info);
  }

  handleRetry = () => {
    // Clearing the error re-renders the subtree. Enough for a transient failure
    // (a bad fetch result); a genuinely broken component throws again and the
    // boundary catches it again rather than looping silently.
    this.setState({ error: null });
    this.props.onRetry?.();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(error, this.handleRetry);
    }

    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center gap-4 p-8 sm:p-12 text-center"
      >
        <RiErrorWarningLine
          className="w-10 h-10 text-[#a33a2a]"
          aria-hidden="true"
        />
        <div>
          <h2 className="luxury-heading text-xl mb-2">
            {this.props.title || 'Something went wrong'}
          </h2>
          <p className="text-sm text-[#5a5750] max-w-md">
            {this.props.description ||
              'This section failed to render. The rest of the dashboard is unaffected.'}
          </p>
        </div>

        {/* The message is available but not shouted: useful in a bug report,
            not something to put in front of a user as the headline. */}
        <details className="text-left max-w-md w-full">
          <summary className="cursor-pointer text-xs text-[#5a5750] hover:text-[#141413]">
            Technical details
          </summary>
          <pre className="mt-2 text-[11px] bg-[#faf9f5] border border-[#e6dfd8] rounded-lg p-3 overflow-x-auto">
            {error.message || String(error)}
          </pre>
        </details>

        <button
          type="button"
          onClick={this.handleRetry}
          className="luxury-button-primary inline-flex items-center gap-2 px-6 py-2 text-sm"
        >
          <RiRefreshLine className="w-4 h-4" aria-hidden="true" />
          Try again
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
