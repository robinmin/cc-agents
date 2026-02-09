import { getPlatformConfig, clearConfigCache } from './plugins/wt/scripts/web-automation/src/config.js';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const tempDir = '/tmp/test-config-debug';
await mkdir(tempDir, { recursive: true });
const filePath = join(tempDir, 'config.jsonc');

// Test 1: Write file and read config
await writeFile(filePath, '{"fileKey": "fileValue"}');
process.env.TEST_OVERRIDE = JSON.stringify({ envKey: 'envValue' });

clearConfigCache();
const config1 = getPlatformConfig({
  configPath: filePath,
  envVar: 'TEST_OVERRIDE',
});

console.log('Test 1 - config:', JSON.stringify(config1, null, 2));
console.log('Test 1 - config["envKey"]:', config1['envKey']);
console.log('Test 1 - config["fileKey"]:', config1['fileKey']);
