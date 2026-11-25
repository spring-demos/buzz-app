// Development only: where the agent runtime is unavailable (the browser host,
// a design preview), Agents shows a few sample agents instead of its "runs in
// the desktop app" notice, so the page can be seen with agents on it. Nothing
// here is saved or run; on a host with a runtime it changes nothing, and it is
// left out of production builds.
import { agentAvatars } from "../agents/avatar-packs";
import type {
  Agent,
  Agents,
  AgentsSnapshot,
  RegisteredAgentType,
} from "../agents/service";

const TYPE_KEY = "mock/harness";
const fakeKey = (n: number) => `m${n.toString(16)}`.padEnd(64, "0");
const picture = (id: string) =>
  agentAvatars.find((avatar) => avatar.id === id)?.url;

type Sample = Readonly<{
  name: string;
  avatar: string;
  summary: string;
  state?: "unfinished" | "elsewhere";
}>;

const SAMPLES: readonly Sample[] = [
  { name: "Scout", avatar: "gloopies-7", summary: "Claude Sonnet 4.5" },
  { name: "Ledger", avatar: "fuzzies-10", summary: "GPT-5 · High" },
  { name: "Atlas", avatar: "pollies-9", summary: "Gemini 2.5 Pro" },
  { name: "Pixel", avatar: "gloopies-14", summary: "Claude Opus 4.1" },
  { name: "Sage", avatar: "fuzzies-6", summary: "GPT-5 mini" },
  {
    name: "Relay",
    avatar: "pollies-21",
    summary: "",
    state: "elsewhere",
  },
  {
    name: "Drafty",
    avatar: "gloopies-11",
    summary: "",
    state: "unfinished",
  },
];

const mockType = {
  key: TYPE_KEY,
  id: "harness",
  pluginId: "mock",
  title: "Sample harness",
  remote: false,
  defaults: () => ({ config: { summary: "" } }),
  summary: (agent: Agent) =>
    (agent.config as { summary?: string } | undefined)?.summary ?? "",
} as unknown as RegisteredAgentType;

const mockAgents: readonly Agent[] = Object.freeze(
  SAMPLES.map(
    (sample, index): Agent => ({
      key: fakeKey(index + 1),
      pubkey: fakeKey(index + 1),
      name: sample.name,
      ...(picture(sample.avatar) !== undefined && {
        picture: picture(sample.avatar) as string,
      }),
      type: TYPE_KEY,
      owner: "",
      relay: "",
      place: sample.state === "elsewhere" ? "elsewhere" : "here",
      ...(sample.state === "unfinished" && { unfinished: true as const }),
      attention: {},
      skipped: {},
      timers: {},
      attentionEnabled: false,
      config: { summary: sample.summary },
    }),
  ),
);

/** The sample agents, for screens that show them outside the Agents page. */
export const sampleAgents = mockAgents;

/** Whether `pubkey` belongs to one of the sample agents above. */
export const isMockAgent = (pubkey: string) =>
  mockAgents.some((agent) => agent.pubkey === pubkey);

/** `agents`, with sample agents while its runtime is unavailable. */
export function withMockAgents(agents: Agents): Agents {
  let real: AgentsSnapshot | undefined;
  let shown: AgentsSnapshot | undefined;
  let realTypes: readonly RegisteredAgentType[] | undefined;
  let shownTypes: readonly RegisteredAgentType[] | undefined;
  const mocked = () => agents.snapshot().status === "unavailable";
  const overrides: Partial<Agents> = {
    snapshot: () => {
      const next = agents.snapshot();
      if (next.status !== "unavailable") return next;
      // One object per real snapshot, so a page reads it as unchanged.
      if (next !== real) {
        real = next;
        shown = {
          ...next,
          status: "ready",
          agents: mockAgents,
          running: [],
          teams: [],
        };
      }
      return shown ?? next;
    },
    types: () => {
      const types = agents.types();
      if (!mocked()) return types;
      // The sample type beside the registered ones, one list per real list.
      if (types !== realTypes) {
        realTypes = types;
        shownTypes = Object.freeze([...types, mockType]);
      }
      return shownTypes ?? types;
    },
    find: (pubkey) =>
      mocked()
        ? mockAgents.find((agent) => agent.pubkey === pubkey)
        : agents.find(pubkey),
  };
  return new Proxy(agents, {
    get: (target, name, receiver) =>
      Object.hasOwn(overrides, name)
        ? overrides[name as keyof Agents]
        : Reflect.get(target, name, receiver),
  });
}
