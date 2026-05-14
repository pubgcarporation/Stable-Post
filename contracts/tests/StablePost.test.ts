import { expect } from "chai";
import type { Signer } from "ethers";
import { network } from "hardhat";
import type { MockERC20, StablePost } from "../types/ethers-contracts/index.js";

const { ethers, networkHelpers } = await network.create();

describe("StablePost", function () {
  const BPS_DENOMINATOR = 10_000n;
  const DEFAULT_PLATFORM_FEE_BPS = 200n;
  const MAX_FEE_BPS = 1000n;

  const amount = 1_000_000n;
  const fee = (amount * DEFAULT_PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
  const creatorNet = amount - fee;

  async function deployFixture(): Promise<{
    stablePost: StablePost;
    usdc: MockERC20;
    owner: Signer;
    tipper: Signer;
    creator: Signer;
    treasury: Signer;
  }> {
    const [owner, tipper, creator, treasury] = await ethers.getSigners();
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20Factory.deploy();
    const StablePostFactory = await ethers.getContractFactory("StablePost");
    const stablePost = await StablePostFactory.deploy(await usdc.getAddress());
    return { stablePost, usdc, owner, tipper, creator, treasury };
  }

  async function fundApproved(
    usdc: MockERC20,
    stablePost: StablePost,
    tipper: Signer,
    amt: bigint
  ) {
    const contractAddr = await stablePost.getAddress();
    const tipperAddr = await tipper.getAddress();
    await usdc.mint(tipperAddr, amt);
    await usdc.connect(tipper).approve(contractAddr, amt);
  }

  async function tipOnce(
    stablePost: StablePost,
    usdc: MockERC20,
    tipper: Signer,
    creator: Signer
  ) {
    await fundApproved(usdc, stablePost, tipper, amount);
    await stablePost
      .connect(tipper)
      .tipCreator(await creator.getAddress(), 1n, amount);
  }

  it("constructor: reverts if USDC is zero address", async function () {
    const f = await ethers.getContractFactory("StablePost");
    await expect(f.deploy(ethers.ZeroAddress)).to.be.revertedWith("invalid usdc");
  });

  it("tipCreator: pulls USDC, credits creator and post, accrues platform fee, increments totals, emits Tipped", async function () {
    const { stablePost, usdc, tipper, creator } = await networkHelpers.loadFixture(
      deployFixture
    );
    const contractAddr = await stablePost.getAddress();
    const tipperAddr = await tipper.getAddress();
    const creatorAddr = await creator.getAddress();
    const postId = 42n;
    await fundApproved(usdc, stablePost, tipper, amount);

    await expect(
      stablePost.connect(tipper).tipCreator(creatorAddr, postId, amount)
    )
      .to.emit(stablePost, "Tipped")
      .withArgs(tipperAddr, creatorAddr, postId, creatorNet, fee);

    expect(await stablePost.usdc()).to.equal(await usdc.getAddress());
    expect(await stablePost.platformFee()).to.equal(DEFAULT_PLATFORM_FEE_BPS);
    expect(await stablePost.creatorBalances(creatorAddr)).to.equal(creatorNet);
    expect(await stablePost.postEarnings(postId)).to.equal(creatorNet);
    expect(await stablePost.platformFeesCollected()).to.equal(fee);
    expect(await stablePost.totalTips()).to.equal(1n);
    expect(await stablePost.totalVolume()).to.equal(amount);
    expect(await usdc.balanceOf(contractAddr)).to.equal(amount);
  });

  it("tipCreator: reverts on amount 0, zero creator, or self-tip", async function () {
    const { stablePost, usdc, tipper, creator } = await networkHelpers.loadFixture(
      deployFixture
    );
    const creatorAddr = await creator.getAddress();
    const tipperAddr = await tipper.getAddress();
    await fundApproved(usdc, stablePost, tipper, amount);

    await expect(
      stablePost.connect(tipper).tipCreator(creatorAddr, 1n, 0n)
    ).to.be.revertedWith("amount = 0");

    await expect(
      stablePost
        .connect(tipper)
        .tipCreator(ethers.ZeroAddress, 1n, amount)
    ).to.be.revertedWith("bad creator");

    await expect(
      stablePost.connect(tipper).tipCreator(tipperAddr, 1n, amount)
    ).to.be.revertedWith("self tip");
  });

  it("withdraw: transfers credited USDC and emits Withdrawn; reverts with no balance", async function () {
    const { stablePost, usdc, tipper, creator } = await networkHelpers.loadFixture(
      deployFixture
    );
    const creatorAddr = await creator.getAddress();

    await expect(stablePost.connect(creator).withdraw()).to.be.revertedWith(
      "no balance"
    );

    await tipOnce(stablePost, usdc, tipper, creator);

    await expect(stablePost.connect(creator).withdraw())
      .to.emit(stablePost, "Withdrawn")
      .withArgs(creatorAddr, creatorNet);

    expect(await stablePost.creatorBalances(creatorAddr)).to.equal(0n);
    expect(await usdc.balanceOf(creatorAddr)).to.equal(creatorNet);
  });

  it("withdrawPlatformFees: only owner; rejects zero recipient; transfers accrued fees", async function () {
    const { stablePost, usdc, tipper, creator, treasury, owner } =
      await networkHelpers.loadFixture(deployFixture);
    await tipOnce(stablePost, usdc, tipper, creator);

    await expect(
      stablePost.connect(owner).withdrawPlatformFees(ethers.ZeroAddress)
    ).to.be.revertedWith("bad recipient");

    const treasuryAddr = await treasury.getAddress();
    await expect(
      stablePost.connect(tipper).withdrawPlatformFees(treasuryAddr)
    ).to.be.revertedWithCustomError(stablePost, "OwnableUnauthorizedAccount");

    await expect(stablePost.connect(owner).withdrawPlatformFees(treasuryAddr))
      .to.emit(stablePost, "PlatformFeesWithdrawn")
      .withArgs(treasuryAddr, fee);

    expect(await stablePost.platformFeesCollected()).to.equal(0n);
    expect(await usdc.balanceOf(treasuryAddr)).to.equal(fee);
  });

  it("setPlatformFee: owner may update within MAX_FEE_BPS and emits PlatformFeeUpdated; above cap reverts", async function () {
    const { stablePost, owner } = await networkHelpers.loadFixture(deployFixture);

    await expect(stablePost.connect(owner).setPlatformFee(MAX_FEE_BPS))
      .to.emit(stablePost, "PlatformFeeUpdated")
      .withArgs(DEFAULT_PLATFORM_FEE_BPS, MAX_FEE_BPS);

    expect(await stablePost.platformFee()).to.equal(MAX_FEE_BPS);

    await expect(
      stablePost.connect(owner).setPlatformFee(MAX_FEE_BPS + 1n)
    ).to.be.revertedWith("fee too high");
  });
});
