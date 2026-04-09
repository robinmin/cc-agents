import { useState, useCallback, useEffect } from 'react';
import type { DropResult } from '@hello-pangea/dnd';
import type { TaskStatus } from '../types';
import configData from '../../config/statusTransitions.json';

export interface TransitionConfig {
    transitions: Record<TaskStatus, Record<TaskStatus, boolean>>;
}

// Extract transitions from the config file (skip the description field)
const defaultTransitions: TransitionConfig = {
    transitions: configData.transitions as Record<TaskStatus, Record<TaskStatus, boolean>>,
};

export interface TransitionValidationResult {
    isValid: boolean;
    sourceStatus: TaskStatus;
    targetStatus: TaskStatus;
    errorMessage?: string;
}

export interface TransitionState {
    toastMessage: string | null;
    toastType: 'error' | 'success' | 'info';
    showToast: boolean;
    revertCard: boolean;
}

export interface UseKanbanDragDropOptions {
    customTransitions?: TransitionConfig;
    onValidTransition?: (wbs: string, targetStatus: TaskStatus) => void;
    toastDuration?: number;
}

export function useKanbanDragDrop(options: UseKanbanDragDropOptions = {}) {
    const { customTransitions, onValidTransition, toastDuration = 3000 } = options;

    const transitions = customTransitions?.transitions ?? defaultTransitions.transitions;

    const [state, setState] = useState<TransitionState>({
        toastMessage: null,
        toastType: 'error',
        showToast: false,
        revertCard: false,
    });

    // Auto-hide toast after duration
    useEffect(() => {
        if (state.showToast) {
            const timer = setTimeout(() => {
                setState((prev) => ({ ...prev, showToast: false, toastMessage: null }));
            }, toastDuration);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [state.showToast, toastDuration]);

    const validateTransition = useCallback(
        (sourceStatus: TaskStatus, targetStatus: TaskStatus): TransitionValidationResult => {
            const sourceTransitions = transitions[sourceStatus];

            if (!sourceTransitions) {
                return {
                    isValid: false,
                    sourceStatus,
                    targetStatus,
                    errorMessage: `Unknown source status: ${sourceStatus}`,
                };
            }

            const isAllowed = sourceTransitions[targetStatus] ?? false;

            if (isAllowed) {
                return { isValid: true, sourceStatus, targetStatus };
            }

            return {
                isValid: false,
                sourceStatus,
                targetStatus,
                errorMessage: `So far, we are not allow to move from \`${sourceStatus}\` status to \`${targetStatus}\` status!`,
            };
        },
        [transitions],
    );

    const handleDragEnd = useCallback(
        (
            result: DropResult,
            getTaskStatus: (wbs: string) => TaskStatus | undefined,
        ): {
            action: 'move' | 'revert' | 'none';
            wbs?: string;
            targetStatus?: TaskStatus;
        } => {
            const { draggableId, destination, source } = result;

            // Dropped outside a droppable
            if (!destination) {
                return { action: 'none' };
            }

            // Dropped in same position
            if (destination.droppableId === source.droppableId && destination.index === source.index) {
                return { action: 'none' };
            }

            const targetStatus = destination.droppableId as TaskStatus;
            const sourceStatus = getTaskStatus(draggableId);

            if (!sourceStatus) {
                return { action: 'none' };
            }

            // Same status - no transition needed
            if (sourceStatus === targetStatus) {
                return { action: 'none' };
            }

            const validation = validateTransition(sourceStatus, targetStatus);

            if (!validation.isValid && validation.errorMessage) {
                // Show toast and trigger revert animation
                setState({
                    toastMessage: validation.errorMessage,
                    toastType: 'error',
                    showToast: true,
                    revertCard: true,
                });

                // Reset revert flag after animation
                setTimeout(() => {
                    setState((prev) => ({ ...prev, revertCard: false }));
                }, 300);

                return { action: 'revert', wbs: draggableId, targetStatus };
            }

            // Valid transition - callback to update status
            if (onValidTransition) {
                onValidTransition(draggableId, targetStatus);
            }

            return { action: 'move', wbs: draggableId, targetStatus };
        },
        [validateTransition, onValidTransition],
    );

    const dismissToast = useCallback(() => {
        setState((prev) => ({ ...prev, showToast: false, toastMessage: null }));
    }, []);

    const getRevertClass = useCallback(
        (_wbs: string): string => {
            return state.revertCard ? 'animate-revert-shake' : '';
        },
        [state.revertCard],
    );

    return {
        state,
        handleDragEnd,
        validateTransition,
        dismissToast,
        getRevertClass,
        transitions,
    };
}
