import Link from "next/link";
import { getPrototype } from "@/lib/prototype";
import { MemoryPrototype } from "@/components/prototype/memory-prototype";
import { SidePanelTryIt } from "@/components/prototype/side-panel-try-it";
import { ChatSettingsTryIt } from "@/components/prototype/chat-settings-try-it";
import { ChatHistoryPageFull } from "@/components/screens/chat-history-page-states";
import { BrandLockup } from "@/components/lockup";

/**
 * The portfolio's cut of the handoff: the four flows that run, without the spec tabs.
 * Everything here is the same component the handoff ships; the full spec is one link away.
 */

function Flow({ kicker, title, body, children }: { kicker: string; title: string; body: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-rule py-14">
      <div className="mb-8 max-w-[62ch]">
        <p className="label mb-3">{kicker}</p>
        <h2 className="text-[29px] font-semibold tracking-[-0.02em] text-ink">{title}</h2>
        <p className="mt-4 text-[16px] leading-[1.6] text-ink-2">{body}</p>
      </div>
      {children}
    </section>
  );
}

export default function ShowcasePage() {
  const memory = getPrototype("memory-management");

  return (
    <main className="mx-auto max-w-[1480px] px-8 pb-24 pt-16">
      <header className="max-w-[56ch] pb-12">
        <BrandLockup className="mb-1 text-[36px]" />
        <h1 className="display mt-8 text-[clamp(34px,4.6vw,56px)] leading-[1.06] text-ink">
          PC Chat: Chat History and Memory
        </h1>
        <p className="mt-5 text-[17px] leading-[1.6] text-ink-2">
          Four flows from the handoff, running as built. Each one is the component engineering received, drawn
          from the live design files, so what you try here is what the spec says.
        </p>
      </header>

      {memory && (
        <Flow
          kicker="01 · Memory"
          title="What the assistant remembers, and how you correct it"
          body="Fifteen kinds of health facts, each shown as a plain sentence. Open one to see where it came from, edit it field by field, or delete it. Hover any element to inspect the spec behind it."
        >
          <MemoryPrototype data={memory} />
        </Flow>
      )}

      <Flow
        kicker="02 · Chat History"
        title="Find a past conversation and pick it back up"
        body="Search, rename and delete, with select-all for the bulk case. The list is rebuilt on the live frames, not a screenshot."
      >
        <div className="flex justify-center rounded-[14px] border border-rule bg-paper py-10">
          <div className="w-[393px] max-w-full overflow-hidden rounded-[28px] border border-rule bg-white shadow-[0_6px_28px_var(--shadow-soft)]">
            <ChatHistoryPageFull />
          </div>
        </div>
      </Flow>

      <Flow
        kicker="03 · Side Panel"
        title="New chat, history and memory, one swipe away"
        body="The navigation surface that replaced the bottom bar. Open it and move between the places it holds."
      >
        <SidePanelTryIt />
      </Flow>

      <Flow
        kicker="04 · Chat Settings"
        title="Auto-delete, and forgetting everything at once"
        body="Where a person turns auto-delete off, or deletes every chat or every memory. A bulk action that can't be undone asks for a typed confirmation: friction in the right place."
      >
        <ChatSettingsTryIt />
      </Flow>

      <footer className="border-t border-rule pt-10">
        <p className="text-[16px] leading-[1.6] text-ink-2">
          Behind each flow sits the full spec: every state, measurement, token and behaviour rule.{" "}
          <Link href="/" className="font-medium text-ink underline underline-offset-4">
            Open the full handoff
          </Link>
        </p>
      </footer>
    </main>
  );
}
