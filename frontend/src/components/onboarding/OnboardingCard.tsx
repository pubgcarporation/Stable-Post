import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { toast } from "../../context/ToastContext";
import { apiErrorMessage, apiFetch, authHeaders } from "../../lib/api";
import { getStoredToken } from "../../lib/authStorage";
import { USERNAME_RE } from "../../lib/constants";

export function OnboardingCard() {
  const {
    user,
    token,
    completeOnboarding,
    provisionCustodialWallet,
    refreshMe,
    loading,
    error,
    clearError,
  } = useAuth();
  const [username, setUsername] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!avatarFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  if (!user || user.onboardingComplete) return null;

  const busy = loading || submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const u = username.trim();
    if (!USERNAME_RE.test(u)) return;

    setSubmitting(true);
    try {
      const ok = await completeOnboarding(u);
      if (!ok) return;

      const t = token ?? getStoredToken();
      if (avatarFile && t) {
        try {
          const fd = new FormData();
          fd.append("image", avatarFile);
          const res = await apiFetch("/auth/avatar", {
            method: "POST",
            headers: authHeaders(t),
            body: fd,
          });
          const text = await res.text();
          if (!res.ok) {
            const j = text ? JSON.parse(text) : {};
            throw new Error(j.error ?? res.statusText);
          }
          await refreshMe();
          toast("Profile photo saved", "success");
        } catch (err) {
          toast(apiErrorMessage(err, "Could not upload photo"), "error");
        }
      }

      setUsername("");
      setAvatarFile(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="onboarding">
      <header className="onboarding-head">
        <h2 className="onboarding-title">Set up your profile</h2>
        <p className="onboarding-lead muted">
          Choose a username and an optional profile picture. You can change these later in your
          dashboard.
        </p>
      </header>

      {!user.username && (
        <form className="onboarding-form" onSubmit={(e) => void handleSubmit(e)}>
          <div className="onboarding-photo">
            <button
              type="button"
              className="onboarding-photo-pick"
              aria-label={previewUrl ? "Change profile photo" : "Add profile photo"}
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="" />
              ) : (
                <span aria-hidden>+</span>
              )}
            </button>
            <div className="onboarding-photo-meta">
              <span className="field-label">Profile photo</span>
              <span className="field-hint">Optional · up to 5MB</span>
              <div className="onboarding-photo-actions">
                <button
                  type="button"
                  className="link-inline"
                  disabled={busy}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {previewUrl ? "Change photo" : "Upload photo"}
                </button>
                {previewUrl && (
                  <button
                    type="button"
                    className="link-inline onboarding-photo-clear"
                    disabled={busy}
                    onClick={() => setAvatarFile(null)}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="onboarding-file"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setAvatarFile(f);
                e.target.value = "";
              }}
            />
          </div>

          <label className="field">
            <span className="field-label">Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your_name"
              autoComplete="username"
              disabled={busy}
            />
            <span className="field-hint">
              3–32 characters · letters, numbers, and underscores only
            </span>
          </label>

          <button
            type="submit"
            className="btn-primary onboarding-submit"
            disabled={busy || !USERNAME_RE.test(username.trim())}
          >
            {busy ? "Saving…" : "Continue"}
          </button>

          {user.onboarding.needsCustodialWallet && (
            <p className="field-hint onboarding-note">
              A custodial USDC wallet on Arc will be created when you continue, so you can receive
              tips and manage earnings.
            </p>
          )}
        </form>
      )}

      {user.onboarding.needsCustodialWallet && user.username && (
        <div className="onboarding-wallet">
          <p className="onboarding-wallet-title">Wallet setup needed</p>
          <p className="field-hint">
            Your username is saved, but the custodial wallet wasn&apos;t linked. Check Circle
            configuration, then try again.
          </p>
          <button
            type="button"
            className="btn-primary onboarding-submit"
            disabled={loading}
            onClick={() => void provisionCustodialWallet()}
          >
            {loading ? "Working…" : "Retry wallet setup"}
          </button>
        </div>
      )}

      {error && (
        <p className="status status-error" role="alert">
          {error}{" "}
          <button type="button" className="link-inline" onClick={clearError}>
            Dismiss
          </button>
        </p>
      )}
    </section>
  );
}
