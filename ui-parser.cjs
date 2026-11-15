"use strict";
// Parses Claude Code stream-json events (emitted by qodercli) into Paperclip
// run-view events. Contract: parseStdoutLine(line, ts) -> event[].

function asRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
}

function num(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function parseStdoutLine(line, ts) {
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    return [{ kind: "stdout", ts, text: line }];
  }
  const e = asRecord(event);
  if (!e) return [{ kind: "stdout", ts, text: line }];
  const type = typeof e.type === "string" ? e.type : "";

  if (type === "system" && e.subtype === "init") {
    return [{
      kind: "init",
      ts,
      model: typeof e.model === "string" ? e.model : "unknown",
      sessionId: typeof e.session_id === "string" ? e.session_id : "",
    }];
  }

  if (type === "assistant" || type === "user") {
    const message = asRecord(e.message) ?? {};
    const content = Array.isArray(message.content) ? message.content : [];
    const out = [];
    for (const raw of content) {
      const block = asRecord(raw);
      if (!block) continue;
      const kind = typeof block.type === "string" ? block.type : "";
      if (kind === "text") {
        const text = typeof block.text === "string" ? block.text : "";
        if (text) out.push({ kind: type === "assistant" ? "assistant" : "user", ts, text });
      } else if (kind === "thinking") {
        const text = typeof block.thinking === "string" ? block.thinking : "";
        if (text) out.push({ kind: "thinking", ts, text });
      } else if (kind === "tool_use" && type === "assistant") {
        out.push({
          kind: "tool_call",
          ts,
          name: typeof block.name === "string" ? block.name : "unknown",
          toolUseId: typeof block.id === "string" ? block.id : undefined,
          input: block.input ?? {},
        });
      } else if (kind === "tool_result" && type === "user") {
        let text = "";
        if (typeof block.content === "string") text = block.content;
        else if (Array.isArray(block.content)) {
          text = block.content
            .map(asRecord)
            .filter((c) => c && typeof c.text === "string")
            .map((c) => c.text)
            .join("\n");
        }
        out.push({
          kind: "tool_result",
          ts,
          toolUseId: typeof block.tool_use_id === "string" ? block.tool_use_id : "",
          content: text,
          isError: block.is_error === true,
        });
      }
    }
    return out.length > 0 ? out : [{ kind: "stdout", ts, text: line }];
  }

  if (type === "result") {
    const usage = asRecord(e.usage) ?? {};
    return [{
      kind: "result",
      ts,
      text: typeof e.result === "string" ? e.result : "",
      inputTokens: num(usage.input_tokens),
      outputTokens: num(usage.output_tokens),
      cachedTokens: num(usage.cache_read_input_tokens),
      costUsd: num(e.total_cost_usd),
      subtype: typeof e.subtype === "string" ? e.subtype : "",
      isError: e.is_error === true,
      errors: [],
    }];
  }

  return [{ kind: "stdout", ts, text: line }];
}

module.exports = { parseStdoutLine };