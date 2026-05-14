import type { User } from "@prisma/client";

export function toPublicUser(
  user: User,
  opts?: { circleConfigured?: boolean }
) {
  const circleConfigured = opts?.circleConfigured ?? true;
  return {
    id: user.id,
    walletAddress: user.walletAddress,
    username: user.username,
    avatarUrl: user.avatarUrl,
    custodialWalletId: user.circleWalletId,
    custodialWalletAddress: user.circleWalletAddress,
    onboarding: {
      needsUsername: !user.username,
      needsCustodialWallet:
        circleConfigured && !user.circleWalletAddress,
    },
    onboardingComplete:
      !!user.username?.trim() &&
      (!circleConfigured || !!user.circleWalletAddress),
  };
}
