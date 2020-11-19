#!/usr/bin/env node

// NOTE(connor): there is an option in this library to import commands from
// modules. If you had horizontal feature growth it would make sense to
// submodule it out, and have each featureset provide its own interface.
// Right now that would just mean an excess of files

import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import substitute from './lib/substitute/index.js';

const USAGE_MESSAGE =
  'Recursively iterate through all files in <source> and replace variable ' +
  'expressions (see --format) with the respective secret from Doppler. ' +
  'Write transformed files to <dest>';

const FORMAT_DESCRIPTION = `
Variable Expression Formats
========================================
dollar:                 \$SECRET
dollar-curly:          \${SECRET}
handlebars:            \{{SECRET}}
dollar-handlebars:    \${{SECRET}}

`;

const argv = yargs(hideBin(process.argv))
  .usage('$0 <source> <dest>', USAGE_MESSAGE)
  .option('token', {
    alias: 't',
    type: 'string',
    description: 'Doppler API token',
    demandOption: true,
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
  .wrap(null).argv; // Otherwise yargs wraps the template literal

console.log(argv);
// substitute(argv.source, argv.dest, );
