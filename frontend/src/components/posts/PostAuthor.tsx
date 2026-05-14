import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiJson } from "../../lib/api";
import { resolveMediaUrl } from "../../lib/mediaUrl";
import { shortenAddress } from "../../lib/format";
import type { PublicUser } from "../../types/api";

type Cached = {
  expiresAt: number;
  user: PublicUser | null;
};

const CACHE = new Map<string, Cached>();
const TTL_MS = 60_000;

async function lookup(address: string): Promise<PublicUser | null> {
  const key = address.toLowerCase();
  const hit = CACHE.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.user;
  try {
    const data = await apiJson<
      | { registered: true; user: PublicUser }
      | { registered: false }
    >(`/users/by-wallet/${address}`);
    const user = data.registered ? data.user : null;
    CACHE.set(key, { user, expiresAt: Date.now() + TTL_MS });
    return user;
  } catch {
    CACHE.set(key, { user: null, expiresAt: Date.now() + TTL_MS });
    return null;
  }
}

export function PostAuthor({
  address,
  linkToProfile = false,
}: {
  address: string;
  linkToProfile?: boolean;
}) {
  const [user, setUser] = useState<PublicUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    void lookup(address).then((u) => {
      if (!cancelled) setUser(u);
    });
    return () => {
      cancelled = true;
    };
  }, [address]);

  const avatar = resolveMediaUrl(user?.avatarUrl);
  const display = user?.username ?? shortenAddress(address);
  const profilePath = user?.username
    ? `/${encodeURIComponent(user.username)}`
    : `/u/${encodeURIComponent(address)}`;

  const inner = (
    <>
      {avatar ? (
        <img src={avatar} alt="" className="author-avatar" />
      ) : (
        <span className="author-avatar placeholder" aria-hidden />
      )}
      <span className="author-name">{display}</span>
    </>
  );

  if (linkToProfile) {
    return (
      <Link
        to={profilePath}
        className="author author--profile-link"
        title={address}
      >
        {inner}
      </Link>
    );
  }

  return (
    <span className="author" title={address}>
      {inner}
    </span>
  );
}
