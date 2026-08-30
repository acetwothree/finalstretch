import type { Platform } from "./types";

type PkgJson = {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
} | null;

export interface ClassifyResult {
  detectedType: string;
  platform: Platform;
  detectedStack: string[];
  languages: string[];
  packageManagers: string[];
  notes: string[];
}

const EXT_LANG: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript",
  js: "JavaScript",
  jsx: "JavaScript",
  mjs: "JavaScript",
  py: "Python",
  swift: "Swift",
  kt: "Kotlin",
  java: "Java",
  cs: "C#",
  cpp: "C++",
  c: "C",
  rs: "Rust",
  go: "Go",
  rb: "Ruby",
  php: "PHP",
  gd: "GDScript",
  html: "HTML",
  css: "CSS",
  scss: "CSS",
};

export function launchTemplateName(platform: Platform) {
  switch (platform) {
    case "ios":
      return "App Store submission";
    case "android":
      return "Google Play submission";
    case "game":
      return "Steam release";
    case "python":
      return "package / service deploy";
    case "cli":
      return "release / distribution";
    case "desktop":
      return "desktop distribution";
    default:
      return "web launch";
  }
}

export function classify(paths: string[], pkg: PkgJson, hintLanguage?: string): ClassifyResult {
  const lower = paths.map((p) => p.toLowerCase());
  const has = (re: RegExp) => lower.some((p) => re.test(p));
  const deps: Record<string, string> = {
    ...(pkg?.dependencies ?? {}),
    ...(pkg?.devDependencies ?? {}),
  };
  const dep = (name: string) => Object.prototype.hasOwnProperty.call(deps, name);
  const isTs = has(/(^|\/)tsconfig\.json$/) || has(/\.tsx?$/);

  // --- signals -------------------------------------------------------------
  const iosSig =
    has(/\.xcodeproj\//) ||
    has(/\.xcworkspace\//) ||
    has(/(^|\/)package\.swift$/) ||
    has(/(^|\/)info\.plist$/) ||
    has(/(^|\/)appdelegate\.swift$/) ||
    has(/\.entitlements$/);
  const expoSig = dep("expo") || dep("react-native") || has(/(^|\/)app\.json$/) && dep("expo");
  const unrealSig = has(/\.uproject$/);
  const godotSig = has(/(^|\/)project\.godot$/);
  const unitySig =
    has(/(^|\/)projectsettings\/projectversion\.txt$/) ||
    has(/(^|\/)assets\/.*\.unity$/) ||
    has(/assembly-csharp/) ||
    has(/(^|\/)projectsettings\/projectsettings\.asset$/);
  const steamSig = has(/(^|\/)steam_appid\.txt$/) || has(/steam_api(64)?\.(dll|so|dylib)$/);
  const gameSig = unrealSig || godotSig || unitySig || steamSig;
  const djangoSig = has(/(^|\/)manage\.py$/);
  const pySig =
    djangoSig || has(/(^|\/)(requirements\.txt|pyproject\.toml|pipfile|setup\.py)$/) || has(/\.py$/);
  const goSig = has(/(^|\/)go\.mod$/);
  const rustSig = has(/(^|\/)cargo\.toml$/);
  const staticSig = has(/(^|\/)index\.html$/);

  // --- type + platform ---------------------------------------------------
  let detectedType = "Software Project";
  let platform: Platform = "web";
  const stack: string[] = [];

  if (dep("next")) {
    detectedType = "Next.js Web App";
    platform = "web";
    stack.push("Next.js", "React");
  } else if (expoSig) {
    detectedType = "React Native / Expo App";
    platform = "ios"; // mobile store rules dominate; Android tasks added alongside
    stack.push(dep("expo") ? "Expo" : "React Native");
  } else if (iosSig) {
    detectedType = "iOS / Swift App";
    platform = "ios";
    stack.push("Swift", "Xcode");
  } else if (unrealSig) {
    detectedType = "Unreal Engine Game";
    platform = "game";
    stack.push("Unreal Engine");
  } else if (godotSig) {
    detectedType = "Godot Game";
    platform = "game";
    stack.push("Godot");
  } else if (unitySig) {
    detectedType = "Unity Game";
    platform = "game";
    stack.push("Unity");
  } else if (steamSig) {
    detectedType = "Steam Game";
    platform = "game";
    stack.push("Steamworks");
  } else if (dep("electron") || dep("@tauri-apps/api")) {
    detectedType = dep("electron") ? "Electron Desktop App" : "Tauri Desktop App";
    platform = "desktop";
    stack.push(dep("electron") ? "Electron" : "Tauri");
  } else if (dep("vite") && (dep("react") || dep("react-dom"))) {
    detectedType = "React + Vite Web App";
    platform = "web";
    stack.push("Vite", "React");
  } else if (dep("react") || dep("react-dom")) {
    detectedType = "React Web App";
    platform = "web";
    stack.push("React");
  } else if (dep("vue") || dep("nuxt")) {
    detectedType = dep("nuxt") ? "Nuxt Web App" : "Vue Web App";
    platform = "web";
    stack.push(dep("nuxt") ? "Nuxt" : "Vue");
  } else if (dep("svelte") || dep("@sveltejs/kit")) {
    detectedType = "SvelteKit Web App";
    platform = "web";
    stack.push("Svelte");
  } else if (djangoSig) {
    detectedType = "Django Web App";
    platform = "python";
    stack.push("Django", "Python");
  } else if (has(/(^|\/)(requirements\.txt|pyproject\.toml|pipfile|setup\.py)$/)) {
    const cli =
      has(/(^|\/)setup\.py$/) || has(/console_scripts/) || has(/(^|\/)__main__\.py$/);
    detectedType = cli ? "Python CLI / Package" : "Python Project";
    platform = cli ? "cli" : "python";
    stack.push("Python");
  } else if (goSig) {
    detectedType = "Go Project";
    platform = "cli";
    stack.push("Go");
  } else if (rustSig) {
    detectedType = "Rust Project";
    platform = "cli";
    stack.push("Rust");
  } else if (pkg) {
    detectedType = "Node.js Project";
    platform = "cli";
    stack.push("Node.js");
  } else if (staticSig) {
    detectedType = "Static Website";
    platform = "web";
    stack.push("Static HTML");
  } else if (pySig) {
    detectedType = "Python Project";
    platform = "python";
    stack.push("Python");
  }

  if (isTs && !stack.includes("TypeScript")) stack.push("TypeScript");
  if (dep("tailwindcss") || has(/tailwind\.config\./)) stack.push("Tailwind CSS");
  if (dep("prisma") || has(/(^|\/)schema\.prisma$/)) stack.push("Prisma");
  if (dep("drizzle-orm")) stack.push("Drizzle");
  if (dep("@supabase/supabase-js")) stack.push("Supabase");
  if (dep("firebase") || dep("firebase-admin")) stack.push("Firebase");
  if (dep("express") || dep("fastify") || dep("hono")) stack.push("API server");
  if (dep("stripe") || dep("@stripe/stripe-js")) stack.push("Stripe");

  // --- languages -------------------------------------------------------
  const counts: Record<string, number> = {};
  for (const p of lower) {
    const ext = p.split(".").pop() ?? "";
    const lang = EXT_LANG[ext];
    if (lang) counts[lang] = (counts[lang] ?? 0) + 1;
  }
  let languages = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([l]) => l)
    .slice(0, 4);
  if (hintLanguage && !languages.includes(hintLanguage))
    languages = [hintLanguage, ...languages].slice(0, 4);
  if (!languages.length && hintLanguage) languages = [hintLanguage];

  // --- package managers ----------------------------------------------
  const packageManagers: string[] = [];
  if (has(/(^|\/)package-lock\.json$/)) packageManagers.push("npm");
  if (has(/(^|\/)yarn\.lock$/)) packageManagers.push("yarn");
  if (has(/(^|\/)pnpm-lock\.yaml$/)) packageManagers.push("pnpm");
  if (has(/(^|\/)bun\.lock(b)?$/)) packageManagers.push("bun");
  if (has(/(^|\/)podfile$/)) packageManagers.push("CocoaPods");
  if (has(/(^|\/)package\.swift$/)) packageManagers.push("SwiftPM");
  if (has(/(^|\/)(requirements\.txt|pipfile)$/)) packageManagers.push("pip");
  if (has(/(^|\/)poetry\.lock$/)) packageManagers.push("poetry");
  if (has(/(^|\/)go\.sum$/)) packageManagers.push("go modules");
  if (has(/(^|\/)cargo\.lock$/)) packageManagers.push("cargo");

  // --- notes / findings (last-mile blockers) ------------------------
  const notes: string[] = [];
  const noteIf = (cond: boolean, msg: string) => {
    if (cond) notes.push(msg);
  };

  noteIf(!has(/(^|\/)readme(\.md|\.mdx|\.txt)?$/), "No README found");
  noteIf(!has(/(^|\/)license/), "No LICENSE file");
  noteIf(
    !has(/(^|\/)\.env\.example$/) && (Boolean(pkg) || has(/\.env/)),
    "No .env.example committed",
  );
  noteIf(has(/(^|\/)\.env$/), "⚠ A raw .env file is inside the archive — rotate those keys");
  noteIf(!has(/(^|\/)\.github\/workflows\//), "No CI pipeline (.github/workflows)");
  noteIf(!has(/(test|spec|__tests__|\.test\.|\.spec\.)/), "No automated tests detected");

  if (platform === "web") {
    noteIf(
      Boolean(pkg) && dep("next") && !has(/(^|\/)(vercel\.json|netlify\.toml|render\.yaml)$/),
      "No deploy config (vercel.json / netlify.toml)",
    );
    noteIf(!has(/(^|\/)public\/(og|opengraph).*\.(png|jpg|jpeg)$/) && !has(/(^|\/)app\/opengraph-image\./), "No Open Graph / social preview image");
    noteIf(!has(/(^|\/)(public\/)?robots\.txt$/), "No robots.txt");
  }
  if (platform === "ios") {
    noteIf(!has(/privacyinfo\.xcprivacy/), "No PrivacyInfo.xcprivacy manifest (required by App Store)");
    noteIf(!has(/(^|\/)info\.plist$/), "Info.plist not found — usage-description strings can't be verified");
    noteIf(!has(/\.entitlements$/), "No .entitlements file — capabilities/signing may be incomplete");
  }
  if (platform === "game") {
    noteIf(!steamSig, "No steam_appid.txt — Steam API will not initialise in a real build");
    noteIf(!has(/(capsule|header|library).*\.(png|jpg|psd)$/), "No Steam capsule / header art found");
  }
  if (platform === "python" || platform === "cli") {
    noteIf(
      !has(/(^|\/)(dockerfile|procfile|fly\.toml|railway\.json|render\.yaml)$/i),
      "No deploy/runtime config (Dockerfile / Procfile / fly.toml)",
    );
    noteIf(
      !has(/(^|\/)(requirements\.txt|poetry\.lock|pdm\.lock)$/) && platform === "python",
      "Dependencies not pinned to a lockfile",
    );
  }
  if (!notes.length) notes.push("Structure looks healthy — scoring the last-mile gaps");

  return {
    detectedType,
    platform,
    detectedStack: Array.from(new Set(stack)).slice(0, 7),
    languages,
    packageManagers,
    notes: notes.slice(0, 7),
  };
}
