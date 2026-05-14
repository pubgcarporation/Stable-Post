import { useState } from "react";
import { erc20Abi, parseUnits, type Address } from "viem";
import { useAccount, useConfig, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { useArcChain } from "../hooks/useArcChain";
import {
  useCreatorBalance,
  useCustodialUsdcBalance,
  useStablePostContract,
  useUsdcBalance,
  useUsdcMeta,
} from "../hooks/useStablePost";
import { useAuth } from "../context/AuthContext";
import { toast } from "../context/ToastContext";
import { apiErrorMessage, apiJson, authHeaders } from "../lib/api";
import { walletTxnErrorMessage } from "../lib/txError";
import { arcTxExplorerUrl, shortenAddress } from "../lib/format";
import { stablePostAbi } from "../lib/stablePost";
import { EarningsChart } from "../components/wallet/EarningsChart";
import { SignInCard } from "../components/auth/SignInCard";
import { OnboardingCard } from "../components/onboarding/OnboardingCard";

type DepositTab = "address" | "direct";

export function WalletPage() {
  const config = useConfig();
  const { address } = useAccount();
  const { sessionReady, token, user } = useAuth();
  const contract = useStablePostContract();
  const { usdcAddress, decimals, symbol } = useUsdcMeta();
  const { isArc, ensureArc, isSwitching, chain } = useArcChain();
  const sessionCreator = user?.walletAddress as Address | undefined;
  const { data: rawBalance, refetch } = useCreatorBalance(sessionCreator);
  const { data: custodialRaw, refetch: refetchCustodial } =
    useCustodialUsdcBalance(user?.custodialWalletAddress);
  const { data: extUsdcRaw } = useUsdcBalance(address);
  const { writeContractAsync, isPending } = useWriteContract();
  const { writeContractAsync: writeDirectDeposit, isPending: directPending } = useWriteContract();

  const walletMatchesSession =
    !!address &&
    !!user?.walletAddress &&
    address.toLowerCase() === user.walletAddress.toLowerCase();

  const [depositTab, setDepositTab] = useState<DepositTab>("address");
  const [copied, setCopied] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawTo, setWithdrawTo] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [custodialBusy, setCustodialBusy] = useState(false);
  const [custodialStatus, setCustodialStatus] = useState<string | null>(null);
  const [depositStatus, setDepositStatus] = useState<string | null>(null);
  const [depositTxHash, setDepositTxHash] = useState<string | null>(null);
  const [earningsStatus, setEarningsStatus] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  if (!sessionReady) {
    return (
      <div className="page page--entry">
        <p className="muted feed-status">Loading…</p>
      </div>
    );
  }
  if (!token) {
    return <div className="page page--entry"><SignInCard /></div>;
  }
  if (!user?.onboardingComplete) {
    return <div className="page page--entry"><OnboardingCard /></div>;
  }
  if (!contract) {
    return (
      <div className="page">
        <p className="muted feed-status">
          Set <code>VITE_STABLEPOST_ADDRESS</code> to enable on-chain features.
        </p>
      </div>
    );
  }

  const custodialNum =
    decimals !== undefined && custodialRaw !== undefined
      ? Number(custodialRaw as bigint) / 10 ** decimals
      : undefined;

  const custodialDisplay =
    custodialNum !== undefined
      ? `${custodialNum.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${symbol}`
      : "…";

  const custodialMaxAmount =
    custodialNum !== undefined
      ? custodialNum.toFixed(6).replace(/\.?0+$/, "")
      : "";

  const earningsNum =
    decimals !== undefined && typeof rawBalance === "bigint"
      ? Number(rawBalance as bigint) / 10 ** decimals
      : undefined;

  const earningsDisplay =
    earningsNum !== undefined
      ? `${earningsNum.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${symbol}`
      : "…";

  const extUsdcNum =
    decimals !== undefined && extUsdcRaw !== undefined
      ? Number(extUsdcRaw as bigint) / 10 ** decimals
      : undefined;

  const extUsdcDisplay =
    extUsdcNum !== undefined
      ? `${extUsdcNum.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${symbol}`
      : null;

  const extUsdcMax =
    extUsdcNum !== undefined
      ? extUsdcNum.toFixed(6).replace(/\.?0+$/, "")
      : "";

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const directDeposit = async () => {
    if (!address || !usdcAddress || !user?.custodialWalletAddress || decimals === undefined) {
      setDepositStatus("Wallet not ready — make sure the contract is loaded.");
      return;
    }
    if (user.walletAddress.toLowerCase() !== address.toLowerCase()) {
      setDepositStatus("Connect the wallet you signed in with (same address as your profile).");
      return;
    }
    const amt = depositAmount.trim();
    if (!amt || isNaN(Number(amt)) || Number(amt) <= 0) {
      setDepositStatus("Enter a valid amount.");
      return;
    }
    setDepositStatus(null);
    setDepositTxHash(null);
    try {
      await ensureArc();
      const wei = parseUnits(amt, decimals);
      const hash = await writeDirectDeposit({
        address: usdcAddress,
        abi: erc20Abi,
        functionName: "transfer",
        args: [user.custodialWalletAddress as Address, wei],
      });
      setDepositTxHash(hash);
      setDepositStatus("Confirming on-chain…");
      await waitForTransactionReceipt(config, { hash });
      setDepositStatus("Confirmed — updating balance…");
      setDepositAmount("");
      await delay(2000);
      await refetchCustodial();
      setDepositStatus("Deposited successfully.");
      toast("Deposit confirmed", "success");
      await delay(5000);
      await refetchCustodial();
    } catch (e) {
      const msg = walletTxnErrorMessage(e, "Deposit failed");
      if (/rejected|denied|user rejected|cancell?ed/i.test(msg)) {
        setDepositStatus("Transaction cancelled.");
        return;
      }
      setDepositStatus(msg);
    }
  };

  const copyAddress = async () => {
    if (!user?.custodialWalletAddress) return;
    await navigator.clipboard.writeText(user.custodialWalletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const withdrawFromCustodial = async () => {
    if (!token || !user?.custodialWalletAddress) return;
    const amt = withdrawAmount.trim() || custodialMaxAmount;
    if (!amt || isNaN(Number(amt)) || Number(amt) <= 0) {
      setCustodialStatus("Enter a valid amount.");
      return;
    }
    setCustodialBusy(true);
    setCustodialStatus(null);
    try {
      const dest = withdrawTo.trim() || undefined;
      await apiJson<{ transactionId: string; state: string }>("/wallet/circle/withdraw", {
        method: "POST",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, ...(dest ? { toAddress: dest } : {}) }),
      });
      setCustodialStatus("Submitted — processing on-chain.");
      toast("Withdrawal submitted", "info");
      setWithdrawAmount("");
      setWithdrawTo("");
      await refetchCustodial();
    } catch (e) {
      setCustodialStatus(apiErrorMessage(e, "Withdrawal failed"));
    } finally {
      setCustodialBusy(false);
    }
  };

  const withdrawEarnings = async () => {
    if (!address || !user?.walletAddress) {
      setEarningsStatus("Connect your wallet to withdraw earnings.");
      return;
    }
    if (address.toLowerCase() !== user.walletAddress.toLowerCase()) {
      setEarningsStatus("Connect the wallet you signed in with to withdraw (profile address must match).");
      return;
    }
    setEarningsStatus(null);
    setTxHash(null);
    try {
      await ensureArc();
      const hash = await writeContractAsync({
        address: contract,
        abi: stablePostAbi,
        functionName: "withdraw",
      });
      setTxHash(hash);
      setEarningsStatus("Confirming…");
      await waitForTransactionReceipt(config, { hash });
      setEarningsStatus("Withdrawn to your connected wallet.");
      toast("Creator earnings withdrawn", "success");
      await refetch();
    } catch (e) {
      const msg = walletTxnErrorMessage(e, "Withdrawal failed");
      if (/rejected|denied|user rejected|cancell?ed/i.test(msg)) {
        setEarningsStatus("Transaction cancelled.");
        return;
      }
      setEarningsStatus(msg);
    }
  };

  const hasEarnings = typeof rawBalance === "bigint" && (rawBalance as bigint) > 0n;

  return (
    <div className="page page--wallet">
      <header className="wallet-page-head">
        <h1 className="wallet-page-title">Wallet</h1>
        <p className="wallet-page-sub muted">
          Custodial balance, deposits, and on-chain creator earnings on Arc.
        </p>
      </header>

      <div className="wlt-hero">
        <div className="wlt-hero-inner">
          <span className="wlt-hero-label">Wallet Balance</span>
          <div className="wlt-hero-balance">{custodialDisplay}</div>
          <a
            href="https://faucet.circle.com/"
            target="_blank"
            rel="noreferrer"
            className="wlt-faucet-link"
          >
            Testnet faucet <span className="wlt-faucet-arrow" aria-hidden>→</span>
          </a>
          {user?.custodialWalletAddress && (
            <div className="wlt-hero-addr">
              <span>{shortenAddress(user.custodialWalletAddress, 10, 8)}</span>
              <button type="button" className="wlt-hero-copy" onClick={() => void copyAddress()}>
                {copied ? "✓ Copied" : "Copy address"}
              </button>
            </div>
          )}
        </div>
        <div className="wlt-hero-earnings">
          <span className="wlt-hero-earnings-label">Creator earnings</span>
          <span className="wlt-hero-earnings-val">{earningsDisplay}</span>
        </div>
      </div>

      <div className="wlt-alert-stack" aria-live="polite">
        {!address && (
          <p className="wlt-alert wlt-alert--info" role="status">
            Connect this browser wallet (the same address you used to sign in) to deposit from it and to withdraw creator earnings on-chain.
          </p>
        )}

        {address && user?.walletAddress && !walletMatchesSession && (
          <p className="wlt-alert wlt-alert--danger" role="alert">
            This wallet does not match your account. Connect{" "}
            <strong className="mono">{shortenAddress(user.walletAddress, 6, 4)}</strong> or sign in again.
          </p>
        )}

        {walletMatchesSession && !isArc && (
          <div className="wlt-alert wlt-alert--warning wlt-alert--split" role="status">
            <span>
              Switch to <strong>{chain.name}</strong> to use {symbol} and the app contract.
            </span>
            <button
              type="button"
              className="wlt-chain-switch"
              disabled={isSwitching}
              onClick={() => void ensureArc().catch(() => undefined)}
            >
              {isSwitching ? "…" : `Switch network`}
            </button>
          </div>
        )}

      </div>

      <div className="wallet-grid">

        <div className="wallet-main">

          {user?.custodialWalletAddress ? (
            <>
              <section className="wlt-card">
                <div className="wlt-card-title">
                  <span className="wlt-card-icon">↓</span>
                  Deposit
                </div>

                <div className="wlt-tabs">
                  <button
                    className={`wlt-tab${depositTab === "address" ? " active" : ""}`}
                    onClick={() => setDepositTab("address")}
                  >
                    Send to address
                  </button>
                  <button
                    className={`wlt-tab${depositTab === "direct" ? " active" : ""}`}
                    onClick={() => setDepositTab("direct")}
                  >
                    From connected wallet
                  </button>
                </div>

                {depositTab === "address" && (
                  <div className="wlt-section">
                    <p className="wlt-hint">Send {symbol} on Arc Testnet to your custodial address below.</p>
                    <div className="wlt-addr-box">
                      <code className="wlt-addr-text">{user.custodialWalletAddress}</code>
                      <button
                        type="button"
                        className="wlt-addr-copy"
                        onClick={() => void copyAddress()}
                      >
                        {copied ? "✓" : "Copy"}
                      </button>
                    </div>
                  </div>
                )}

                {depositTab === "direct" && (
                  <div className="wlt-section">
                    {extUsdcDisplay ? (
                      <p className="wlt-hint">
                        Available in connected wallet: <strong>{extUsdcDisplay}</strong>
                      </p>
                    ) : (
                      <p className="wlt-hint muted">Connect your browser wallet to deposit directly.</p>
                    )}
                    <div className="wlt-input-row">
                      <div className="wlt-input-wrap">
                        <input
                          type="text"
                          inputMode="decimal"
                          className="wlt-input"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          placeholder="0.00"
                          disabled={!address}
                        />
                        <span className="wlt-input-sym">{symbol}</span>
                      </div>
                      {extUsdcMax && (
                        <button
                          type="button"
                          className="wlt-max-btn"
                          onClick={() => setDepositAmount(extUsdcMax)}
                        >
                          Max
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      className="wlt-action-btn"
                      disabled={
                        directPending ||
                        !address ||
                        !depositAmount ||
                        !walletMatchesSession
                      }
                      onClick={() => void directDeposit()}
                    >
                      {directPending
                        ? <><span className="btn-tip-spinner" aria-hidden /> Confirm in wallet…</>
                        : "Deposit"}
                    </button>
                    {depositStatus && (
                      <p className={`wlt-status${depositStatus.startsWith("Deposited") ? " ok" : depositStatus.startsWith("Enter") || depositStatus.startsWith("Wallet") || depositStatus.toLowerCase().includes("failed") ? " err" : ""}`}>
                        {depositStatus}
                        {depositTxHash && (
                          <> · <a href={arcTxExplorerUrl(depositTxHash)} target="_blank" rel="noreferrer">view tx ↗</a></>
                        )}
                      </p>
                    )}
                  </div>
                )}
              </section>

              <section className="wlt-card">
                <div className="wlt-card-title">
                  <span className="wlt-card-icon">↑</span>
                  Withdraw
                </div>
                <div className="wlt-section">
                  <p className="wlt-hint">Withdraw {symbol} from your custodial wallet to any address.</p>
                  <div className="wlt-input-row">
                    <div className="wlt-input-wrap">
                      <input
                        type="text"
                        inputMode="decimal"
                        className="wlt-input"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder={custodialMaxAmount || "0.00"}
                      />
                      <span className="wlt-input-sym">{symbol}</span>
                    </div>
                    {custodialMaxAmount && (
                      <button
                        type="button"
                        className="wlt-max-btn"
                        onClick={() => setWithdrawAmount(custodialMaxAmount)}
                      >
                        Max
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    className="wlt-input wlt-addr-input"
                    value={withdrawTo}
                    onChange={(e) => setWithdrawTo(e.target.value)}
                    placeholder={`Destination (default: ${user.walletAddress.slice(0, 10)}…)`}
                  />
                  <button
                    type="button"
                    className="wlt-action-btn"
                    disabled={custodialBusy}
                    onClick={() => void withdrawFromCustodial()}
                  >
                    {custodialBusy
                      ? <><span className="btn-tip-spinner" aria-hidden /> Submitting…</>
                      : "Withdraw"}
                  </button>
                  {custodialStatus && (
                    <p className={`wlt-status${custodialStatus.startsWith("Submitted") ? " ok" : custodialStatus.startsWith("Enter") || custodialStatus.toLowerCase().includes("failed") ? " err" : ""}`}>
                      {custodialStatus}
                    </p>
                  )}
                </div>
              </section>
            </>
          ) : (
            <section className="wlt-card wlt-card--empty">
              <p className="wlt-hint">No custodial wallet yet. Complete onboarding on the Dashboard to activate tipping and deposits.</p>
            </section>
          )}
        </div>

        <div className="wallet-side">
          <EarningsChart />

          <section className="wlt-card wlt-card--earnings">
            <div className="wlt-card-title">
              <span className="wlt-card-icon">✦</span>
              Creator Earnings
              <span className="wlt-earnings-badge">{earningsDisplay}</span>
            </div>
            <div className="wlt-section">
              <p className="wlt-hint">On-chain tips paid to you by other users. Withdraw anytime to your connected wallet.</p>
              <button
                type="button"
                className="wlt-action-btn wlt-action-btn--earnings"
                disabled={
                  !hasEarnings ||
                  isPending ||
                  !address ||
                  !walletMatchesSession
                }
                onClick={() => void withdrawEarnings()}
              >
                {isPending ? "Confirm in wallet…" : "Withdraw earnings"}
              </button>
              {earningsStatus && (
                <p className={`wlt-status${earningsStatus.includes("Withdrawn") ? " ok" : earningsStatus.toLowerCase().includes("failed") ? " err" : ""}`}>
                  {earningsStatus}
                  {txHash && (
                    <> · <a href={arcTxExplorerUrl(txHash)} target="_blank" rel="noreferrer">view tx ↗</a></>
                  )}
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
