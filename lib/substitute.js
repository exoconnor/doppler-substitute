import {setToken, secrets} from './dopplerClient.js';

// TODO(connor): production - move to typescript, even for a day project
// the notations on object fields would be helpful
export async function substitute(argv) {
  if (argv.token) {
    setToken(argv.token);
  }

  return secrets(argv.project, argv.config)
    .then((secrets) => [':ok', secrets])
    .catch((err) => [':error', err]);
}
