// Picks the highest-signal subset of a file tree so the scan prompt stays cheap.

const MANIFEST =
  /(^|\/)(package\.json|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|tsconfig[\w.-]*\.json|next\.config\.[jtm]s|vite\.config\.[jt]s|nuxt\.config\.[jt]s|svelte\.config\.[jt]s|astro\.config\.[jtm]s|tailwind\.config\.[jt]s|vercel\.json|netlify\.toml|render\.yaml|fly\.toml|railway\.json|Dockerfile|docker-compose\.ya?ml|Procfile|requirements\.txt|pyproject\.toml|Pipfile|poetry\.lock|manage\.py|setup\.py|setup\.cfg|go\.mod|Cargo\.toml|Gemfile|composer\.json|pubspec\.yaml|\.env\.example|\.nvmrc|\.node-version|app\.json|app\.config\.[jt]s|eas\.json|Info\.plist|.*\.entitlements|Package\.swift|.*\.csproj|.*\.uproject|project\.godot|steam_appid\.txt|PrivacyInfo\.xcprivacy|schema\.prisma|README(\.\w+)?|LICENSE[\w.]*)$/i;

const CI = /(^|\/)\.github\/workflows\/[^/]+\.ya?ml$/i;

const KEY_DIR =
  /(^|\/)(src|app|pages|lib|components|api|server|routes|handlers|models|prisma|migrations|scripts|Assets|Source|cmd)\//i;

export function pickSignalFiles(paths: string[], cap = 44): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (p: string) => {
    if (!seen.has(p) && out.length < cap) {
      seen.add(p);
      out.push(p);
    }
  };

  // 1. every manifest / config / CI file, wherever it lives
  for (const p of paths) if (MANIFEST.test(p) || CI.test(p)) push(p);

  // 2. everything at the repo root
  for (const p of paths) if (!p.includes("/")) push(p);

  // 3. a shallow sample of the important source directories
  const perDir: Record<string, number> = {};
  for (const p of paths) {
    if (out.length >= cap) break;
    if (!KEY_DIR.test(p) || p.split("/").length > 3) continue;
    const dir = p.split("/").slice(0, 2).join("/");
    perDir[dir] = (perDir[dir] ?? 0) + 1;
    if (perDir[dir] <= 6) push(p);
  }

  // 4. top up with whatever's left, shallowest paths first
  if (out.length < cap) {
    for (const p of [...paths].sort(
      (a, b) => a.split("/").length - b.split("/").length,
    )) {
      if (out.length >= cap) break;
      push(p);
    }
  }

  return out;
}
