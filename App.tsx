import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Dashboard } from './components/Dashboard';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error inside React tree:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', color: '#f8fafc', background: '#0f172a', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', boxSizing: 'border-box' }}>
          <div style={{ maxWidth: '600px', width: '100%', backgroundColor: '#1e293b', border: '1px solid #334155', padding: '24px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', boxSizing: 'border-box' }}>
            <h1 style={{ color: '#ef4444', fontSize: '20px', fontWeight: 'bold', marginTop: 0, marginBottom: '12px' }}>
              ⚠️ Erro Interno do React
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px' }}>
              Ocorreu um erro inesperado durante a renderização de um componente da interface.
            </p>
            <div style={{ backgroundColor: '#020617', padding: '16px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px', color: '#f8fafc', overflowX: 'auto', whiteSpace: 'pre-wrap', marginBottom: '16px', border: '1px solid #1e293b' }}>
              <strong>{this.state.error?.name}:</strong> {this.state.error?.message}
            </div>
            <details style={{ marginBottom: '16px' }}>
              <summary style={{ color: '#818cf8', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', outline: 'none' }}>Ver Detalhes do Erro</summary>
              <pre style={{ backgroundColor: '#020617', padding: '16px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '10px', color: '#94a3b8', overflowX: 'auto', whiteSpace: 'pre-wrap', marginTop: '8px', border: '1px solid #1e293b' }}>
                {this.state.error?.stack}
              </pre>
            </details>
            <button 
              onClick={() => window.location.reload()} 
              style={{ backgroundColor: '#4f46e5', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'background-color 0.2s' }}
            >
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
}

export default App;