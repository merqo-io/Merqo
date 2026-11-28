// Scene registry and argument handling shared by record.mjs and compose.mjs.
// Pure data and functions only (no browser, no ffmpeg), so the registry, the
// caption rules and the CLI contract are unit-testable and the two stages
// agree on scene names without importing each other.

const EM_DASH = "—";

/**
 * mode "single": one phone-sized recording. mode "split": two recordings
 * (customer phone and vendor board) composed side by side.
 * status "skeleton": the scene records, but part of what it shows needs data
 * or services this repo cannot drive on its own (see `note`).
 * `maskPrices`: the recorder blurs prices and price fields (free-pilot clips
 * never show a price). The localhost origin is blurred in every scene.
 * `pro`: the demo vendor needs a paid plan for the feature on camera.
 * `hook` is the on-screen headline shown for the whole clip; `captions` are
 * the short step captions record.mjs burns in per beat.
 */
export const SCENES = [
  {
    name: "one-account",
    chime: false,
    maskPrices: true,
    episode: null,
    mode: "single",
    status: "implemented",
    hook: "One sign-in. Every tool.",
    captions: {
      signup: "Create your Merqo account",
      signin: "One email, one password",
      kits: "Your kits, together in one place",
      more: "Add more kits as you grow",
    },
  },
];

const DEFAULT_SCENE = "one-account";

export function findScene(name) {
  return SCENES.find((s) => s.name === name) ?? null;
}

/** One line per scene, for --list and for the unknown-scene error. */
export function formatSceneList() {
  const pad = (v, n) => String(v).padEnd(n);
  return SCENES.map((s) => {
    const episode = s.episode === null ? "-" : "ep" + s.episode;
    return `  ${pad(s.name, 12)} ${pad(episode, 5)} ${pad(s.mode, 7)} ${s.status}`;
  }).join("\n");
}

/**
 * Parse `--scene <name>`, `--scene=<name>`, `--list` and `--help`.
 * Returns {scene, list, help, error}; never throws or exits, so the CLI
 * wrappers decide what to print.
 */
export function parseArgs(argv) {
  const out = { scene: DEFAULT_SCENE, list: false, help: false, error: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    // pnpm forwards the "--" of `pnpm run x -- --flag` to the script.
    if (arg === "--") continue;
    if (arg === "--list") out.list = true;
    else if (arg === "--help" || arg === "-h") out.help = true;
    else if (arg === "--scene") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        out.error = "--scene needs a name";
        break;
      }
      out.scene = value;
      i++;
    } else if (arg.startsWith("--scene=")) {
      out.scene = arg.slice("--scene=".length);
      if (!out.scene) {
        out.error = "--scene needs a name";
        break;
      }
    } else {
      out.error = `Unknown argument: ${arg}`;
      break;
    }
  }
  return out;
}

/** Scene for the parsed args, or an Error whose message lists the scenes. */
export function resolveScene(name) {
  const scene = findScene(name);
  if (scene) return scene;
  return new Error(`Unknown scene "${name}". Scenes:\n${formatSceneList()}`);
}

/** Every string a viewer reads on screen for a scene (hook + step captions). */
export function sceneCaptionTexts(scene) {
  return [
    ...(scene.hook ? [scene.hook] : []),
    ...Object.values(scene.captions),
  ];
}

export function hasEmDash(text) {
  return text.includes(EM_DASH);
}

/**
 * Break a caption into lines of at most `maxChars`. drawtext cannot wrap, and
 * a long hook would run off a 1080px frame. A word longer than the limit is
 * kept whole rather than split.
 */
export function wrapCaption(text, maxChars) {
  const greedy = wrapGreedy(text, maxChars);
  if (greedy.length < 2) return greedy;
  // Shrink the width while the line count holds, so a trailing word does not
  // end up alone on the last line.
  let best = greedy;
  for (let width = maxChars - 1; width > 0; width--) {
    const lines = wrapGreedy(text, width);
    if (lines.length !== greedy.length) break;
    best = lines;
  }
  return best;
}

function wrapGreedy(text, maxChars) {
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}
