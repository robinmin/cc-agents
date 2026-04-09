import { useEffect, useState, type FC } from 'react';

export type ToastType = 'error' | 'success' | 'info';

export interface ToastProps {
    message: string;
    type?: ToastType;
    visible: boolean;
    onDismiss?: () => void;
    duration?: number;
}

const toastStyles: Record<ToastType, { bg: string; border: string; icon: string }> = {
    error: {
        bg: 'bg-red-50 dark:bg-red-900/30',
        border: 'border-red-400 dark:border-red-600',
        icon: '🚫',
    },
    success: {
        bg: 'bg-green-50 dark:bg-green-900/30',
        border: 'border-green-400 dark:border-green-600',
        icon: '✅',
    },
    info: {
        bg: 'bg-blue-50 dark:bg-blue-900/30',
        border: 'border-blue-400 dark:border-blue-600',
        icon: 'ℹ️',
    },
};

export const Toast: FC<ToastProps> = ({ message, type = 'error', visible, onDismiss, duration = 3000 }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        if (visible) {
            setIsVisible(true);
            setIsExiting(false);
        } else {
            // Trigger exit animation
            setIsExiting(true);
            const timer = setTimeout(() => {
                setIsVisible(false);
                setIsExiting(false);
            }, 300);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [visible]);

    // Don't render if not visible
    if (!isVisible) return null;

    const styles = toastStyles[type];

    return (
        <div
            role="alert"
            aria-live="assertive"
            className={`
        fixed bottom-6 left-1/2 -translate-x-1/2 z-50
        max-w-md w-full mx-4
        px-4 py-3
        ${styles.bg} border-2 ${styles.border}
        rounded-lg shadow-lg
        flex items-center gap-3
        transition-all duration-300 ease-out
        ${isExiting ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}
      `}
        >
            <span className="text-xl shrink-0" aria-hidden="true">
                {styles.icon}
            </span>

            <p className="flex-1 text-sm text-gray-800 dark:text-gray-100">
                {message
                    .split(/`([^`]+)`/)
                    .reduce<Array<{ key: string; text?: string; code?: string }>>((acc, part, i) => {
                        if (i === 0) {
                            // First element is always plain text (before first backtick)
                            if (part) acc.push({ key: `text-${i}`, text: part });
                        } else if (i % 2 === 1) {
                            // Odd indices are code content (captured groups)
                            acc.push({ key: `code-${i}`, code: part });
                        } else {
                            // Even indices (after code) are plain text
                            if (part) acc.push({ key: `text-${i}`, text: part });
                        }
                        return acc;
                    }, [])
                    .map((segment) =>
                        segment.code ? (
                            <code
                                key={segment.key}
                                className="px-1 py-0.5 bg-white/50 dark:bg-black/30 rounded text-xs font-mono"
                            >
                                {segment.code}
                            </code>
                        ) : (
                            <span key={segment.key}>{segment.text}</span>
                        ),
                    )}
            </p>

            {onDismiss && (
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Dismiss notification"
                    className="
            shrink-0 p-1 rounded
            hover:bg-black/10 dark:hover:bg-white/10
            focus:outline-none focus:ring-2 focus:ring-offset-2
            transition-colors
          "
                >
                    <svg
                        className="w-4 h-4 text-gray-500 dark:text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}

            {/* Progress bar for auto-dismiss */}
            <div
                className={`
          absolute bottom-0 left-0 h-0.5
          ${type === 'error' ? 'bg-red-400' : type === 'success' ? 'bg-green-400' : 'bg-blue-400'}
          animate-shrink-bar
        `}
                style={{ animationDuration: `${duration}ms` }}
                aria-hidden="true"
            />
        </div>
    );
};
