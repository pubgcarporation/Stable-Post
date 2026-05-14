import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useAuth } from "../../context/AuthContext";

export function SignInCard() {
  const { isConnected } = useAccount();
  const { login, loading, error, clearError } = useAuth();

  return (
    <section className="section section-hero entry-hero">
      <p className="entry-eyebrow">Live on Arc Testnet</p>
      <h1 className="hero-title">
        Post ideas.
        <span>Earn USDC.</span>
      </h1>
      <p className="hero-sub muted">
        A creator-first social app where every post can become an on-chain
        earning moment. Connect your wallet, claim your name, and start sharing.
      </p>
      <div className="entry-highlights" aria-label="Stable Post highlights">
        <span>Creator tips</span>
        <span>USDC earnings</span>
        <span>Arc powered</span>
      </div>
      <ConnectButton.Custom>
        {({ account, chain, mounted, openChainModal, openConnectModal }) => {
          const connected = mounted && account && chain;
          if (!mounted) {
            return (
              <button type="button" className="btn-primary entry-cta" disabled>
                Loading wallet…
              </button>
            );
          }
          if (!connected) {
            return (
              <button type="button" className="btn-primary entry-cta" onClick={openConnectModal}>
                Start posting
              </button>
            );
          }
          if (chain.unsupported) {
            return (
              <button type="button" className="btn-primary entry-cta" onClick={openChainModal}>
                Switch network
              </button>
            );
          }
          return (
            <button
              type="button"
              className="btn-primary entry-cta"
              disabled={loading || !isConnected}
              onClick={() => void login()}
            >
              {loading ? "Signing…" : "Let's begin"}
            </button>
          );
        }}
      </ConnectButton.Custom>
      {isConnected && (
        <p className="entry-note muted small">
          One wallet signature, then choose your public username.
        </p>
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
