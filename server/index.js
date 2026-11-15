import {
  execute as claudeExecute,
  testEnvironment as claudeTestEnvironment,
  sessionCodec,
  listClaudeSkills,
  syncClaudeSkills,
} from "@paperclipai/adapter-claude-local/server";

export const type = "zai_local";
export const label = "Z.ai GLM";

export const models = [
  { id: "GLM-5.3", label: "GLM 5.3 — full reasoning" },
  { id: "GLM-5.3-Flash", label: "GLM 5.3 Flash — fast, cheap" },
];

const MODEL_IDS = new Set(models.map((m) => m.id));
const DEFAULT_BASE_URL = "https://api.z.ai/api/anthropic";

function withZaiDefaults(ctx) {
  const config = { ...(ctx.config ?? {}) };
  config.engine = "cli";
  if (!config.command) config.command = "claude";
  if (!config.model || !MODEL_IDS.has(String(config.model).trim())) config.model = "GLM-5.3";
  const env = { ...(config.env ?? {}) };
  if (!env.ANTHROPIC_BASE_URL) env.ANTHROPIC_BASE_URL = DEFAULT_BASE_URL;
  if (!env.API_TIMEOUT_MS) env.API_TIMEOUT_MS = "600000";
  config.env = env;
  return { ...ctx, config };
}

export function getConfigSchema() {
  return {
    fields: [
      {
        key: "model",
        label: "Model",
        type: "select",
        default: "GLM-5.3",
        options: models.map((m) => ({ value: m.id, label: m.label })),
        hint: "GLM-5.3 for reasoning-heavy roles; GLM-5.3-Flash for routine high-volume work.",
      },
      {
        key: "dangerouslySkipPermissions",
        label: "Skip permission prompts",
        type: "boolean",
        default: true,
        hint: "Required for autonomous headless runs. Govern work with Paperclip budgets and approvals.",
      },
      { key: "timeoutSec", label: "Run timeout (seconds)", type: "number", default: 0 },
      { key: "graceSec", label: "SIGTERM grace (seconds)", type: "number", default: 15 },
    ],
  };
}

export const agentConfigurationDoc = `# zai_local agent configuration

Adapter: zai_local — Z.ai GLM coding plan as a Paperclip harness.

Runs the Claude Code CLI against the Z.ai Anthropic-compatible Messages API
(https://api.z.ai/api/anthropic). Only GLM models are offered in the picker.

## Prerequisites

- Claude Code CLI on the Paperclip host: npm install -g @anthropic-ai/claude-code
- A Z.ai GLM coding plan API key (https://z.ai/manage-apikey/apikey-list)

## Credential options

1. Recommended: create a Paperclip AI connection (Messages API gateway,
   base URL https://api.z.ai/api/anthropic, bearer auth) and bind the agent
   to it. Keys stay in Paperclip's encrypted secret storage with rotation
   and per-connection usage tracking.
2. Standalone: set env.ANTHROPIC_AUTH_TOKEN to a company secret reference
   ({ "type": "secret_ref", "secretId": "<uuid>" }).

## Core fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| model | string | GLM-5.3 | GLM-5.3 or GLM-5.3-Flash |
| command | string | claude | Claude Code CLI path |
| env | object | base URL preset | Extra environment variables |
| dangerouslySkipPermissions | boolean | true | Headless autonomous runs |
| timeoutSec / graceSec | number | 0 / 15 | Run timeout and SIGTERM grace |

## Notes

- Suggested mapping: GLM-5.3 for management, coordination, design and
  research roles; GLM-5.3-Flash for QA and routine checks.
- The harness is Claude Code; the provider is Z.ai. Switching providers is
  a connection/model change, not a harness change.
`;

export function createServerAdapter() {
  return {
    type,
    label,
    runtimeToolDelivery: "native_mcp",
    execute: (ctx) => claudeExecute(withZaiDefaults(ctx)),
    testEnvironment: (ctx) => claudeTestEnvironment(withZaiDefaults(ctx)),
    models,
    listModels: async () => models,
    refreshModels: async () => models,
    sessionCodec,
    sessionManagement: {
      supportsSessionResume: true,
      nativeContextManagement: "confirmed",
    },
    listSkills: listClaudeSkills,
    syncSkills: syncClaudeSkills,
    getConfigSchema,
    supportsToolRefreshOnResume: true,
    supportsLocalAgentJwt: true,
    supportsInstructionsBundle: true,
    instructionsPathKey: "instructionsFilePath",
    requiresMaterializedRuntimeSkills: false,
    getRuntimeCommandSpec: (config) => ({
      command: config?.command || "claude",
      detectCommand: config?.command || "claude",
      installCommand: "npm install -g @anthropic-ai/claude-code",
    }),
    agentConfigurationDoc,
  };
}