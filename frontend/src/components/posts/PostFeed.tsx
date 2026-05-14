import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { apiErrorMessage, apiJson, authHeaders } from "../../lib/api";
import { resolveMediaUrl } from "../../lib/mediaUrl";
import { formatRelative } from "../../lib/format";
import type { PostDto } from "../../types/api";
import { PostAuthor } from "./PostAuthor";
import { TipControls } from "../tips/TipControls";
import { useAuth } from "../../context/AuthContext";
import { usePostLike } from "../../hooks/usePostLike";

const URL_IN_TEXT = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

function stripUrlTrailingPunct(s: string): string {
  return s.replace(/[.,;:!?)'"\]]+$/g, "");
}

function linkifyPostContent(text: string): ReactNode[] {
  const parts = text.split(URL_IN_TEXT);
  return parts.map((part, i) => {
    if (!part) return null;
    if (/^https?:\/\//i.test(part) || /^www\./i.test(part)) {
      const core = stripUrlTrailingPunct(part);
      const href = /^www\./i.test(core) ? `https://${core}` : core;
      return (
        <a
          key={`l${i}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="post-inline-link"
        >
          {core}
        </a>
      );
    }
    return <span key={`t${i}`}>{part}</span>;
  });
}

type Props = {
  onlyCreator?: string;
  reloadKey?: number;
  emptyMessage?: string;
  apiPath?: string;
  sort?: string;
  period?: string;
  /** When true, author name links to public profile */
  linkAuthorProfile?: boolean;
};

export function PostFeed({
  onlyCreator,
  reloadKey,
  emptyMessage,
  apiPath,
  sort,
  period,
  linkAuthorProfile = true,
}: Props) {
  const { token } = useAuth();
  const [posts, setPosts] = useState<PostDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const base = apiPath ?? "/posts";
      const params = new URLSearchParams();
      if (sort && sort !== "latest") params.set("sort", sort);
      if (period && period !== "all") params.set("period", period);
      const url = params.size > 0 ? `${base}?${params.toString()}` : base;

      const data = await apiJson<{ posts: PostDto[] }>(url, {
        headers: authHeaders(token),
      });
      const filtered = onlyCreator
        ? data.posts.filter(
            (p) => p.creatorAddress.toLowerCase() === onlyCreator.toLowerCase()
          )
        : data.posts;
      setPosts(filtered);
    } catch (e) {
      setErr(apiErrorMessage(e, "Failed to load posts"));
    } finally {
      setLoading(false);
    }
  }, [onlyCreator, token, apiPath, sort, period]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  if (loading) return <p className="muted feed-status">Loading posts…</p>;
  if (err) return <p className="error feed-status">{err}</p>;
  if (posts.length === 0) {
    return (
      <p className="muted feed-status">
        {emptyMessage ?? "No posts yet. Sign in and finish onboarding to publish the first one."}
      </p>
    );
  }

  return (
    <ul className="feed-list">
      {posts.map((p) => (
        <FeedItem
          key={p.id}
          post={p}
          token={token}
          linkAuthorProfile={linkAuthorProfile}
        />
      ))}
    </ul>
  );
}

function FeedItem({
  post,
  token,
  linkAuthorProfile,
}: {
  post: PostDto;
  token: string | null;
  linkAuthorProfile: boolean;
}) {
  const media = resolveMediaUrl(post.imageUrl);
  const { liked, likeCount, liking, toggleLike } = usePostLike(
    post.id,
    post.likedByMe,
    post.likeCount
  );
  const [tipOpen, setTipOpen] = useState(false);

  const toggleTip = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTipOpen((v) => !v);
  };

  const bodyText =
    post.content.length > 320
      ? `${post.content.slice(0, 320)}…`
      : post.content;

  return (
    <li className="feed-item">
      <div className="feed-item-content">
        <div className="feed-item-head">
          <div className="feed-item-author-slot">
            <PostAuthor address={post.creatorAddress} linkToProfile={linkAuthorProfile} />
          </div>
          <span className="feed-item-meta">
            <span className="feed-item-pid">#{post.onChainPostId}</span>
            <span aria-hidden> · </span>
            <time
              dateTime={post.createdAt}
              title={new Date(post.createdAt).toLocaleString()}
            >
              {formatRelative(post.createdAt)}
            </time>
          </span>
        </div>
        <p className="feed-item-body">{linkifyPostContent(bodyText)}</p>
        {media && (
          <div className="feed-item-media">
            <img src={media} alt="" loading="lazy" />
          </div>
        )}
      </div>

      <div className="feed-item-actions">
        <button
          type="button"
          className={`action-btn like-btn${liked ? " liked" : ""}`}
          onClick={toggleLike}
          aria-label={liked ? "Unlike" : "Like"}
          aria-pressed={liked}
          disabled={!token || liking}
        >
          <span className="action-icon">{liked ? "♥" : "♡"}</span>
          {likeCount > 0 && <span className="action-count">{likeCount}</span>}
          <span className="action-label">Like</span>
        </button>

        <button
          type="button"
          className={`action-btn tip-btn${tipOpen ? " active" : ""}`}
          onClick={toggleTip}
          aria-expanded={tipOpen}
        >
          <span className="action-icon">◎</span>
          <span className="action-label">Tip</span>
        </button>
      </div>

      {tipOpen && (
        <div className="feed-tip-drawer">
          <TipControls
            postId={post.id}
            creatorAddress={post.creatorAddress}
            onChainPostId={post.onChainPostId}
            onTipped={() => setTipOpen(false)}
          />
        </div>
      )}
    </li>
  );
}
