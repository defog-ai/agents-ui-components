import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      errorInfo: null,
      error: null,
      maybeOldAnalysis: props.maybeOldAnalysis,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    console.log(error);
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    // logErrorToMyService(error, errorInfo);
    console.log(error, errorInfo);
    this.setState({ hasError: true, errorInfo, error });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="error-boundary-ctr dark:bg-gray-800 dark:text-gray-300">
          {this.props.maybeOldAnalysis ? (
            <p className="text-rose-500 dark:text-rose-400">
              You might need to re run this analysis for the latest version of
              the UI.
            </p>
          ) : (
            <p className="dark:text-gray-300">{this.props.customErrorMessage || "Something went wrong."}</p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
