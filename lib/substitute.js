import fs from 'fs/promises';
import callbackfs from 'fs';
import path from 'path';
import replaceStream from 'replacestream';

import {setToken, getSecrets} from './dopplerClient.js';

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

// For each secret in secrets, create a middleware that reads the stream
// and replaces the template variable with the computed secret. 
function makePipes(secrets, format) {
  return async function (readStream, writeStream) {
    secrets
      .reduce((resolver, secret) => {
        return resolver.pipe(
          replaceStream(makePattern(secret.key, format)),
          secret.computed,
        );
      }, readStream)
      .pipe(writeStream);
  };
}

async function makeTransformSecrets({token, project, config, format}) {
  if (token) {
    setToken(token);
  }

  return getSecrets(project, config)
    .then((secrets) => {
      return Object.entries(secrets).map(([key, value]) => {
        return Object.assign({}, {key}, value);
      });
    })
    .then((s) => makePipes(s, format));
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
export async function substitute({source, target, ...rest}) {
  await maybeMakeTargetDirectory(target);
  let transformSecrets = await makeTransformSecrets(rest);
  for await (const [type, f] of dirwalker(source)) {
    let dest = path.join(target, path.relative(source, f));
    if (rest.verbose) {
      console.log(`Source: ${f}`);
      console.log(`Target: ${dest}`);
    }
    if (type === ':file') {
      await transformSecrets(
        callbackfs.createReadStream(f),
        callbackfs.createWriteStream(dest),
      );
    } else {
      if (rest.verbose) console.log('mkdir: ', dest);
      await fs.mkdir(dest, {recursive: true});
    }
  }
  return [':ok', true];
}
