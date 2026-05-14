export type PublicUser = {
  id: string;
  walletAddress: string;
  username: string | null;
  avatarUrl: string | null;
  custodialWalletId: string | null;
  custodialWalletAddress: string | null;
  onboarding: {
    needsUsername: boolean;
    needsCustodialWallet: boolean;
  };
  onboardingComplete: boolean;
};

export type SessionUser = PublicUser & {
  createdAt?: string;
};

export type PostDto = {
  id: string;
  onChainPostId: number;
  creatorAddress: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
};
