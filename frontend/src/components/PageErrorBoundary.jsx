import React from 'react';

export default class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    // Keep logging local to aid debugging while preventing blank page crashes.
    // eslint-disable-next-line no-console
    console.error('Dashboard render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="auth-page">
          <section className="card form-card">
            <h2>Something went wrong</h2>
            <p className="error">This page failed to render. Please refresh and try again.</p>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
