import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiErrorMessage, apiFetch, apiJson, authHeaders } from "../../lib/api";
import { USERNAME_RE } from "../../lib/constants";
import { resolveMediaUrl } from "../../lib/mediaUrl";
import { shortenAddress } from "../../lib/format";

export function ProfileSection() {
  const { token, user, refreshMe } = useAuth();
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  if (!token || !user?.onboardingComplete) return null;

  const startEdit = () => {
    setNote(null);
    setUsername(user.username ?? "");
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setUsername("");
    setNote(null);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setNote(null);
    const body: Record<string, unknown> = {};
    if (username.trim()) {
      if (!USERNAME_RE.test(username.trim())) {
        setNote("Username must be 3–32 chars (letters, numbers, underscore).");
        return;
      }
      body.username = username.trim();
    }
    if (Object.keys(body).length === 0) { setNote("Nothing to save."); return; }
    setBusy(true);
    try {
      await apiJson("/auth/profile", {
        method: "PATCH",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setUsername("");
      setEditing(false);
      await refreshMe();
      setNote("Saved.");
    } catch (e) {
      setNote(apiErrorMessage(e, "Update failed"));
    } finally {
      setBusy(false);
    }
  };

  const uploadAvatar = async (file: File | null) => {
    if (!file || !token || !editing) return;
    setNote(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await apiFetch("/auth/avatar", {
        method: "POST",
        headers: authHeaders(token),
        body: fd,
      });
      const text = await res.text();
      if (!res.ok) {
        const j = text ? JSON.parse(text) : {};
        throw new Error(j.error ?? res.statusText);
      }
      await refreshMe();
      setNote("Avatar updated.");
    } catch (e) {
      setNote(apiErrorMessage(e, "Upload failed"));
    } finally {
      setBusy(false);
    }
  };

  const avatarSrc = resolveMediaUrl(user.avatarUrl);
  const isOk = note === "Saved." || note === "Avatar updated.";

  return (
    <section className="prof-card">
      <div className="prof-card-actions">
        {editing ? (
          <button
            type="button"
            className="prof-cancel-btn"
            disabled={busy}
            onClick={cancelEdit}
          >
            Cancel
          </button>
        ) : (
          <button type="button" className="prof-edit-btn" onClick={startEdit}>
            Edit
          </button>
        )}
      </div>

      <div className="prof-head">
        {editing ? (
          <label className="prof-avatar-wrap" title="Click to change avatar">
            {avatarSrc
              ? <img src={avatarSrc} alt="" className="prof-avatar" />
              : <div className="prof-avatar prof-avatar--placeholder" aria-hidden />}
            <span className="prof-avatar-overlay" aria-hidden>📷</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={busy}
              className="prof-avatar-file"
              onChange={(e) => void uploadAvatar(e.target.files?.[0] ?? null)}
            />
          </label>
        ) : (
          <div className="prof-avatar-wrap prof-avatar-wrap--readonly">
            {avatarSrc
              ? <img src={avatarSrc} alt="" className="prof-avatar" />
              : <div className="prof-avatar prof-avatar--placeholder" aria-hidden />}
          </div>
        )}

        <div className="prof-identity">
          <p className="prof-name">{user.username ?? <span className="muted">No username</span>}</p>
          <p className="prof-addr" title={user.walletAddress}>
            {shortenAddress(user.walletAddress, 8, 6)}
          </p>
          {user.custodialWalletAddress && (
            <span className="prof-wallet-badge">
              <span className="prof-badge-dot" aria-hidden />
              Wallet active
            </span>
          )}
        </div>
      </div>

      {note && (
        <div className="prof-note-outer">
          <p className={`prof-note${isOk ? " ok" : " err"}`} role="status">
            {note}
          </p>
        </div>
      )}

      {editing && (
        <>
          <div className="prof-divider" />
          <form onSubmit={(e) => void saveProfile(e)} className="prof-form">
            <div className="prof-fields">
              <label className="prof-field">
                <span className="prof-field-label">Username</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={user.username ?? "Set a username…"}
                  className="prof-input"
                  autoComplete="username"
                />
              </label>
            </div>

            <div className="prof-form-foot">
              <button
                type="submit"
                className="btn-sm prof-save-btn"
                disabled={busy}
              >
                {busy ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </>
      )}
    </section>
  );
}
