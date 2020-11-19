import fetch from 'node-fetch';

// NOTE(connor): Likely env vars in CI, side effect it makes
// local testing more pleasant
let token = process.env.DOPPLER_TOKEN;
export function setToken(t) {
  token = t;
}

function headers() {
  if (!token) {
    throw 'Token must be provided as DOPPLER_TOKEN env var or passed as an argument';
  }
  return {
    accepts: 'application/json',
    'api-key': token,
  };
}

export async function secrets(project, config) {
  let url = 'https://api.doppler.com/v3/configs/config/secrets';
  let options = {
    method: 'GET',
    qs: {project, config},
    headers: headers(),
  };

  return fetch(url, options)
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        return data.secrets;
      } else {
        throw data.messages.join('\n');
      }
    })
    .catch((err) => [':error', err]); // TODO(connor): convert httperror to messages
}
