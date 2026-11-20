# Prompt Workshop

Prompt Workshop turns rough ideas and images into ready-to-use AI prompts, reviews prompts you already have, and keeps a shared library of the ones your team likes.

Inspired by generateprompt.ai

Built with [oss.new](https://oss.new) for [EveryApp](https://github.com/every-app/every-app).

## Features

- Turn an idea into a Simple, Advanced or Expert prompt for any model, ChatGPT, Claude, Gemini or DeepSeek, then refine it and keep every version.
- Check a prompt to get a quality level, a score, its strengths, its problems and an improved version.
- Build a detailed image prompt from a description, style, aspect ratio, camera angle, lighting, quality terms and a negative prompt.
- Upload a JPG, PNG or WebP image and get a prompt that recreates it.
- Browse, search, filter and copy the team's shared prompt library, and add, edit or delete your own entries.
- Look back through your own private history of results, filter it by kind, and delete entries.

Left out: accounts and sign-in, which your Gateway handles; paid plans; video and other specialised image tools; text humanizing and AI detection; the public gallery and curated content; blog, newsletter and translations.

## Setup

```sh
pnpm install
pnpm dev          # run locally behind a local Gateway
pnpm test         # unit tests
pnpm run deploy   # deploy to your Cloudflare account behind your Gateway
```

The app has no secrets or settings of its own. It needs a chat model set up on your Gateway (`pnpm everyapp ai show` shows what it uses; `pnpm everyapp provider add openrouter` adds one). Uploaded images go to the app's own R2 bucket, so R2 must be enabled on the Cloudflare account.

## Limitations

- Prompts from an image need a default model that accepts images; a text-only model answers with an error.
- Results depend on the model your Gateway uses; a check that comes back in a form the app can't read is shown as an error and not saved.
- The release checks run against a stand-in model, so real model output was not tested.
