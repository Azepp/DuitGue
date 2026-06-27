const GITHUB_REPO = "Azepp/DuitGue";

function parseSemver(v: string): number[] {
  return v.replace(/^v/, "").split(".").map(Number);
}

function isNewer(latest: string, current: string): boolean {
  const l = parseSemver(latest);
  const c = parseSemver(current);
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const a = l[i] || 0;
    const b = c[i] || 0;
    if (a > b) return true;
    if (a < b) return false;
  }
  return false;
}

export type UpdateInfo = {
  hasUpdate: boolean;
  latestVersion: string;
  downloadUrl: string;
  releaseNotes: string;
};

export async function checkForUpdate(
  currentVersion: string,
): Promise<UpdateInfo | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      {
        headers: { Accept: "application/vnd.github.v3+json" },
      },
    );
    if (!res.ok) return null;

    const release = await res.json();
    const latestVersion = release.tag_name?.replace(/^v/, "") ?? "";
    const downloadUrl =
      release.assets?.[0]?.browser_download_url ?? release.html_url;
    const releaseNotes = release.body ?? "";

    return {
      hasUpdate: isNewer(latestVersion, currentVersion),
      latestVersion,
      downloadUrl,
      releaseNotes,
    };
  } catch {
    return null;
  }
}
