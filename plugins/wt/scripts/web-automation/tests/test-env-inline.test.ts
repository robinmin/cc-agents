import { describe, test, expect } from 'bun:test';
import { getDefaultProfileDir } from '../src/cdp';

describe('env test', () => {
  test('should use env var', () => {
    delete process.env.XDG_DATA_HOME;
    process.env.XDG_DATA_HOME = '/custom/test';
    
    const result = getDefaultProfileDir('test');
    console.log('Result:', result);
    console.log('Expected:', '/custom/test/test-profile');
    console.log('process.env.XDG_DATA_HOME:', process.env.XDG_DATA_HOME);
    
    expect(result).toBe('/custom/test/test-profile');
  });
});
