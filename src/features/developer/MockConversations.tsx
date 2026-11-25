// Development only: sample chats with the sample agents, shown on Messages
// where no community is connected, so the conversation screen can be seen with
// real-looking content. The list sits in the sidebar and the open chat in the
// page. Replies are scripted; nothing is sent or saved.
import { useEffect, useRef, useSyncExternalStore } from "react";
import { Avatar } from "../../shared/design-system/ui/Avatar";
import { Button } from "../../shared/design-system/ui/Button";
import { Textarea } from "../../shared/design-system/ui/Textarea";
import { TypingDots } from "../../shared/design-system/ui/TypingDots";
import type { Agent } from "../agents/service";
import { reply } from "./MockAgentMessageButton";
import { sampleAgents } from "./mock-agents";

/** Dev servers only; unit tests keep the real empty state. */
export const mockConversationsAvailable =
  import.meta.env.DEV && import.meta.env.MODE !== "test";

type Turn = Readonly<{ from: "you" | "agent"; text: string }>;
type Conversation = Readonly<{
  id: string;
  agent: string;
  title: string;
  when: string;
  turns: readonly Turn[];
}>;

const you = (text: string): Turn => ({ from: "you", text });
const agent = (text: string): Turn => ({ from: "agent", text });

const CONVERSATIONS: readonly Conversation[] = [
  {
    id: "scout-pricing",
    agent: "Scout",
    title: "Competitor pricing scan",
    when: "2m",
    turns: [
      you("Can you check how the three closest competitors price their team plans?"),
      agent("On it. I'm pulling their public pricing pages now."),
      agent(
        "Found them. Per seat, per month, billed annually:\n• Acme: $12\n• Northwind: $15\n• Loop: $9\nYou're at $11, so you sit in the middle.",
      ),
      you("Is Loop's cheaper plan missing anything important?"),
      agent(
        "Yes. Loop's $9 tier has no SSO and keeps history for only 30 days. Acme and Northwind both include SSO from their first paid tier.",
      ),
      you("Good to know. Can you keep an eye on those pages?"),
      agent(
        "Done. I'll check them every Monday and message you only if a price or a plan limit changes.",
      ),
    ],
  },
  {
    id: "ledger-budget",
    agent: "Ledger",
    title: "March budget check",
    when: "1h",
    turns: [
      you("Does March look okay against the budget?"),
      agent(
        "Mostly. You're at 84% of the monthly budget with 9 days left. Two lines are over:\n• Cloud hosting: $4,210 of $3,800\n• Contractors: $6,900 of $6,500",
      ),
      you("Why is hosting up?"),
      agent(
        "Mainly one thing: the staging cluster was left running from the 12th to the 19th. That's about $340 of the overage. The rest is normal growth in traffic.",
      ),
      you("Can you flag it if that happens again?"),
      agent(
        "Yes. I'll message you when any environment runs more than 48 hours outside working days.",
      ),
    ],
  },
  {
    id: "atlas-invites",
    agent: "Atlas",
    title: "Where do invites live?",
    when: "Yesterday",
    turns: [
      you("Where does the invite flow live in the codebase?"),
      agent(
        "Three places:\n• The invite dialog: src/features/invites/InviteDialog.tsx\n• Sending and revoking: src/features/invites/service.ts\n• The accept-invite route: src/app/routes/join.tsx",
      ),
      you("Which one decides whether someone can invite?"),
      agent(
        "service.ts. canInvite() checks the member's role and the community's invite setting. The dialog only hides its button based on that answer.",
      ),
    ],
  },
  {
    id: "pixel-onboarding",
    agent: "Pixel",
    title: "Onboarding screen feedback",
    when: "Yesterday",
    turns: [
      you("Here's the new onboarding welcome screen. What would you change?"),
      agent(
        "Three small things:\n1. The headline and the subtitle are almost the same size. Make the headline one step larger.\n2. Skip and Continue have the same weight. Keep Continue as the clear main action.\n3. The illustration sits close to the edge on narrow windows. Give it more room.",
      ),
      you("Is the contrast okay on the grey subtitle?"),
      agent(
        "It's borderline in light mode. Use the next darker text role for it and it passes comfortably.",
      ),
      you("Thanks, I'll fix those."),
      agent("Great. Send the updated screen and I'll take another look."),
    ],
  },
  {
    id: "sage-week",
    agent: "Sage",
    title: "Plan my week",
    when: "Mon",
    turns: [
      you("I have a release on Thursday and two interviews. Help me plan the week."),
      agent(
        "Here's a draft:\n• Mon: finish the release checklist\n• Tue: interviews in the morning, bug triage after lunch\n• Wed: freeze the release and run a final pass\n• Thu: release, then no meetings\n• Fri: retro and notes",
      ),
      you("Can Tuesday be lighter?"),
      agent(
        "Yes. I'll move the bug triage to Wednesday morning and leave Tuesday afternoon free for interview notes.",
      ),
    ],
  },
  {
    id: "scout-notes",
    agent: "Scout",
    title: "Release notes draft",
    when: "Mon",
    turns: [
      you("Draft the release notes from this week's merged changes."),
      agent(
        "Here's a first pass:\n\nNew: faster channel switching, and chats that keep your place.\nImproved: search now finds messages inside threads.\nFixed: the settings close button, and a rare crash on reconnect.",
      ),
      you("Make it shorter and friendlier."),
      agent(
        "Switching channels is faster, search now reaches into threads, and a couple of annoying bugs are gone. Thanks for the reports!",
      ),
    ],
  },
];

const REPLY_DELAY_MS = 900;

type State = Readonly<{
  selected: string;
  /** What was said in the open session, after each chat's sample history. */
  extra: Readonly<Record<string, readonly Turn[]>>;
  replying: readonly string[];
}>;

let state: State = {
  selected: CONVERSATIONS[0]?.id ?? "",
  extra: {},
  replying: [],
};
const listeners = new Set<() => void>();
const update = (next: State) => {
  state = next;
  for (const listener of listeners) listener();
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const useChats = () =>
  useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );

const agentFor = (conversation: Conversation) =>
  sampleAgents.find((candidate) => candidate.name === conversation.agent);
const turnsOf = (conversation: Conversation, extra: State["extra"]) => [
  ...conversation.turns,
  ...(extra[conversation.id] ?? []),
];

function send(conversation: Conversation, text: string) {
  const owner = agentFor(conversation);
  const said =
    turnsOf(conversation, state.extra).filter((turn) => turn.from === "you")
      .length + 1;
  update({
    ...state,
    extra: {
      ...state.extra,
      [conversation.id]: [...(state.extra[conversation.id] ?? []), you(text)],
    },
    replying: [...state.replying, conversation.id],
  });
  setTimeout(() => {
    update({
      ...state,
      extra: {
        ...state.extra,
        [conversation.id]: [
          ...(state.extra[conversation.id] ?? []),
          agent(owner ? reply(owner, text, said) : "Got it."),
        ],
      },
      replying: state.replying.filter((id) => id !== conversation.id),
    });
  }, REPLY_DELAY_MS);
}

const picture = (owner: Agent | undefined, name: string, size: "default" | "small") => (
  <Avatar
    src={owner?.picture}
    alt=""
    fallback={name}
    shape="squircle"
    size={size}
  />
);

/** The sample chats, as the sidebar's list. */
export function MockConversationList() {
  const { selected, extra } = useChats();
  return (
    <nav aria-label="Agent chats" className="flex flex-col gap-1 px-2 pb-2">
      <h2 className="m-0 px-3 py-2 text-label text-subtle">Agent chats</h2>
      {CONVERSATIONS.map((conversation) => {
        const open = conversation.id === selected;
        const last = turnsOf(conversation, extra).at(-1);
        return (
          <Button
            key={conversation.id}
            variant={open ? "subtle" : "ghost"}
            size="row"
            aria-current={open ? "true" : undefined}
            onClick={() => update({ ...state, selected: conversation.id })}
          >
            <span className="flex w-full min-w-0 items-center gap-3 text-left">
              {picture(agentFor(conversation), conversation.agent, "default")}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-baseline justify-between gap-2">
                  <span
                    className={`truncate text-body-sm ${open ? "text-row-selected" : "text-row"}`}
                  >
                    {conversation.title}
                  </span>
                  <span
                    className={`shrink-0 text-caption ${open ? "text-row-selected-metadata" : "text-row-metadata"}`}
                  >
                    {conversation.when}
                  </span>
                </span>
                <span
                  className={`truncate text-caption ${open ? "text-row-selected-subtle" : "text-row-subtle"}`}
                >
                  {last?.text.split("\n")[0]}
                </span>
              </span>
            </span>
          </Button>
        );
      })}
    </nav>
  );
}

/** The open sample chat: its history, a typing line, and a composer. */
export function MockConversationView() {
  const { selected, extra, replying } = useChats();
  const conversation =
    CONVERSATIONS.find((candidate) => candidate.id === selected) ??
    CONVERSATIONS[0];
  const draft = useRef<HTMLTextAreaElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const turns = conversation ? turnsOf(conversation, extra) : [];
  const typing = !!conversation && replying.includes(conversation.id);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Scroll to the newest line whenever one arrives or the chat changes.
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [turns.length, typing, selected]);
  if (!conversation) return null;
  const owner = agentFor(conversation);
  const summary = (owner?.config as { summary?: string } | undefined)?.summary;
  const submit = () => {
    const field = draft.current;
    const text = field?.value.trim();
    if (!field || !text) return;
    send(conversation, text);
    field.value = "";
  };
  return (
    <section
      aria-label={`Conversation with ${conversation.agent}`}
      className="flex h-full min-h-0 w-full flex-col"
    >
      <header className="flex items-center gap-3 px-6 py-4">
        {picture(owner, conversation.agent, "default")}
        <div className="flex min-w-0 flex-col">
          <h1 className="m-0 truncate text-body text-standard">
            {conversation.title}
          </h1>
          <p className="m-0 truncate text-caption text-subtle">
            {conversation.agent}
            {summary ? ` · ${summary}` : ""}
          </p>
        </div>
      </header>
      <div
        ref={list}
        role="log"
        aria-label={`Messages with ${conversation.agent}`}
        className="min-h-0 flex-1 overflow-y-auto px-6 py-2"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
          {turns.map((turn, index) =>
            turn.from === "you" ? (
              <div key={`${conversation.id}:${index}`} className="flex justify-end">
                <p className="m-0 max-w-[80%] whitespace-pre-wrap rounded-xl bg-surface-inset px-3 py-2 text-message">
                  {turn.text}
                </p>
              </div>
            ) : (
              <div
                key={`${conversation.id}:${index}`}
                className="flex items-end gap-2"
              >
                {picture(owner, conversation.agent, "small")}
                <p className="m-0 max-w-[80%] whitespace-pre-wrap rounded-xl bg-affordance-subtle px-3 py-2 text-message">
                  {turn.text}
                </p>
              </div>
            ),
          )}
          {typing && (
            <div className="flex items-end gap-2">
              {picture(owner, conversation.agent, "small")}
              <span
                role="status"
                aria-label={`${conversation.agent} is typing`}
                className="rounded-xl bg-affordance-subtle px-3 py-2"
              >
                <TypingDots state="working" size="message" />
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="px-6 pt-3 pb-6">
        <div className="mx-auto flex w-full max-w-3xl items-end gap-2">
          <div className="min-w-0 flex-1">
            <Textarea
              key={conversation.id}
              ref={draft}
              aria-label={`Message ${conversation.agent}`}
              placeholder={`Message ${conversation.agent}`}
              rows={1}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  submit();
                }
              }}
            />
          </div>
          <Button
            size="sm"
            shape="control"
            variant="prominent"
            onClick={submit}
          >
            Send
          </Button>
        </div>
      </div>
    </section>
  );
}
