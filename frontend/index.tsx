import './vertex-ai-proxy-interceptor.js';
import React, { Component, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    errorText: string;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, errorText: '' };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, errorText: error?.message || 'An unexpected error occurred' };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Root Application Error Caught:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-studio-950 text-white flex flex-col items-center justify-center p-6 text-center font-mono">
                    <div className="max-w-md p-6 bg-studio-900 border border-red-500/50 rounded-2xl shadow-2xl space-y-4">
                        <div className="text-red-400 font-bold text-lg">⚠️ Song Dice Initializer Recovered</div>
                        <p className="text-xs text-studio-400 leading-relaxed">
                            {this.state.errorText}
                        </p>
                        <button
                            onClick={() => {
                                localStorage.clear();
                                window.location.reload();
                            }}
                            className="px-5 py-2.5 rounded-xl bg-studio-amber text-studio-950 font-bold text-xs uppercase tracking-wider hover:bg-amber-400"
                        >
                            Reset Studio Session
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
    <React.StrictMode>
        <RootErrorBoundary>
            <App />
        </RootErrorBoundary>
    </React.StrictMode>
);
