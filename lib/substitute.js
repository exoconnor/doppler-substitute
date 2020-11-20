import fsCall from 'fs';
const fs = fsCall.promises;
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

// For each secret in secrets, we create a middleware that reads the stream
// and replaces the template variable with the computed secret. We then pipe
// out of the source file, through the transformer, and then into the writestream.
function makePipes(secrets, format) {
  return function (readStream, writeStream) {
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

// Inspiration: https://gist.github.com/lovasoa/8691344
async function* dirwalker(root) {
  if (fs.stat().isFile(root)) {
    yield root;
  } else {
    for await (const dirent of fs.promises.opendir(root)) {
      const handle = path.join(root, dirent.name);
      if (dirent.isDirectory() || dirent.isFile()) {
        yield handle;
      }
      if (dirent.isDirectory()) {
        yield* dirwalker(handle);
      }
    }
  }
}

// if parent directory doesn't exist but grandparent does, spawn parent
// callback hell
function maybeMakeParentDirectory(target, signalDone) {
  let parentDirectory = path.join(target, '..');
  let skipLevelDirectory = path.join(parentDirectory, '..');
  fs.stat().isDirectory(parentDirectory, (parentError, _) => {
    fs.stat().isDirectory(
      skipLevelDirectory,
      (skipLevelError, skipLevelStats) => {
        if (parentError && skipLevelStats) {
          fs.mkdir(parentDirectory, signalDone);
        } else if (parentError && skipLevelError) {
          throw skipLevelError;
        } else {
          signalDone();
        }
      },
    );
  });
}

// TODO(connor): production - move to typescript, I don't go for it in
// interviews just because it's one more piece to track and my lsp is
// cantankerous, but the documentation would make up for it.
export async function substitute({source, target, ...rest}) {
  let block = new Promise(
    (_) => true,
    (reject) => {
      throw reject;
    },
  );
  maybeMakeParentDirectory(target, (err, value) => {
    if (err) block.reject(err);
    block.resolve(value);
  });
  let transformSecrets = await makeTransformSecrets(rest);
  await block; // API should be slower, but don't want to walk before mkdir
  for await (const f of dirwalker(source)) {
    let dest = path.join(target, path.relative(source, f));
    if (rest.verbose) {
      console.log(`Source: ${source}`);
      console.log(`Target: ${target}`);
    }
    transformSecrets(fs.readStream(source), fs.writeStream(dest));
  }
  return [':ok', true];
}
