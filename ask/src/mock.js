/**
 * PLACEHOLDER responder. There is no model and no API key.
 * TYLER: replace this adapter. Do not add an Anthropic call here.
 */

export const MOCK_PLACEHOLDER = true;

function userText(messages) {
  const last = [...messages].reverse().find((message) => message.role === "user");
  if (!last) return "";
  return (last.content || [])
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

export function classify(prompt) {
  if (/^trigger rate limit$/i.test(prompt)) return { kind: "rate-limit" };
  if (/^trigger error$/i.test(prompt)) return { kind: "error" };
  if (/lazarus/i.test(prompt)) return { kind: "project", id: "project:lazarus-brand" };
  if (/timeline|career|design leadership|design director/i.test(prompt)) {
    return { kind: "timeline", focus: /overmatch/i.test(prompt) ? "project:overmatch-ai" : undefined };
  }
  return { kind: "none" };
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason || new Error("aborted"));
    };
    if (signal.aborted) onAbort();
    else signal.addEventListener("abort", onAbort, { once: true });
  });
}

function toolCall(toolName, args) {
  return {
    type: "tool-call",
    toolCallId: `${toolName}:1`,
    toolName,
    args,
    argsText: JSON.stringify(args),
    result: args,
  };
}

export const mockAdapter = {
  async *run({ messages, abortSignal }) {
    const prompt = userText(messages);
    const decision = classify(prompt);
    await wait(160, abortSignal);

    if (decision.kind === "rate-limit") {
      yield {
        content: [{ type: "text", text: "Placeholder responder is rate limited. Try again shortly." }],
        status: { type: "incomplete", reason: "error", error: "rate-limit" },
      };
      return;
    }
    if (decision.kind === "error") {
      yield {
        content: [{ type: "text", text: "Placeholder responder failed before an answer." }],
        status: { type: "incomplete", reason: "error", error: "placeholder-error" },
      };
      return;
    }
    if (decision.kind === "project") {
      let text = "";
      for (const word of ["Placeholder", "responder."]) {
        text = text ? `${text} ${word}` : word;
        yield { content: [{ type: "text", text }] };
        await wait(40, abortSignal);
      }
      yield {
        content: [{ type: "text", text }, toolCall("show_project", { id: decision.id })],
        status: { type: "complete", reason: "stop" },
      };
      return;
    }
    if (decision.kind === "timeline") {
      const args = {};
      if (decision.focus) args.focus = decision.focus;
      let text = "";
      for (const word of ["Placeholder", "responder."]) {
        text = text ? `${text} ${word}` : word;
        yield { content: [{ type: "text", text }] };
        await wait(40, abortSignal);
      }
      yield {
        content: [{ type: "text", text }, toolCall("show_timeline", args)],
        status: { type: "complete", reason: "stop" },
      };
      return;
    }

    yield {
      content: [{ type: "text", text: "Nothing in the public record answers that." }],
      status: { type: "incomplete", reason: "error", error: "no-answer" },
    };
  },
};
