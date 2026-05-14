const FOOTER_LINKS = [
  { label: "Docs", href: "https://docs.arc.network" },
  { label: "ArcScan", href: "https://testnet.arcscan.app" },
  { label: "Faucet", href: "https://faucet.circle.com/" },
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-line">
          <span className="site-footer-powered">
            Powered by{" "}
            <a
              className="site-footer-link site-footer-link--brand"
              href="https://arc.network"
              target="_blank"
              rel="noopener noreferrer"
            >
              Arc
            </a>
          </span>
          <span className="site-footer-dot" aria-hidden>
            ·
          </span>
          <nav className="site-footer-links" aria-label="Arc resources">
            {FOOTER_LINKS.map(({ label, href }) => (
              <a
                key={href}
                className="site-footer-link"
                href={href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
