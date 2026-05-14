import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { CreatorProfilePage } from "./pages/CreatorProfilePage";
import { DashboardPage } from "./pages/DashboardPage";
import { FeedPage } from "./pages/FeedPage";
import { LikedPostsPage } from "./pages/LikedPostsPage";
import { WalletPage } from "./pages/WalletPage";

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<FeedPage />} />
        <Route path="/liked" element={<LikedPostsPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/u/:address" element={<CreatorProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}
