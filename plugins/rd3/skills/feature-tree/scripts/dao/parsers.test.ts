import { describe, expect, test } from 'bun:test';
import { parseFeature, parseMetadata, parseWbsLink, serializeMetadata } from './parsers';

describe('parseFeature', () => {
    test('parses a full row with all fields', () => {
        const row = {
            id: 'f1',
            parent_id: 'root',
            title: 'My Feature',
            status: 'executing',
            metadata: '{"key":"val"}',
            depth: 2,
            position: 1,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-02T00:00:00Z',
        };
        const result = parseFeature(row);
        expect(result).toEqual({
            id: 'f1',
            parent_id: 'root',
            title: 'My Feature',
            status: 'executing',
            metadata: '{"key":"val"}',
            depth: 2,
            position: 1,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-02T00:00:00Z',
        });
    });

    test('handles null parent_id', () => {
        const row = {
            id: 'f2',
            parent_id: null,
            title: 'Root',
            status: 'backlog',
            metadata: '{}',
            depth: 0,
            position: 0,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
        };
        const result = parseFeature(row);
        expect(result.parent_id).toBeNull();
    });

    test('casts all FeatureStatus values correctly', () => {
        const statuses = ['backlog', 'validated', 'executing', 'done', 'blocked'] as const;
        for (const status of statuses) {
            const row = {
                id: 'x',
                parent_id: null,
                title: 't',
                status,
                metadata: '',
                depth: 0,
                position: 0,
                created_at: '',
                updated_at: '',
            };
            expect(parseFeature(row).status).toBe(status);
        }
    });

    test('preserves numeric fields', () => {
        const row = {
            id: 'f3',
            parent_id: null,
            title: 'T',
            status: 'done',
            metadata: '',
            depth: 5,
            position: 99,
            created_at: 'c',
            updated_at: 'u',
        };
        const result = parseFeature(row);
        expect(result.depth).toBe(5);
        expect(result.position).toBe(99);
    });
});

describe('parseWbsLink', () => {
    test('parses a complete WBS link row', () => {
        const row = {
            feature_id: 'f1',
            wbs_id: '0266',
            created_at: '2025-03-01T12:00:00Z',
        };
        const result = parseWbsLink(row);
        expect(result).toEqual({
            feature_id: 'f1',
            wbs_id: '0266',
            created_at: '2025-03-01T12:00:00Z',
        });
    });

    test('returns strings for all fields', () => {
        const row = {
            feature_id: 'abc',
            wbs_id: '9999',
            created_at: 'ts',
        };
        const result = parseWbsLink(row);
        expect(typeof result.feature_id).toBe('string');
        expect(typeof result.wbs_id).toBe('string');
        expect(typeof result.created_at).toBe('string');
    });
});

describe('parseMetadata', () => {
    test('parses valid JSON string', () => {
        const result = parseMetadata('{"name":"test","count":3}');
        expect(result).toEqual({ name: 'test', count: 3 });
    });

    test('parses empty object string', () => {
        const result = parseMetadata('{}');
        expect(result).toEqual({});
    });

    test('parses nested JSON', () => {
        const result = parseMetadata('{"a":{"b":[1,2]}}');
        expect(result).toEqual({ a: { b: [1, 2] } });
    });

    test('returns empty object for invalid JSON', () => {
        const result = parseMetadata('not-json');
        expect(result).toEqual({});
    });

    test('returns empty object for empty string', () => {
        const result = parseMetadata('');
        expect(result).toEqual({});
    });

    test('returns empty object for truncated JSON', () => {
        const result = parseMetadata('{"broken":');
        expect(result).toEqual({});
    });
});

describe('serializeMetadata', () => {
    test('serializes object to JSON string', () => {
        const result = serializeMetadata({ key: 'value' });
        expect(result).toBe('{"key":"value"}');
    });

    test('serializes empty object', () => {
        const result = serializeMetadata({});
        expect(result).toBe('{}');
    });

    test('handles null input by returning empty object JSON', () => {
        const result = serializeMetadata(null as unknown as Record<string, unknown>);
        expect(result).toBe('{}');
    });

    test('handles undefined input by returning empty object JSON', () => {
        const result = serializeMetadata(undefined as unknown as Record<string, unknown>);
        expect(result).toBe('{}');
    });

    test('round-trips with parseMetadata', () => {
        const original = { foo: 'bar', n: 42 };
        const serialized = serializeMetadata(original);
        const parsed = parseMetadata(serialized);
        expect(parsed).toEqual(original);
    });
});
