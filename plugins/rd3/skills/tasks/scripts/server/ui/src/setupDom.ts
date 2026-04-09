import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { Window } from 'happy-dom';

// Ensure happy-dom DOM is available before any test imports
// This must run BEFORE any other code that might reference document/window
if (typeof globalThis.document === 'undefined' || typeof globalThis.window === 'undefined') {
    GlobalRegistrator.register();
}

// Create happy-dom window and document for testing
const win = new Window();
const doc = win.document;

// Ensure global document/window are properly set for @testing-library/react
if (typeof globalThis.document === 'undefined') {
    (globalThis as unknown as Record<string, unknown>).document = doc;
}
if (typeof globalThis.window === 'undefined') {
    (globalThis as unknown as Record<string, unknown>).window = win;
}

// Save original Bun globals that break backend tests if clobbered
const originalReadableStream = global.ReadableStream;
const originalWritableStream = global.WritableStream;
const originalTransformStream = global.TransformStream;
const originalResponse = global.Response;
const originalRequest = global.Request;
const originalHeaders = global.Headers;
const originalFetch = global.fetch;
const originalTextEncoder = global.TextEncoder;
const originalTextDecoder = global.TextDecoder;
const originalFormData = global.FormData;
const originalFile = global.File;
const originalBlob = global.Blob;

// Restore Bun's native streams/web APIs after happy-dom registration
if (originalReadableStream) global.ReadableStream = originalReadableStream;
if (originalWritableStream) global.WritableStream = originalWritableStream;
if (originalTransformStream) global.TransformStream = originalTransformStream;
if (originalResponse) global.Response = originalResponse;
if (originalRequest) global.Request = originalRequest;
if (originalHeaders) global.Headers = originalHeaders;
if (originalFetch) global.fetch = originalFetch;
if (originalTextEncoder) global.TextEncoder = originalTextEncoder;
if (originalTextDecoder) global.TextDecoder = originalTextDecoder;
if (originalFormData) global.FormData = originalFormData;
if (originalFile) global.File = originalFile;
if (originalBlob) global.Blob = originalBlob;
