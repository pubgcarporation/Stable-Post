import { useCallback, useEffect, useState } from "react";
import { apiJson, authHeaders } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function usePostLike(
  postId: string,
  initialLiked: boolean,
  initialCount: number
) {
  const { token } = useAuth();
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialCount);
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    setLiked(initialLiked);
    setLikeCount(initialCount);
  }, [postId, initialLiked, initialCount]);

  const toggleLike = useCallback(async () => {
    if (!token || liking) return;

    setLiking(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => (wasLiked ? c - 1 : c + 1));

    try {
      const result = await apiJson<{ likeCount: number; likedByMe: boolean }>(
        `/posts/${postId}/like`,
        {
          method: wasLiked ? "DELETE" : "POST",
          headers: authHeaders(token),
        }
      );
      setLikeCount(result.likeCount);
      setLiked(result.likedByMe);
    } catch {
      setLiked(wasLiked);
      setLikeCount((c) => (wasLiked ? c + 1 : c - 1));
    } finally {
      setLiking(false);
    }
  }, [token, liking, liked, postId]);

  return { liked, likeCount, liking, toggleLike };
}
