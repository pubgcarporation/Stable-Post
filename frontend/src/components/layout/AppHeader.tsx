import { Link, NavLink, useLocation } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAuth } from "../../context/AuthContext";
import { shortenAddress } from "../../lib/format";
import { resolveMediaUrl } from "../../lib/mediaUrl";
import { HeaderWalletPill } from "./HeaderWalletPill";

export function AppHeader() {
  const { sessionReady, token, user } = useAuth();
  const { pathname } = useLocation();
  const showAppNav = !!(sessionReady && token && user?.onboardingComplete);

  const feedActive = pathname === "/";
  const dashboardActive = pathname === "/dashboard";

  const avatarSrc = resolveMediaUrl(user?.avatarUrl);

  return (
    <header className="app-header">
      <div className="header-inner">
        <div
          className={`header-top${showAppNav ? " header-top--authed" : ""}`}
        >
          <Link to="/" className="brand brand-block">
            <span className="brand-mark" aria-hidden />
            <span className="brand-text">
              <span className="brand-name">Stable Post</span>
              <span className="brand-tagline">
                Post &amp; earn in USDC on Arc
              </span>
            </span>
          </Link>
          <div className="header-trailing">
            {showAppNav && (
              <Link
                to="/dashboard"
                className={`user-chip${dashboardActive ? " user-chip--active" : ""}`}
                title={user.custodialWalletAddress ?? user.walletAddress}
              >
                {avatarSrc
                  ? <img src={avatarSrc} alt="" className="user-chip-avatar" />
                  : <div className="user-chip-avatar placeholder" aria-hidden />}
                <span className="user-chip-info">
                  <span className="user-chip-name">
                    {user.username?.trim() || shortenAddress(user.walletAddress, 6, 4)}
                  </span>
                  {user.custodialWalletAddress && (
                    <span className="user-chip-addr">
                      {shortenAddress(user.custodialWalletAddress, 5, 4)}
                    </span>
                  )}
                </span>
              </Link>
            )}
            {showAppNav && <HeaderWalletPill />}
            <div className="header-rk-connect">
              <ConnectButton showBalance={false} />
            </div>
          </div>
        </div>
        {showAppNav && (
          <nav className="header-nav" aria-label="Main">
            <div className="header-nav-tabs">
              <Link
                to="/"
                className={`nav-tab${feedActive ? " nav-tab-active" : ""}`}
                aria-current={feedActive ? "page" : undefined}
              >
                Feed
              </Link>
              <NavLink
                to="/liked"
                className={({ isActive }) =>
                  `nav-tab${isActive ? " nav-tab-active" : ""}`
                }
              >
                Liked
              </NavLink>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
