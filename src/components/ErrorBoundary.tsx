import { Component, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'حدث خطأ غير متوقع في الاتصال',
    };
  }

  componentDidCatch(error: Error): void {
    console.error('Application ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="cartoon-sky-bg flex min-h-screen items-center justify-center p-4"
        >
          <div className="w-full max-w-md rounded-3xl border-2 border-rose-200 bg-white p-6 text-center shadow-lg">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h2 className="font-display text-xl font-black text-slate-900">
              عذراً! حدث خلل مؤقت في الاتصال
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              يرجى إعادة تحميل الصفحة أو التأكد من اتصال الإنترنت للاستمرار في تحدي أبطال عائلة عتيق.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-tactile mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-sky-800 bg-sky-600 px-5 py-3 font-display text-base font-extrabold text-white hover:bg-sky-500 cursor-pointer"
            >
              <RotateCcw className="h-5 w-5" />
              <span>إعادة المحاولة</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
