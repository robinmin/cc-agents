#!/usr/bin/env bun
import { Writable } from 'node:stream';
import { getLoggerConfig } from '@ftree/core';
import { configure, getConsoleSink, getStreamSink } from '@logtape/logtape';
import { Builtins, Cli } from 'clipanion';

import { FeatureAddCommand } from './commands/feature-add';
import { FeatureInitCommand } from './commands/feature-init';
import { FeatureLinkCommand } from './commands/feature-link';
import { FeatureListCommand } from './commands/feature-list';
import { CLI_CONFIG } from './config';

// Detect JSON agent mode before logging is configured
const isJsonMode = process.argv.includes('--json');

await configure({
    ...getLoggerConfig(process.env),
    sinks: {
        console: isJsonMode ? getStreamSink(Writable.toWeb(process.stderr)) : getConsoleSink(),
    },
});

const cli = new Cli({
    binaryLabel: CLI_CONFIG.binaryLabel,
    binaryName: CLI_CONFIG.binaryName,
    binaryVersion: CLI_CONFIG.binaryVersion,
});

cli.register(Builtins.HelpCommand);
cli.register(Builtins.VersionCommand);
cli.register(FeatureInitCommand);
cli.register(FeatureAddCommand);
cli.register(FeatureLinkCommand);
cli.register(FeatureListCommand);

cli.runExit(process.argv.slice(2));
