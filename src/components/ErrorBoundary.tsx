import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle size={32} className="text-red-600" />
            </div>
            <h1 className="mb-2 text-xl font-bold text-gray-900">Algo salió mal</h1>
            <p className="mb-6 text-sm text-gray-600">
              Se produjo un error inesperado. Intenta recargar la página.
            </p>
            {this.state.error && (
              <div className="mb-6 rounded-lg bg-red-50 p-3 text-left">
                <p className="font-mono text-xs text-red-700">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-dark"
            >
              <RefreshCw size={16} />
              Recargar página
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
