import { useState } from "react";
import { isAddress, type Address } from "viem";
import { useConfig, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import {
  useIsOwner,
  useProtocolStats,
  useStablePostContract,
  useUsdcMeta,
} from "../../hooks/useStablePost";
import { apiErrorMessage } from "../../lib/api";
import { arcTxExplorerUrl, formatUsdc } from "../../lib/format";
import { stablePostAbi } from "../../lib/stablePost";
import { useArcChain } from "../../hooks/useArcChain";
import { toast } from "../../context/ToastContext";

export function OwnerPanel() {
  const isOwner = useIsOwner();
  const config = useConfig();
  const contract = useStablePostContract();
  const { decimals, symbol } = useUsdcMeta();
  const { platformFeeBps, platformFeesCollected, refetch } = useProtocolStats();
  const { writeContractAsync, isPending } = useWriteContract();
  const { ensureArc, isArc, isSwitching, chain } = useArcChain();

  const [feeBps, setFeeBps] = useState("");
  const [payoutTo, setPayoutTo] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  if (!isOwner || !contract) return null;

  const currentFeePct =
    platformFeeBps !== undefined
      ? (Number(platformFeeBps) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })
      : "—";

  const collected =
    platformFeesCollected !== undefined && decimals !== undefined
      ? formatUsdc(platformFeesCollected, decimals, { withSymbol: true })
      : "…";

  const setFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setTxHash(null);
    const n = Number(feeBps);
    if (!Number.isInteger(n) || n < 0 || n > 1000) {
      setStatus("Fee must be an integer 0–1000 bps.");
      return;
    }
    try {
      await ensureArc();
      const hash = await writeContractAsync({
        address: contract,
        abi: stablePostAbi,
        functionName: "setPlatformFee",
        args: [BigInt(n)],
      });
      setTxHash(hash);
      setStatus("Updating fee…");
      await waitForTransactionReceipt(config, { hash });
      setStatus("Fee updated.");
      setFeeBps("");
      await refetch();
      toast("Platform fee updated", "success");
    } catch (e) {
      setStatus(apiErrorMessage(e, "Failed"));
    }
  };

  const collect = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setTxHash(null);
    if (!isAddress(payoutTo)) { setStatus("Invalid payout address."); return; }
    if (platformFeesCollected === undefined || platformFeesCollected === 0n) {
      setStatus("No platform fees accrued on the contract yet.");
      return;
    }
    try {
      await ensureArc();
      const hash = await writeContractAsync({
        address: contract,
        abi: stablePostAbi,
        functionName: "withdrawPlatformFees",
        args: [payoutTo as Address],
      });
      setTxHash(hash);
      setStatus("Withdrawing…");
      await waitForTransactionReceipt(config, { hash });
      setStatus("Platform fees withdrawn.");
      setPayoutTo("");
      await refetch();
      toast("Platform fees withdrawn", "success");
    } catch (e) {
      setStatus(apiErrorMessage(e, "Failed"));
    }
  };

  return (
    <section className="dash-card dash-card-owner">
      <div className="dash-card-head">
        <div>
          <p className="dash-card-label">Platform earnings</p>
          <p className="dash-balance-big">{collected}</p>
        </div>
        <span className="dash-owner-badge">Owner</span>
      </div>

      <div className="dash-card-divider" />

      <div className="dash-card-body">
        {!isArc && (
          <p className="dash-note" style={{ marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <span>Switch wallet network to <strong>{chain.name}</strong> to manage the contract.</span>
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={isSwitching}
              onClick={() => void ensureArc().catch(() => undefined)}
            >
              {isSwitching ? "…" : `Switch to ${chain.name}`}
            </button>
          </p>
        )}
        <p className="dash-sub-label">
          Platform fee <span className="dash-sub-value">{currentFeePct}%</span>
        </p>
        <form onSubmit={setFee} className="dash-inline-form">
          <input
            className="dash-input"
            inputMode="numeric"
            value={feeBps}
            onChange={(e) => setFeeBps(e.target.value)}
            placeholder="New fee in bps (e.g. 200 = 2%)"
          />
          <button type="submit" className="btn-ghost-sm" disabled={isPending || !feeBps}>
            {isPending ? "…" : "Update"}
          </button>
        </form>

        <div className="dash-card-divider" style={{ marginTop: 4 }} />

        <p className="dash-sub-label" style={{ marginTop: 4 }}>Withdraw fees to</p>
        <form onSubmit={collect} className="dash-inline-form">
          <input
            className="dash-input"
            value={payoutTo}
            onChange={(e) => setPayoutTo(e.target.value)}
            placeholder={`Payout address (${symbol})`}
          />
          <button
            type="submit"
            className="btn-primary btn-sm"
            disabled={
              isPending ||
              !payoutTo ||
              platformFeesCollected === undefined ||
              platformFeesCollected === 0n
            }
          >
            {isPending ? "…" : "Withdraw"}
          </button>
        </form>

        {status && (
          <p
            className={`dash-note${
              /Fee updated|Platform fees withdrawn/.test(status)
                ? " dash-note-ok"
                : /^(Failed|Invalid)/.test(status) || /Fee must be an integer|Invalid payout/.test(status)
                  ? " dash-note-err"
                  : ""
            }`}
            role="status"
          >
            {status}
            {txHash && (
              <> <a href={arcTxExplorerUrl(txHash)} target="_blank" rel="noreferrer" className="link-inline">view tx</a></>
            )}
          </p>
        )}
      </div>
    </section>
  );
}
