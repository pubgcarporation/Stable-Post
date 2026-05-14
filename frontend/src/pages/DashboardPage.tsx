import { useAuth } from "../context/AuthContext";
import { useIsOwner } from "../hooks/useStablePost";
import { SignInCard } from "../components/auth/SignInCard";
import { OnboardingCard } from "../components/onboarding/OnboardingCard";
import { ProfileSection } from "../components/profile/ProfileSection";
import { OwnerPanel } from "../components/admin/OwnerPanel";
import { PostFeed } from "../components/posts/PostFeed";

export function DashboardPage() {
  const { sessionReady, token, user } = useAuth();
  const isOwner = useIsOwner();

  if (!sessionReady) {
    return (
      <div className="page page--entry">
        <p className="muted feed-status">Loading…</p>
      </div>
    );
  }
  if (!token) {
    return (
      <div className="page page--entry">
        <SignInCard />
      </div>
    );
  }
  if (!user?.onboardingComplete) {
    return (
      <div className="page page--entry">
        <OnboardingCard />
      </div>
    );
  }

  return (
    <div className="page page--dashboard">
      <div className={`dash-grid${isOwner ? "" : " dash-grid--full"}`}>
        <div className="dash-main">
          <ProfileSection />
          {user?.walletAddress && (
            <section className="dash-posts-section">
              <h2 className="dash-posts-title">Your posts</h2>
              <PostFeed
                onlyCreator={user.walletAddress}
                emptyMessage="You haven't posted anything yet."
              />
            </section>
          )}
        </div>
        {isOwner && (
          <aside className="dash-side">
            <OwnerPanel />
          </aside>
        )}
      </div>
    </div>
  );
}
