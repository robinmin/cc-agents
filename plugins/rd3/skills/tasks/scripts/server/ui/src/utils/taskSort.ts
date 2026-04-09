import type { TaskListItem } from '../types';
import type { SortOption } from '../components/SortDropdown';

export function compareWbs(a: string, b: string): number {
    const aParts = a.split('.').map((part) => Number.parseInt(part, 10));
    const bParts = b.split('.').map((part) => Number.parseInt(part, 10));
    const maxLength = Math.max(aParts.length, bParts.length);

    for (let index = 0; index < maxLength; index += 1) {
        const aPart = aParts[index];
        const bPart = bParts[index];

        if (aPart === undefined) {
            return -1;
        }

        if (bPart === undefined) {
            return 1;
        }

        if (aPart !== bPart) {
            return aPart - bPart;
        }
    }

    return 0;
}

function parseDate(dateStr: string | undefined): number {
    if (!dateStr) {
        return 0;
    }

    return new Date(dateStr).getTime();
}

export function sortTasks(tasks: TaskListItem[], sortOption: SortOption): TaskListItem[] {
    return [...tasks].sort((a, b) => {
        switch (sortOption) {
            case 'wbs-asc':
                return compareWbs(a.wbs, b.wbs);
            case 'wbs-desc':
                return compareWbs(b.wbs, a.wbs);
            case 'created-asc':
                return parseDate(a.created_at) - parseDate(b.created_at) || compareWbs(a.wbs, b.wbs);
            case 'created-desc':
                return parseDate(b.created_at) - parseDate(a.created_at) || compareWbs(a.wbs, b.wbs);
            case 'updated-asc':
                return parseDate(a.updated_at) - parseDate(b.updated_at) || compareWbs(a.wbs, b.wbs);
            case 'updated-desc':
                return parseDate(b.updated_at) - parseDate(a.updated_at) || compareWbs(a.wbs, b.wbs);
            default:
                return 0;
        }
    });
}
