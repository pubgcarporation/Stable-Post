import { useState } from "react";
import { parseUnits } from "viem";
import { apiErrorMessage, apiJson, authHeaders } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { toast } from "../../context/ToastContext";
import { useCustodialUsdcBalance, useUsdcMeta } from "../../hooks/useStablePost";
import { formatUsdc } from "../../lib/format";

const PRESETS = [1, 5, 10] as const;

function isSelfTipMessage(msg: string): boolean {
  return /cannot tip your own post/i.test(msg);
}

function isInsufficientFundsMessage(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes("insufficient fund") ||
    m.includes("insufficient balance") ||
    m.includes("exceeds balance") ||
    m.includes("transfer amount exceeds balance") ||
    m.includes("erc20: transfer amount exceeds balance") ||
    m.includes("balance too low") ||
    (m.includes("not enough") &&
      (m.includes("balance") || m.includes("fund") || m.includes("usdc")))
  );
}

type Props = {
  postId: string;
  creatorAddress: string;
  onChainPostId: number;
  onTipped?: () => void;
};

export function TipControls({ postId, creatorAddress, onChainPostId, onTipped }: Props) {
  const { token, user } = useAuth();
  const { decimals, symbol } = useUsdcMeta();
  const { data: custodialRaw, refetch: refetchCustodial } =
    useCustodialUsdcBalance(user?.custodialWalletAddress);

  const [amount, setAmount] = useState("1");
  const [busy, setBusy] = useState(false);

  const hasCustodial = !!user?.custodialWalletAddress && !!token;

  const custodialBalanceDisplay =
    custodialRaw !== undefined && decimals !== undefined
      ? formatUsdc(custodialRaw as bigint, decimals, { maxFractionDigits: 2, withSymbol: true })
      : null;

  const tip = async () => {
    if (!token || !user?.custodialWalletAddress) return;

    if (
      user.walletAddress &&
      creatorAddress.toLowerCase() === user.walletAddress.toLowerCase()
    ) {
      toast("You can't tip your own post.", "error");
      return;
    }

    if (decimals === undefined) {
      toast("Still loading USDC info — try again in a moment.", "info");
      return;
    }

    let amountWei: bigint;
    try {
      amountWei = parseUnits(amount.trim() || "0", decimals);
    } catch {
      toast("Enter a valid tip amount.", "error");
      return;
    }
    if (amountWei <= 0n) {
      toast("Enter a positive tip amount.", "error");
      return;
    }
    if (custodialRaw !== undefined && (custodialRaw as bigint) < amountWei) {
      toast("Not enough USDC in your custodial wallet for this tip.", "error");
      return;
    }

    setBusy(true);
    try {
      await apiJson<{ transactionId: string; state: string }>(
        "/wallet/circle/tip",
        {
          method: "POST",
          headers: { ...authHeaders(token), "Content-Type": "application/json" },
          body: JSON.stringify({ postId, amount }),
        }
      );
      toast("Tip submitted — processing on-chain.", "success");
      await refetchCustodial();
      onTipped?.();
    } catch (e) {
      const msg = apiErrorMessage(e, "Tip failed");
      if (isSelfTipMessage(msg)) {
        toast("You can't tip your own post.", "error");
      } else if (isInsufficientFundsMessage(msg)) {
        toast("Not enough USDC in your custodial wallet for this tip.", "error");
      } else {
        toast(msg, "error");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="tip-panel" aria-label={`Tip creator with ${symbol}`}>
      <div className="tip-panel-head">
        <h3 className="tip-panel-title">Tip creator</h3>
        <p className="tip-panel-sub muted small">
          {symbol} on Arc · Post #{onChainPostId}
        </p>
      </div>

      {!token ? (
        <p className="tip-hint muted small">Sign in to tip this creator.</p>
      ) : !hasCustodial ? (
        <p className="tip-hint muted small">
          Set up your wallet in the Dashboard to tip creators.
        </p>
      ) : (
        <>
          <div className="tip-presets" role="group" aria-label="Quick amounts">
            {PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                className={`tip-chip${amount === String(n) ? " tip-chip-active" : ""}`}
                onClick={() => setAmount(String(n))}
              >
                {n} {symbol}
              </button>
            ))}
          </div>

          <div className="tip-actions">
            <label className="tip-amount-field">
              <span className="tip-amount-label">Amount</span>
              <div className="tip-input-wrap">
                <input
                  type="text"
                  inputMode="decimal"
                  className="tip-input"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  aria-describedby="tip-hint"
                />
                <span className="tip-input-suffix">{symbol}</span>
              </div>
            </label>

            <button
              type="button"
              className="btn-tip"
              disabled={busy}
              onClick={() => void tip()}
            >
              {busy ? (
                <>
                  <span className="btn-tip-spinner" aria-hidden />
                  Submitting…
                </>
              ) : (
                <>
                  Tip
                  {custodialBalanceDisplay && (
                    <span className="tip-btn-bal">{custodialBalanceDisplay}</span>
                  )}
                </>
              )}
            </button>
          </div>

          <p id="tip-hint" className="tip-hint muted small">
            Tips are sent from your wallet. No browser confirmation needed.
          </p>
        </>
      )}
    </section>
  );
}
