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
  isForceUpdate: boolean;
};

const MIN_VERSION_REGEX = /min_version[:\s]+v?(\d+\.\d+\.\d+)/i;

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
    const apkAsset = release.assets?.find(
      (a: { name: string }) => a.name.endsWith(".apk"),
    );
    const downloadUrl =
      apkAsset?.browser_download_url ??
      release.assets?.[0]?.browser_download_url ??
      release.html_url;
    const releaseNotes = release.body ?? "";

    const hasUpdate = isNewer(latestVersion, currentVersion);

    const minMatch = releaseNotes.match(MIN_VERSION_REGEX);
    const minVersion = minMatch?.[1] ?? latestVersion;
    const isForceUpdate = hasUpdate && isNewer(minVersion, currentVersion);

    return {
      hasUpdate,
      latestVersion,
      downloadUrl,
      releaseNotes,
      isForceUpdate,
    };
  } catch {
    return null;
  }
}
