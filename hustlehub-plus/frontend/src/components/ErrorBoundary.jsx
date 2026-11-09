import { Component } from 'react';
import { Link } from 'react-router-dom';
import './ErrorBoundary.css';


class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
 
    console.error('Uncaught render error:', error);
    console.error('Component stack:', info?.componentStack);
  }

  handleReset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    
    return (
      <div className="error-boundary-page">
        <div className="error-boundary-card">
          <span className="error-boundary-code">Error</span>
          <h1>Something broke</h1>
          <p className="error-boundary-text">
            An unexpected problem stopped this page from rendering. You
            can try again, or head back to the marketplace.
          </p>

          <div className="error-boundary-actions">
            <button
              type="button"
              className="error-boundary-btn primary"
              onClick={this.handleReset}
            >
              Try again
            </button>
            <Link
              to="/gigs"
              className="error-boundary-btn secondary"
              onClick={this.handleReset}
            >
              Back to marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;