# Doppler Substitute

Testing JS CLI options, Doppler API, and Node file streaming.

Biggest thing to do before production ready would be a better testing story. There could be
some refactoring to make testing easier (e.g. isolate replacestream from any file handling so
that it could be feasibly tested on piped data). Testing is pretty manual right now the extent
of automating has been to make a script to auto clean the output directory. Typescript would
be a boon and not that hard to bring in but not necessary for using in production, just for
working without introducing too many breakages.

Of course, the true necessity is a packaging story. That's when you start asking why this was
built in Node. For systems with Node distribution as an NPM package works. For others, there are
projects such as https://github.com/vercel/pkg 

## Getting Started

- Entrypoint is cli.js
- Doppler token can be passed as token arg or as DOPPLER_TOKEN in environment
