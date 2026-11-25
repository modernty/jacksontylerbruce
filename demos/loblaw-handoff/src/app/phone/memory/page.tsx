import { getPrototype } from "@/lib/prototype";
import { MemoryPrototype } from "@/components/prototype/memory-prototype";

/** The Memory prototype alone, centred on a transparent page, for the portfolio to embed. */
export default function MemoryPhonePage() {
  const memory = getPrototype("memory-management");
  if (!memory) return null;
  return (
    <main className="phone-page">
      <MemoryPrototype data={memory} bare />
    </main>
  );
}
