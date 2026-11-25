import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { finalizeEvent, getPublicKey } from "nostr-tools";
const sk = (s) => new Uint8Array(createHash("sha256").update(s).digest());
const keys = Object.fromEntries(["viewer","relay","maya","jonas","priya"].map((n) => [n, sk("buzz-demo-" + n)]));
const pub = Object.fromEntries(Object.entries(keys).map(([n, k]) => [n, getPublicKey(k)]));
const T0 = 1_760_000_000;
const sign = (who, e) => finalizeEvent({ created_at: T0, content: "", tags: [], ...e }, keys[who]);
const chans = [
  ["8d1f6b52-1a3e-4c2a-9b1e-0a1b2c3d4e01", "general", "Company-wide announcements and hellos"],
  ["8d1f6b52-1a3e-4c2a-9b1e-0a1b2c3d4e02", "design", "Design reviews, critiques and assets"],
  ["8d1f6b52-1a3e-4c2a-9b1e-0a1b2c3d4e03", "engineering", "Builds, deploys and code review"],
  ["8d1f6b52-1a3e-4c2a-9b1e-0a1b2c3d4e04", "launch-planning", "Everything for the spring launch"],
  ["8d1f6b52-1a3e-4c2a-9b1e-0a1b2c3d4e05", "random", "Memes, music and lunch plans"],
];
const members = [pub.viewer, pub.maya, pub.jonas, pub.priya];
const rosters = chans.map(([id], i) => sign("relay", { kind: 39002, created_at: T0 + i, tags: [["d", id], ...members.map((m) => ["p", m])] }));
const metas = chans.map(([id, name, about], i) => sign("relay", { kind: 39000, created_at: T0 + i, tags: [["d", id], ["name", name], ["about", about], ["public"], ["open"]] }));
writeFileSync("__spring_canvas__/rosters.json", JSON.stringify(rosters));
writeFileSync("__spring_canvas__/metas.json", JSON.stringify(metas));
writeFileSync("__spring_canvas__/keys.json", JSON.stringify({ pub, chans: chans.map((c) => c[0]) }));
console.log(JSON.stringify(pub));
