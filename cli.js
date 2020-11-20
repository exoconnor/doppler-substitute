#!/usr/bin/env node

import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';

import {substitute} from './lib/substitute.js';

const USAGE_MESSAGE =
  'Recursively iterate through all files in <source> and replace variable ' +
  'expressions (see --format) with the respective secret from Doppler. ' +
  'Write transformed files to <target>';

const FORMAT_DESCRIPTION = `
Variable Expression Formats
========================================
dollar:                 \$SECRET
dollar-curly:          \${SECRET}
handlebars:            \{{SECRET}}
dollar-handlebars:    \${{SECRET}}

`;


const argv = yargs(hideBin(process.argv))
      .usage('$0 <source> <target>', USAGE_MESSAGE)
      .option('project', {
        type: 'string',
        description: 'project to grab secrets from',
        requiresArg: true
      })
      .option('config', {
        type: 'string',
        description: 'config to grab secrets from',
        requiresArg: true
      })
      .option('token', {
        alias: 't',
        type: 'string',
        description: 'Doppler API token',
      })
      .help()
      .option('verbose', {
        type: 'boolean',
      })
      .option('format', {
        type: 'string',
        description: FORMAT_DESCRIPTION,
        choices: ['dollar', 'dollar-curly', 'handlebars', 'dollar-handlebars'],
        default: 'dollar-curly',
      })
      .wrap(null).argv; // Otherwise yargs puts newlines in the template literal

if (argv.verbose) console.log('Argv:', argv);

// In a growing system this becomes the function dispatch switch
try {
  await substitute(argv);
  console.log('Done');
} catch(err) {
  console.error('Error: ', err);
}
