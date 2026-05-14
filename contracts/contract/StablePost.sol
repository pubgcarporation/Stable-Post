// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
 * Stable Post - USDC tips for creators (per-post id for analytics).
 * On-chain: pull tips, creator balances, withdraw, platform fee, totals.
 * Off-chain: posts, usernames, feed, likes, comments, follows.
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract StablePost is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;

    uint256 public constant BPS_DENOMINATOR = 10_000;

    uint256 public constant MAX_FEE_BPS = 1000;

    uint256 public platformFee = 200;

    mapping(address => uint256) public creatorBalances;

    mapping(uint256 => uint256) public postEarnings;

    uint256 public platformFeesCollected;

    uint256 public totalTips;

    uint256 public totalVolume;

    event Tipped(
        address indexed sender,
        address indexed creator,
        uint256 indexed postId,
        uint256 amount,
        uint256 fee
    );

    event Withdrawn(address indexed creator, uint256 amount);

    event PlatformFeesWithdrawn(address indexed to, uint256 amount);

    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);

    constructor(address _usdc) Ownable(msg.sender) {
        require(_usdc != address(0), "invalid usdc");
        usdc = IERC20(_usdc);
    }

    function tipCreator(
        address creator,
        uint256 postId,
        uint256 amount
    ) external nonReentrant {
        require(amount > 0, "amount = 0");
        require(creator != address(0), "bad creator");
        require(creator != msg.sender, "self tip");

        uint256 fee = (amount * platformFee) / BPS_DENOMINATOR;
        uint256 creatorAmount = amount - fee;

        usdc.safeTransferFrom(msg.sender, address(this), amount);

        creatorBalances[creator] += creatorAmount;
        postEarnings[postId] += creatorAmount;
        platformFeesCollected += fee;

        totalTips += 1;
        totalVolume += amount;

        emit Tipped(msg.sender, creator, postId, creatorAmount, fee);
    }

    function withdraw() external nonReentrant {
        uint256 amount = creatorBalances[msg.sender];
        require(amount > 0, "no balance");

        creatorBalances[msg.sender] = 0;

        usdc.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    function withdrawPlatformFees(address to) external onlyOwner nonReentrant {
        require(to != address(0), "bad recipient");

        uint256 amount = platformFeesCollected;
        require(amount > 0, "no fees");

        platformFeesCollected = 0;

        usdc.safeTransfer(to, amount);

        emit PlatformFeesWithdrawn(to, amount);
    }

    function setPlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= MAX_FEE_BPS, "fee too high");
        uint256 oldFee = platformFee;
        platformFee = newFee;
        emit PlatformFeeUpdated(oldFee, newFee);
    }
}
