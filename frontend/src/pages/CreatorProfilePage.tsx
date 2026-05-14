import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getAddress, isAddress } from "viem";
import { PostFeed } from "../components/posts/PostFeed";
import { apiErrorMessage, apiJson } from "../lib/api";
import { shortenAddress } from "../lib/format";
import { resolveMediaUrl } from "../lib/mediaUrl";
import type { PublicUser } from "../types/api";

export function CreatorProfilePage() {
  const { address: paramAddress } = useParams<{ address: string }>();
  const raw = paramAddress?.trim() ?? "";
  const valid = raw.length > 0 && isAddress(raw);
  const normalized = valid ? getAddress(raw) : null;

  const [user, setUser] = useState<PublicUser | null>(null);
  const [registered, setRegistered] = useState<boolean | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!normalized);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!normalized) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadErr(null);
    void (async () => {
      try {
        const data = await apiJson<
          | { registered: true; user: PublicUser }
          | { registered: false }
        >(`/users/by-wallet/${normalized}`);
        if (cancelled) return;
        if (data.registered) {
          setUser(data.user);
          setRegistered(true);
        } else {
          setUser(null);
          setRegistered(false);
        }
      } catch (e) {
        if (!cancelled) setLoadErr(apiErrorMessage(e, "Failed to load profile"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [normalized]);

  const custodial = user?.custodialWalletAddress?.trim() ?? "";

  const copyCustodial = async () => {
    if (!custodial) return;
    await navigator.clipboard.writeText(custodial);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!valid || !normalized) {
    return (
      <div className="page page--creator-profile">
        <p className="error feed-status">Invalid wallet address.</p>
        <Link to="/" className="btn-ghost-sm">
          Back to feed
        </Link>
      </div>
    );
  }

  const avatarSrc = resolveMediaUrl(user?.avatarUrl);
  const displayName = user?.username?.trim() || shortenAddress(normalized, 6, 4);

  return (
    <div className="page page--creator-profile">
      <div className="creator-prof-back">
        <Link to="/" className="creator-prof-back-link">
          ← Feed
        </Link>
      </div>

      {loadErr && <p className="error feed-status">{loadErr}</p>}

      <header className="creator-prof-head">
        {avatarSrc ? (
          <img src={avatarSrc} alt="" className="creator-prof-avatar" />
        ) : (
          <div className="creator-prof-avatar creator-prof-avatar--placeholder" aria-hidden />
        )}
        <div className="creator-prof-titles">
          <h1 className="creator-prof-name">{displayName}</h1>
          <div className="creator-prof-sub">
            {loading && !loadErr ? (
              <p className="creator-prof-loading muted small">Loading profile…</p>
            ) : custodial ? (
              <div className="creator-prof-custodial">
                <span className="creator-prof-custodial-label">Custodial</span>
                <div className="creator-prof-custodial-line">
                  <span
                    className="creator-prof-custodial-addr"
                    title={custodial}
                  >
                    {shortenAddress(custodial, 10, 8)}
                  </span>
                  <button
                    type="button"
                    className="creator-prof-copy"
                    onClick={() => void copyCustodial()}
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            ) : registered === false ? (
              <p className="creator-prof-handle muted">
                On-chain creator · not on Stable Post yet
              </p>
            ) : (
              <p className="creator-prof-custodial-label muted">
                Custodial wallet not linked
              </p>
            )}
          </div>
        </div>
      </header>

      <section className="creator-prof-posts">
        <h2 className="creator-prof-section-title">Posts</h2>
        <PostFeed
          onlyCreator={normalized}
          emptyMessage="No posts from this creator yet."
          linkAuthorProfile={false}
        />
      </section>
    </div>
  );
}
