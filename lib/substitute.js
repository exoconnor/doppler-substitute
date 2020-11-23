import fs from 'fs/promises';
import callbackfs from 'fs';
import path from 'path';
import replaceStream from 'replacestream';

import {getSecrets} from './dopplerClient.js';

// Make the "patterns" used to match in stream
function makePattern(key, format) {
  switch (format) {
    case 'dollar':
      return '$' + key;
    case 'handlebars':
      return '{{' + key + '}}';
    case 'dollar-handlebars':
      return '${{' + key + '}}';
    default:
      return '${' + key + '}';
  }
}

// Load secrets, for each secret in secrets, create a middleware that reads the
// stream and replaces the template variable with the computed secret.
async function makeTransformSecrets({project, config, format}) {
  return getSecrets(project, config)
    .then((secrets) => {
      return Object.entries(secrets).map(([key, value]) => {
        return Object.assign({}, {key}, value);
      });
    })
    .then((secrets) => {
      return async function (readStream, writeStream) {
        secrets
          .reduce((resolver, secret) => {
            return resolver.pipe(
              replaceStream(makePattern(secret.key, format), secret.computed),
            );
          }, readStream)
          .pipe(writeStream);
      };
    });
}

// Walk directory and yield paths to operate on
async function* dirwalker(root) {
  // Input can be a file, opendir doesn't work on files
  let rootStat = await fs.stat(root);
  if (rootStat.isFile()) {
    yield [':file', root];
  } else {
    for await (const dirent of await fs.opendir(root)) {
      const handle = path.join(root, dirent.name);
      if (dirent.isDirectory()) {
        yield [':dir', handle];
        yield* dirwalker(handle);
      } else {
        yield [':file', handle];
      }
    }
  }
}

async function maybeMakeTargetDirectory(target) {
  return fs
    .stat(target)
    .then((target) => {
      if (!target.isDirectory()) {
        throw `Must write to directory`;
      }
    })
    .catch((err) => {
      if (err.code === 'ENOENT') {
        console.log(target);
        return fs.mkdir(target);
      } else {
        throw err;
      }
    });
}

// TODO(connor): production - move to typescript, I don't go for it in
// interviews just because it's one more piece to track and my lsp is
// cantankerous, but the documentation would make up for it.
export async function substitute({source, target, ...opt}) {
  await maybeMakeTargetDirectory(target);
  let transformSecrets = await makeTransformSecrets(opt);
  for await (const [type, readPath] of dirwalker(source)) {
    let writePath = path.join(target, path.relative(source, readPath));
    if (opt.verbose) {
      console.log(`Source: ${readPath}`);
      console.log(`Target: ${writePath}`);
    }
    if (type === ':file') {
      await transformSecrets(
        callbackfs.createReadStream(readPath),
        callbackfs.createWriteStream(writePath),
      );
    } else {
      if (opt.verbose) console.log('mkdir: ', writePath);
      await fs.mkdir(writePath, {recursive: true});
    }
  }
  return [':ok', true];
}
