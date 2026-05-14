import { Link, useLocation } from "react-router-dom";
import { useAccount } from "wagmi";
import { useAuth } from "../../context/AuthContext";
import {
  useCustodialUsdcBalance,
  useStablePostContract,
  useUsdcBalance,
  useUsdcMeta,
} from "../../hooks/useStablePost";
import { formatUsdc } from "../../lib/format";

export function HeaderWalletPill() {
  const { pathname } = useLocation();
  const { address } = useAccount();
  const { user } = useAuth();
  const contract = useStablePostContract();
  const { decimals } = useUsdcMeta();

  const custodial = user?.custodialWalletAddress;
  const { data: custodialRaw } = useCustodialUsdcBalance(custodial);
  const { data: extRaw } = useUsdcBalance(custodial ? undefined : address);

  if (!contract) return null;

  const raw = custodial ? custodialRaw : extRaw;
  const amt =
    raw !== undefined && decimals !== undefined
      ? formatUsdc(raw as bigint, decimals, { maxFractionDigits: 2 })
      : "—";

  const active = pathname === "/wallet";

  return (
    <Link
      to="/wallet"
      className={`header-wallet-pill${active ? " header-wallet-pill--active" : ""}`}
      title="USDC balance — open wallet"
    >
      <span className="header-wallet-pill-label">USDC:</span>
      <span className="header-wallet-pill-value">{amt}</span>
    </Link>
  );
}
