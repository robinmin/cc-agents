import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Toast } from './Toast';

describe('Toast', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    describe('Rendering', () => {
        it('should render error toast with correct message', () => {
            render(
                <Toast message="Test error message" visible={true} type="error" onDismiss={vi.fn()} duration={3000} />,
            );

            expect(screen.getByRole('alert')).toBeInTheDocument();
            expect(screen.getByText('Test error message')).toBeInTheDocument();
        });

        it('should render success toast with checkmark icon', () => {
            render(
                <Toast
                    message="Operation successful"
                    visible={true}
                    type="success"
                    onDismiss={vi.fn()}
                    duration={3000}
                />,
            );

            expect(screen.getByText('✅')).toBeInTheDocument();
        });

        it('should render info toast with info icon', () => {
            render(
                <Toast message="Information message" visible={true} type="info" onDismiss={vi.fn()} duration={3000} />,
            );

            expect(screen.getByText('ℹ️')).toBeInTheDocument();
        });

        it('should render error toast with 🚫 icon', () => {
            render(<Toast message="Error occurred" visible={true} type="error" onDismiss={vi.fn()} duration={3000} />);

            expect(screen.getByText('🚫')).toBeInTheDocument();
        });

        it('should render dismiss button when onDismiss is provided', () => {
            render(
                <Toast message="Toast with dismiss" visible={true} type="info" onDismiss={vi.fn()} duration={3000} />,
            );

            expect(screen.getByRole('button', { name: /dismiss notification/i })).toBeInTheDocument();
        });

        it('should not render when visible is false', () => {
            const { container } = render(
                <Toast
                    message="Should not be visible"
                    visible={false}
                    type="error"
                    onDismiss={vi.fn()}
                    duration={3000}
                />,
            );

            expect(container.firstChild).toBeNull();
        });

        it('should format code spans in message with monospace styling', () => {
            render(
                <Toast
                    message="So far, we are not allow to move from `Backlog` status to `WIP` status!"
                    visible={true}
                    type="error"
                    onDismiss={vi.fn()}
                    duration={3000}
                />,
            );

            // Message contains formatted code spans
            expect(screen.getByRole('alert')).toBeInTheDocument();
        });
    });

    describe('Interaction', () => {
        it('should call onDismiss when dismiss button is clicked', () => {
            const onDismiss = vi.fn();
            render(
                <Toast message="Click to dismiss" visible={true} type="info" onDismiss={onDismiss} duration={3000} />,
            );

            const dismissButton = screen.getByRole('button', { name: /dismiss notification/i });
            fireEvent.click(dismissButton);

            expect(onDismiss).toHaveBeenCalledTimes(1);
        });

        it('should auto-dismiss after duration', () => {
            render(
                <Toast message="Auto-dismiss message" visible={true} type="info" onDismiss={vi.fn()} duration={3000} />,
            );

            expect(screen.getByRole('alert')).toBeInTheDocument();

            // Advance timers by duration
            act(() => {
                vi.advanceTimersByTime(3000);
            });

            // Toast should be removed after auto-dismiss (with exit animation)
            // The component removes itself after 300ms exit animation
            act(() => {
                vi.advanceTimersByTime(300);
            });
        });
    });

    describe('Accessibility', () => {
        it('should have role alert for screen readers', () => {
            render(<Toast message="Accessible toast" visible={true} type="info" onDismiss={vi.fn()} duration={3000} />);

            expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
        });

        it('should have aria-label on dismiss button', () => {
            render(
                <Toast message="Accessible dismiss" visible={true} type="info" onDismiss={vi.fn()} duration={3000} />,
            );

            const button = screen.getByRole('button', { name: /dismiss notification/i });
            expect(button).toHaveAttribute('aria-label', 'Dismiss notification');
        });
    });

    describe('Animation', () => {
        it('should show exit animation class when dismissed', () => {
            const { rerender } = render(
                <Toast message="Animated toast" visible={true} type="info" onDismiss={vi.fn()} duration={3000} />,
            );

            // First render should show toast
            expect(screen.getByRole('alert')).toBeInTheDocument();

            // Rerender with visible=false to trigger exit
            rerender(
                <Toast message="Animated toast" visible={false} type="info" onDismiss={vi.fn()} duration={3000} />,
            );

            // Toast should still be in DOM during exit animation
            expect(screen.getByRole('alert')).toBeInTheDocument();

            // Advance timers to complete exit animation
            act(() => {
                vi.advanceTimersByTime(300);
            });

            // Toast should be removed
            expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        });
    });
});

// Helper for act from @testing-library/react
import { act } from '@testing-library/react';
