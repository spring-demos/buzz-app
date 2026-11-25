// Development only: Message for a sample agent. The real button needs a relay
// session and direct messages, which a design preview doesn't have, so this
// opens a small scripted chat instead. Nothing is sent or saved.
import { useEffect, useRef, useState } from "react";
import { Avatar } from "../../shared/design-system/ui/Avatar";
import { Button } from "../../shared/design-system/ui/Button";
import { Dialog } from "../../shared/design-system/ui/Dialog";
import { Textarea } from "../../shared/design-system/ui/Textarea";
import { TypingDots } from "../../shared/design-system/ui/TypingDots";
import type { Agent } from "../agents/service";

type Turn = Readonly<{ id: number; from: "you" | "agent"; text: string }>;

const REPLY_DELAY_MS = 900;

const GREETINGS: Record<string, string> = {
  Scout: "Scout here. Point me at something to look into and I'll dig in.",
  Ledger: "Ledger here. Send me numbers, receipts or a budget question.",
  Atlas: "Atlas here. Ask me where something lives, or how to get there.",
  Pixel: "Pixel here. Show me a screen and I'll tell you what I'd nudge.",
  Sage: "Sage here. Ask me anything, big or small.",
};

const FOLLOW_UPS = [
  "Got it. I'm on it and will report back here when there's something to show.",
  "Good question. Here's my first pass: I'd start small, check it, then widen.",
  "Understood. I can take that on. Want a summary or the full details?",
  "Makes sense. I'll keep it short: noted, and I'll flag anything that blocks me.",
];

const greeting = (agent: Agent) =>
  GREETINGS[agent.name] ?? `${agent.name} here. How can I help?`;

/** The agent's answer to the `count`th thing you said. */
export const reply = (agent: Agent, said: string, count: number) =>
  count === 0
    ? `${greeting(agent)} You said: “${said}”. ${FOLLOW_UPS[0]}`
    : (FOLLOW_UPS[count % FOLLOW_UPS.length] ?? FOLLOW_UPS[0] ?? "");

export function MockAgentMessageButton({
  agent,
  variant = "subtle",
}: {
  agent: Agent;
  variant?: "glass" | "subtle";
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<readonly Turn[]>([]);
  const [replying, setReplying] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const next = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Scroll to the newest line whenever one arrives.
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [turns, replying, open]);

  const send = () => {
    const text = draft.trim();
    if (!text || replying) return;
    const said = turns.filter((turn) => turn.from === "you").length;
    setTurns((all) => [...all, { id: next.current++, from: "you", text }]);
    setDraft("");
    setReplying(true);
    timer.current = setTimeout(() => {
      setTurns((all) => [
        ...all,
        { id: next.current++, from: "agent", text: reply(agent, text, said) },
      ]);
      setReplying(false);
    }, REPLY_DELAY_MS);
  };

  const avatar = (
    <Avatar
      src={agent.picture}
      alt=""
      fallback={agent.name}
      shape="squircle"
      size="default"
    />
  );

  return (
    <>
      <Button
        size="sm"
        shape="control"
        variant={variant}
        onClick={() => setOpen(true)}
      >
        Message
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={`Message ${agent.name}`}
        description="Sample conversation: replies are scripted and nothing is sent."
      >
        <div
          ref={list}
          role="log"
          aria-label={`Conversation with ${agent.name}`}
          className="flex max-h-80 min-h-40 flex-col gap-3 overflow-y-auto"
        >
          {turns.length === 0 && !replying && (
            <p className="m-0 text-body-sm text-subtle">
              Say hi to {agent.name}.
            </p>
          )}
          {turns.map((turn) =>
            turn.from === "you" ? (
              <div key={turn.id} className="flex justify-end">
                <p className="m-0 max-w-[80%] whitespace-pre-wrap rounded-xl bg-surface-inset px-3 py-2 text-message">
                  {turn.text}
                </p>
              </div>
            ) : (
              <div key={turn.id} className="flex items-end gap-2">
                {avatar}
                <p className="m-0 max-w-[80%] whitespace-pre-wrap rounded-xl bg-affordance-subtle px-3 py-2 text-message">
                  {turn.text}
                </p>
              </div>
            ),
          )}
          {replying && (
            <div className="flex items-end gap-2">
              {avatar}
              <span
                role="status"
                aria-label={`${agent.name} is typing`}
                className="rounded-xl bg-affordance-subtle px-3 py-2"
              >
                <TypingDots state="working" size="message" />
              </span>
            </div>
          )}
        </div>
        <div className="mt-3 flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Textarea
              aria-label={`Message ${agent.name}`}
              placeholder={`Message ${agent.name}`}
              rows={1}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  send();
                }
              }}
            />
          </div>
          <Button
            size="sm"
            shape="control"
            variant="prominent"
            disabled={!draft.trim() || replying}
            onClick={send}
          >
            Send
          </Button>
        </div>
      </Dialog>
    </>
  );
}
