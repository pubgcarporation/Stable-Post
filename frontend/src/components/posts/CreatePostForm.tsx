import { useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiErrorMessage, apiFetch, apiJson, authHeaders } from "../../lib/api";
import { MAX_POST_CONTENT_LENGTH } from "../../lib/constants";
import type { PostDto } from "../../types/api";

type Props = {
  onCreated?: () => void;
};

export function CreatePostForm({ onCreated }: Props) {
  const { token, user } = useAuth();
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!token || !user?.onboardingComplete) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!content.trim()) return;
    if (content.length > MAX_POST_CONTENT_LENGTH) {
      setMsg(`Content too long (max ${MAX_POST_CONTENT_LENGTH} characters).`);
      return;
    }
    setBusy(true);
    try {
      let imageUrl: string | undefined;

      if (imageFile) {
        const fd = new FormData();
        fd.append("image", imageFile);
        const res = await apiFetch("/posts/image", {
          method: "POST",
          headers: authHeaders(token),
          body: fd,
        });
        const text = await res.text();
        if (!res.ok) {
          const j = text ? (JSON.parse(text) as { error?: string }) : {};
          throw new Error(j.error ?? res.statusText);
        }
        const data = JSON.parse(text) as { imageUrl: string };
        imageUrl = data.imageUrl;
      }

      await apiJson<{ post: PostDto }>("/posts", {
        method: "POST",
        headers: {
          ...authHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: content.trim(),
          imageUrl,
        }),
      });

      setContent("");
      removeImage();
      onCreated?.();
      setMsg("Posted.");
    } catch (e) {
      setMsg(apiErrorMessage(e, "Could not create post"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section section-composer">
      <h2 className="section-title section-title-soft">New post</h2>
      <form onSubmit={submit} className="composer composer-open">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
          required
          maxLength={MAX_POST_CONTENT_LENGTH}
          placeholder="What's happening?"
          className="composer-textarea"
        />

        {imagePreview ? (
          <div className="composer-img-preview">
            <img src={imagePreview} alt="preview" />
            <button
              type="button"
              className="composer-img-remove"
              onClick={removeImage}
              aria-label="Remove image"
            >
              ✕
            </button>
          </div>
        ) : (
          <label className="composer-img-label">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="composer-img-input"
              onChange={handleFileChange}
              disabled={busy}
            />
            <span className="composer-img-placeholder">
              <span className="composer-img-icon">🖼</span>
              <span>Attach image (optional)</span>
            </span>
          </label>
        )}

        <div className="composer-foot">
          <span className="muted small">
            {content.length}/{MAX_POST_CONTENT_LENGTH}
          </span>
          <button
            type="submit"
            className="btn-primary"
            disabled={busy || !content.trim()}
          >
            {busy ? "Publishing…" : "Publish"}
          </button>
        </div>
      </form>
      {msg && (
        <p className={msg === "Posted." ? "status status-success" : "status"}>
          {msg}
        </p>
      )}
    </section>
  );
}
