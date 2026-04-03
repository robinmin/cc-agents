/**
 * Per-WBS write serialization lock.
 *
 * Serializes concurrent writes to the same task file.
 * Reads are lock-free — only mutating operations acquire a lock.
 */

const locks = new Map<string, Promise<void>>();

/**
 * Acquire a per-key mutex. Returns a release function.
 * Callers must invoke `release()` in a finally block.
 */
export async function acquire(key: string): Promise<() => void> {
    // Wait for any in-flight operation on this key
    const existing = locks.get(key);
    let resolveHolder: () => void;

    const next = new Promise<void>((resolve) => {
        resolveHolder = resolve;
    });

    if (existing) {
        await existing;
    }

    locks.set(key, next);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- assigned synchronously above
    return () => {
        resolveHolder?.();
        if (locks.get(key) === next) {
            locks.delete(key);
        }
    };
}
