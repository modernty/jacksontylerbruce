import { useContext, useEffect, useState, createContext } from "react";
import {
  AuiConfig,
  AuiIf,
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  Tools,
  useAuiState,
  useLocalRuntime,
} from "@assistant-ui/react";
import { mockAdapter } from "./mock.js";
import { toolkit } from "./toolkit.js";
import { CatalogProvider } from "./views.jsx";
import { Timeline } from "./timeline-view.jsx";
import { craftDefaults, craftStyle, useCraft } from "./craft.js";

const config = AuiConfig({ tools: Tools({ toolkit }) });
const CraftContext = createContext(craftDefaults);

function messageState(status, running, content) {
  if (status && status.type === "incomplete" && status.error === "rate-limit") return "rate-limit";
  if (status && status.type === "incomplete" && status.error === "no-answer") return "no-answer";
  if (status && status.type === "incomplete") return "error";
  const hasText = (content || []).some((part) => part.type === "text" && part.text);
  if (running && !hasText) return "thinking";
  if (running) return "streaming";
  return "complete";
}

function setOrigin(origin) {
  document.querySelector(".ask-shell")?.setAttribute("data-answer-origin", origin);
}

function UserMessage() {
  const content = useAuiState((state) => state.message.content);
  const text = (content || [])
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");
  return (
    <p className="user" data-role="user" data-message-state="complete">
      {text}
    </p>
  );
}

function AssistantMessage() {
  const running = useAuiState((state) => state.thread.isRunning);
  const status = useAuiState((state) => state.message.status);
  const content = useAuiState((state) => state.message.content);
  const state = messageState(status, running, content);
  return (
    <article className="assistant" data-role="assistant" data-message-state={state}>
      {state === "thinking" ? <p className="status">Thinking</p> : null}
      {state === "streaming" ? <p className="status">Writing</p> : null}
      <MessagePrimitive.Parts />
    </article>
  );
}

function Mic() {
  return (
    <button type="button" className="mic" data-mic="idle" disabled aria-label="Voice is not connected">
      <svg viewBox="0 0 16 16" data-shape="idle" aria-hidden="true">
        <path d="M8 1.5a2 2 0 0 1 2 2v3.5a2 2 0 0 1-4 0V3.5a2 2 0 0 1 2-2zM5 7.5a3 3 0 0 0 6 0M8 10.5V13M6 13h4" />
      </svg>
      <svg viewBox="0 0 16 16" data-shape="listening" aria-hidden="true">
        <circle cx="8" cy="8" r="3.5" />
      </svg>
      <svg viewBox="0 0 16 16" data-shape="transcribing" aria-hidden="true">
        <path d="M3 5h10M3 8h10M3 11h7" />
      </svg>
      <svg viewBox="0 0 16 16" data-shape="thinking" aria-hidden="true">
        <path d="M5 5h6v6H5z" />
      </svg>
      <svg viewBox="0 0 16 16" data-shape="misfire" aria-hidden="true">
        <path d="M8 1.5a2 2 0 0 1 2 2v2M6 6.5v1a2 2 0 0 0 4 0M5 13.5h6M8 11v2" />
      </svg>
    </button>
  );
}

function Composer() {
  return (
    <ComposerPrimitive.Root className="composer" data-slot="empty-state-composer">
      <label className="composer-label" htmlFor="ask-tyler">Ask Tyler</label>
      <ComposerPrimitive.Input id="ask-tyler" rows={2} aria-label="Ask Tyler" />
      <div className="composer-row">
        <Mic />
        <AuiIf condition={(state) => !state.thread.isRunning}>
          <ComposerPrimitive.Send className="send" onClick={() => setOrigin("composer")}>
            Send
          </ComposerPrimitive.Send>
        </AuiIf>
        <AuiIf condition={(state) => state.thread.isRunning}>
          <ComposerPrimitive.Cancel className="stop">Stop</ComposerPrimitive.Cancel>
        </AuiIf>
      </div>
    </ComposerPrimitive.Root>
  );
}

function Suggestions() {
  const [prompts, setPrompts] = useState([]);
  const [visible, setVisible] = useState(false);
  const [played] = useState(() => {
    try {
      return window.sessionStorage.getItem("ask-cards-played") === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    let cancel = false;
    fetch("/content/suggested-prompts.json")
      .then((response) => response.json())
      .then((data) => {
        if (!cancel) setPrompts(data.prompts || []);
      })
      .catch(() => {
        if (!cancel) setPrompts([]);
      });
    const timer = window.setTimeout(() => setVisible(true), 2000);
    return () => {
      cancel = true;
      window.clearTimeout(timer);
    };
  }, []);
  useEffect(() => {
    if (!visible || played) return;
    try {
      window.sessionStorage.setItem("ask-cards-played", "1");
    } catch {
      /* private mode */
    }
  }, [visible, played]);
  const show = visible && prompts.length > 0;
  return (
    <div
      className="suggestions"
      data-suggestions
      data-visible={show ? "true" : "false"}
      data-played={played ? "true" : "false"}
      hidden={!show}
    >
      {prompts.map((item, index) => (
        <ThreadPrimitive.Suggestion key={item.id} prompt={item.prompt} send asChild>
          <button
            type="button"
            className="card"
            data-prompt-id={item.id}
            style={{ "--i": index }}
            onClick={() => setOrigin("card")}
          >
            <span className="kicker">{item.label}</span>
            <span className="prompt">{item.prompt}</span>
          </button>
        </ThreadPrimitive.Suggestion>
      ))}
    </div>
  );
}

function AskThread() {
  const empty = useAuiState((state) => state.thread.isEmpty);
  const running = useAuiState((state) => state.thread.isRunning);
  const craft = useContext(CraftContext);
  const chatState = empty ? "empty" : running ? "streaming" : "thread";
  return (
    <ThreadPrimitive.Root
      className="ask-shell"
      data-slot="empty-state"
      data-chat-state={chatState}
      style={craftStyle(craft)}
    >
      <div className="ask-column">
        <AuiIf condition={(state) => state.thread.isEmpty}>
          <h1 className="greeting">What are you looking for?</h1>
          <Composer />
          <p className="note">Placeholder. No model connected.</p>
          <Suggestions />
          <Timeline />
        </AuiIf>
        <AuiIf condition={(state) => !state.thread.isEmpty}>
          <div className="thread" data-slot="thread">
            <ThreadPrimitive.Viewport>
              <ThreadPrimitive.Messages>
                {({ message }) => (message.role === "user" ? <UserMessage /> : <AssistantMessage />)}
              </ThreadPrimitive.Messages>
            </ThreadPrimitive.Viewport>
            <Composer />
            <p className="note">Placeholder. No model connected.</p>
          </div>
        </AuiIf>
      </div>
    </ThreadPrimitive.Root>
  );
}

export function AskApp() {
  const runtime = useLocalRuntime(mockAdapter);
  const craft = useCraft();
  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <CraftContext.Provider value={craft.values}>
        <CatalogProvider>
          <AskThread />
        </CatalogProvider>
        {craft.Dial ? <craft.Dial onChange={craft.setValues} /> : null}
      </CraftContext.Provider>
    </AssistantRuntimeProvider>
  );
}
