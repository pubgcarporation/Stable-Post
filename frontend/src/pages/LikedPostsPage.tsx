import { useAuth } from "../context/AuthContext";
import { PostFeed } from "../components/posts/PostFeed";
import { SignInCard } from "../components/auth/SignInCard";
import { OnboardingCard } from "../components/onboarding/OnboardingCard";

export function LikedPostsPage() {
  const { sessionReady, token, user } = useAuth();

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
    <div className="page">
      <section className="section">
        <h2 className="section-title liked-page-title">
          <span className="liked-heart" aria-hidden>♥</span>
          Liked posts
        </h2>
      </section>
      <PostFeed
        apiPath="/posts/liked"
        emptyMessage="You haven't liked any posts yet."
      />
    </div>
  );
}
