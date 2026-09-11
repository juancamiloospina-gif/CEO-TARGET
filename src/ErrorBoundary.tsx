import { Component, type ReactNode } from 'react';

// Red de seguridad de ultimo recurso: si CUALQUIER error de render no
// capturado ocurre en cualquier parte del arbol (App o AdminPanel), React
// por defecto desmonta TODO el arbol y no queda nada en pantalla — como el
// fondo base es #0A0A0A (tema oscuro de toda la herramienta), eso se percibe
// como "la pagina se puso negra". Este componente evita ese desmontaje total
// mostrando un mensaje de error real y un boton para reintentar, en vez de
// dejar al prospecto viendo una pantalla vacia sin ninguna pista de que paso.
type State = { error: Error | null };

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Error no capturado:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: '40px 24px',
            textAlign: 'center',
            background: '#0A0A0A',
            color: '#f4f1eb',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <span style={{ color: '#D4AF37', fontSize: 12, letterSpacing: '.2em', fontWeight: 700 }}>
            ALGO SALIO MAL
          </span>
          <h1 style={{ fontSize: 22, margin: 0, maxWidth: 480 }}>
            No pudimos completar esta pantalla. Tu informacion no se perdio.
          </h1>
          <p style={{ color: '#999', fontSize: 13, maxWidth: 480, margin: 0 }}>
            {this.state.error.message || 'Error desconocido.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#D4AF37',
              color: '#171613',
              border: 0,
              padding: '13px 22px',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '.05em',
              cursor: 'pointer',
            }}
          >
            Volver a empezar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
