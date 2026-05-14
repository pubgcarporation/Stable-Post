import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { SignInCard } from "../components/auth/SignInCard";
import { OnboardingCard } from "../components/onboarding/OnboardingCard";
import { PostFeed } from "../components/posts/PostFeed";
import { CreatePostForm } from "../components/posts/CreatePostForm";

const SORT_TABS = [
  { id: "latest", label: "Latest" },
  { id: "liked", label: "Most Liked" },
  { id: "tipped", label: "Most Tipped" },
] as const;

const PERIOD_CHIPS = [
  { id: "all", label: "All time" },
  { id: "day", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
] as const;

type SortId = (typeof SORT_TABS)[number]["id"];
type PeriodId = (typeof PERIOD_CHIPS)[number]["id"];

export function FeedPage() {
  const { sessionReady, token, user } = useAuth();
  const [reloadKey, setReloadKey] = useState(0);
  const [sort, setSort] = useState<SortId>("latest");
  const [period, setPeriod] = useState<PeriodId>("all");

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
    <div className="page page--feed">
      <div className="feed-grid-main feed-grid-main--compact">
        <CreatePostForm onCreated={() => setReloadKey((k) => k + 1)} />

        <section className="feed">
          <div className="feed-controls">
            <div className="feed-sort-tabs" role="tablist" aria-label="Sort posts">
              {SORT_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={sort === tab.id}
                  className={`feed-sort-tab${sort === tab.id ? " feed-sort-tab-active" : ""}`}
                  onClick={() => setSort(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="feed-period-chips" role="group" aria-label="Filter by time">
              {PERIOD_CHIPS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  className={`period-chip${period === chip.id ? " period-chip-active" : ""}`}
                  onClick={() => setPeriod(chip.id)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          <PostFeed reloadKey={reloadKey} sort={sort} period={period} />
        </section>
      </div>
    </div>
  );
}
