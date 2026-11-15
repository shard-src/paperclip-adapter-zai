# @shard-src/paperclip-adapter-zai

Z.ai GLM harness adapter for [Paperclip](https://github.com/paperclipai/paperclip).

Runs the Claude Code CLI against the Z.ai Anthropic-compatible Messages API
(`https://api.z.ai/api/anthropic`) so GLM coding-plan models become Paperclip
employees. The model picker offers only GLM models — no unrelated Claude
catalog — and the harness is labelled **Z.ai GLM** in the UI.

## Requirements

- Paperclip self-hosted instance (Node.js >= 24.11)
- Claude Code CLI on the Paperclip host: `npm install -g @anthropic-ai/claude-code`
- Z.ai GLM coding plan API key: <https://z.ai/manage-apikey/apikey-list>

## Install

From a checkout of this repository:

```bash
npm install
paperclipai adapter install --payload-json \
  '{"packageName":"/absolute/path/to/paperclip-adapter-zai","isLocalPath":true}'
```

Or, once published to npm:

```bash
paperclipai adapter install --payload-json '{"packageName":"@shard-src/paperclip-adapter-zai"}'
```

Restart the Paperclip service if the CLI reports `requiresRestart`.

## Configure an agent

1. Create an AI connection: **Messages API** gateway, base URL
   `https://api.z.ai/api/anthropic`, bearer auth, model IDs
   `GLM-5.3, GLM-5.3-Flash`. Store the key in Paperclip's secret storage.
2. Create the agent with adapter `zai_local` and bind it to the connection.
   (Standalone alternative: `env.ANTHROPIC_AUTH_TOKEN` as a company secret
   reference.)

Suggested role mapping:

| Role | Model |
|------|-------|
| Management, coordination, design, research | GLM-5.3 |
| QA, routine checks, high-volume work | GLM-5.3-Flash |

## How it works

- `server/` — adapter module: forces the CLI engine, defaults the model to
  `GLM-5.3`, presets `ANTHROPIC_BASE_URL` and a generous API timeout, and
  delegates execution/tests to Paperclip's built-in `claude_local` engine
  (sessions, skills, instructions, connection projection included).
- `ui-parser.cjs` — parses Claude Code stream-json events for the Paperclip
  run view.

## License

MIT