#!/usr/bin/env bun
import { Writable } from 'node:stream';
import { getLoggerConfig } from '@ftree/core';
import { configure, getStreamSink } from '@logtape/logtape';
import { Builtins, Cli } from 'clipanion';

import { FeatureAddCommand } from './commands/feature-add';
import { FeatureCheckDoneCommand } from './commands/feature-check-done';
import { FeatureContextCommand } from './commands/feature-context';
import { FeatureExportCommand } from './commands/feature-export';
import { FeatureInitCommand } from './commands/feature-init';
import { FeatureLinkCommand } from './commands/feature-link';
import { FeatureListCommand } from './commands/feature-list';
import { FeatureWbsCommand } from './commands/feature-wbs';
import { FeatureDeleteCommand } from './commands/feature-delete';
import { FeatureUpdateCommand } from './commands/feature-update';
import { FeatureMoveCommand } from './commands/feature-move';
import { FeatureUnlinkCommand } from './commands/feature-unlink';
import { FeatureDigestCommand } from './commands/feature-digest';
import { FeatureImportCommand } from './commands/feature-import';
import { CLI_CONFIG } from './config';

await configure({
    ...getLoggerConfig(process.env),
    sinks: {
        // CLI stdout is part of the ftree machine contract, so logs must never land there.
        console: getStreamSink(Writable.toWeb(process.stderr)),
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
cli.register(FeatureWbsCommand);
cli.register(FeatureCheckDoneCommand);
cli.register(FeatureContextCommand);
cli.register(FeatureExportCommand);
cli.register(FeatureDeleteCommand);
cli.register(FeatureUpdateCommand);
cli.register(FeatureMoveCommand);
cli.register(FeatureUnlinkCommand);
cli.register(FeatureDigestCommand);
cli.register(FeatureImportCommand);

cli.runExit(process.argv.slice(2));
