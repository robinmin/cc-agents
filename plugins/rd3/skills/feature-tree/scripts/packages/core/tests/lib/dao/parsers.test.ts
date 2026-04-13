import { describe, expect, test } from 'bun:test';
import { parseFeature, parseMetadata, parseWbsLink, serializeMetadata } from '../../../src/lib/dao/parsers';

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
            parentId: 'root',
            title: 'My Feature',
            status: 'executing',
            metadata: '{"key":"val"}',
            depth: 2,
            position: 1,
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-02T00:00:00Z',
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
        expect(result.parentId).toBeNull();
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
            featureId: 'f1',
            wbsId: '0266',
            createdAt: '2025-03-01T12:00:00Z',
        });
    });
});

describe('parseMetadata', () => {
    test('parses valid JSON string', () => {
        const result = parseMetadata('{"name":"test","count":3}');
        expect(result).toEqual({ name: 'test', count: 3 });
    });

    test('returns empty object for invalid JSON', () => {
        const result = parseMetadata('not-json');
        expect(result).toEqual({});
    });

    test('returns empty object for empty string', () => {
        const result = parseMetadata('');
        expect(result).toEqual({});
    });
});

describe('serializeMetadata', () => {
    test('serializes object to JSON string', () => {
        const result = serializeMetadata({ key: 'value' });
        expect(result).toBe('{"key":"value"}');
    });

    test('round-trips with parseMetadata', () => {
        const original = { foo: 'bar', n: 42 };
        const serialized = serializeMetadata(original);
        const parsed = parseMetadata(serialized);
        expect(parsed).toEqual(original);
    });
});
