// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IERC20Amm {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @title NockEthAMM — a constant-product (x*y=k) AMM for native ETH / tNOCK on Base Sepolia.
/// @notice A single-pair Uniswap-V2-style pool for the Nocksperimental testnet. Liquidity providers
///         deposit ETH + tNOCK and receive transferable ERC20 LP tokens representing their share;
///         swappers trade against the reserves. Two fees apply to every swap:
///           • a 0.30% liquidity fee that STAYS in the pool (growing k, paid to LPs on withdrawal),
///             exactly as in Uniswap V2; and
///           • a 0.01% donation fee that is sent OUT to the project donation wallet on each swap.
///         Both fees are disclosed to participants in the GUI. This is testnet value only.
/// @dev    Reserves are tracked in storage (not balanceOf) and updated on every operation, so stray
///         direct transfers cannot corrupt pricing. A nonReentrant guard protects the native-ETH sends.
contract NockEthAMM {
    // ---- LP token (minimal ERC20) ---------------------------------------------------------------
    string public constant name = "Nock AMM ETH/tNOCK LP";
    string public constant symbol = "NOCK-LP";
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    // ---- pool -----------------------------------------------------------------------------------
    /// @notice tNOCK token traded against native ETH.
    IERC20Amm public immutable tnock;
    /// @notice Recipient of the 0.01% per-swap donation fee.
    address public immutable donationWallet;

    /// @notice Liquidity fee retained in the pool, in basis points (30 = 0.30%, Uniswap-V2 parity).
    uint256 public constant LP_FEE_BPS = 30;
    /// @notice Donation fee sent out per swap, in basis points (1 = 0.01%).
    uint256 public constant DONATION_FEE_BPS = 1;
    uint256 public constant BPS = 10_000;
    /// @notice Permanently-locked first-mint liquidity (anti first-depositor share inflation).
    uint256 public constant MINIMUM_LIQUIDITY = 1_000;

    uint256 public reserveEth;
    uint256 public reserveTnock;

    event LiquidityAdded(address indexed provider, uint256 ethIn, uint256 tnockIn, uint256 shares);
    event LiquidityRemoved(address indexed provider, uint256 ethOut, uint256 tnockOut, uint256 shares);
    event Swap(
        address indexed trader,
        bool ethIn,
        uint256 amountIn,
        uint256 amountOut,
        uint256 donation
    );

    error BadConfig();
    error Reentrancy();
    error InsufficientInput();
    error InsufficientLiquidity();
    error InsufficientLiquidityMinted();
    error InsufficientOutput();
    error SlippageExceeded();
    error TransferInFailed();
    error EthTransferFailed();

    uint256 private _locked = 1;
    modifier nonReentrant() {
        if (_locked != 1) revert Reentrancy();
        _locked = 2;
        _;
        _locked = 1;
    }

    constructor(address _tnock, address _donationWallet) {
        if (_tnock == address(0) || _donationWallet == address(0)) revert BadConfig();
        tnock = IERC20Amm(_tnock);
        donationWallet = _donationWallet;
    }

    // ---- LP ERC20 ------------------------------------------------------------------------------
    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) allowance[from][msg.sender] = allowed - value;
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal {
        balanceOf[from] -= value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }

    function _mint(address to, uint256 value) internal {
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
    }

    function _burn(address from, uint256 value) internal {
        balanceOf[from] -= value;
        totalSupply -= value;
        emit Transfer(from, address(0), value);
    }

    // ---- liquidity -----------------------------------------------------------------------------

    /// @notice Deposit ETH (msg.value) + `tnockIn` tNOCK and mint LP shares. The caller must have
    ///         approved `tnockIn` to this contract. After the first deposit, the ETH:tNOCK ratio of
    ///         the deposit must match the pool ratio (excess of one side earns no shares); quote with
    ///         {quoteTnockForEth} off-chain to pair correctly.
    /// @param minShares Revert if fewer shares than this would be minted (slippage guard).
    function addLiquidity(uint256 tnockIn, uint256 minShares)
        external
        payable
        nonReentrant
        returns (uint256 shares)
    {
        if (msg.value == 0 || tnockIn == 0) revert InsufficientInput();
        if (!tnock.transferFrom(msg.sender, address(this), tnockIn)) revert TransferInFailed();

        uint256 supply = totalSupply;
        if (supply == 0) {
            shares = _sqrt(msg.value * tnockIn);
            if (shares <= MINIMUM_LIQUIDITY) revert InsufficientLiquidityMinted();
            _mint(address(0xdead), MINIMUM_LIQUIDITY); // permanently locked
            shares -= MINIMUM_LIQUIDITY;
        } else {
            // Shares proportional to the limiting side; the other side's excess just enriches the pool.
            uint256 fromEth = (msg.value * supply) / reserveEth;
            uint256 fromTnock = (tnockIn * supply) / reserveTnock;
            shares = fromEth < fromTnock ? fromEth : fromTnock;
        }
        if (shares == 0) revert InsufficientLiquidityMinted();
        if (shares < minShares) revert SlippageExceeded();

        _mint(msg.sender, shares);
        reserveEth += msg.value;
        reserveTnock += tnockIn;
        emit LiquidityAdded(msg.sender, msg.value, tnockIn, shares);
    }

    /// @notice Burn `shares` LP tokens and withdraw the proportional ETH + tNOCK.
    function removeLiquidity(uint256 shares, uint256 minEth, uint256 minTnock)
        external
        nonReentrant
        returns (uint256 ethOut, uint256 tnockOut)
    {
        uint256 supply = totalSupply;
        ethOut = (shares * reserveEth) / supply;
        tnockOut = (shares * reserveTnock) / supply;
        if (ethOut == 0 || tnockOut == 0) revert InsufficientLiquidity();
        if (ethOut < minEth || tnockOut < minTnock) revert SlippageExceeded();

        _burn(msg.sender, shares);
        reserveEth -= ethOut;
        reserveTnock -= tnockOut;

        if (!tnock.transfer(msg.sender, tnockOut)) revert TransferInFailed();
        (bool ok, ) = msg.sender.call{ value: ethOut }("");
        if (!ok) revert EthTransferFailed();
        emit LiquidityRemoved(msg.sender, ethOut, tnockOut, shares);
    }

    // ---- swaps ---------------------------------------------------------------------------------

    /// @notice Pure quote: tokens out for `amountIn` against `(reserveIn, reserveOut)`, after the
    ///         0.01% donation carve-out and the 0.30% in-pool LP fee. Mirrors the swap math exactly.
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        public
        pure
        returns (uint256 amountOut, uint256 donation)
    {
        if (amountIn == 0) revert InsufficientInput();
        if (reserveIn == 0 || reserveOut == 0) revert InsufficientLiquidity();
        donation = (amountIn * DONATION_FEE_BPS) / BPS;
        uint256 inAfterDonation = amountIn - donation;
        uint256 inWithLpFee = inAfterDonation * (BPS - LP_FEE_BPS);
        amountOut = (inWithLpFee * reserveOut) / (reserveIn * BPS + inWithLpFee);
    }

    /// @notice Swap exact ETH (msg.value) for tNOCK. `minOut` is the slippage floor.
    function swapEthForTNock(uint256 minOut) external payable nonReentrant returns (uint256 amountOut) {
        uint256 donation;
        (amountOut, donation) = getAmountOut(msg.value, reserveEth, reserveTnock);
        if (amountOut == 0) revert InsufficientOutput();
        if (amountOut < minOut) revert SlippageExceeded();
        if (amountOut >= reserveTnock) revert InsufficientLiquidity();

        // The donation leaves the pool; only the net input joins the reserves.
        reserveEth += msg.value - donation;
        reserveTnock -= amountOut;

        if (!tnock.transfer(msg.sender, amountOut)) revert TransferInFailed();
        if (donation > 0) {
            (bool ok, ) = donationWallet.call{ value: donation }("");
            if (!ok) revert EthTransferFailed();
        }
        emit Swap(msg.sender, true, msg.value, amountOut, donation);
    }

    /// @notice Swap exact `amountIn` tNOCK for ETH. The caller must have approved `amountIn`.
    function swapTNockForEth(uint256 amountIn, uint256 minOut)
        external
        nonReentrant
        returns (uint256 amountOut)
    {
        if (!tnock.transferFrom(msg.sender, address(this), amountIn)) revert TransferInFailed();
        uint256 donation;
        (amountOut, donation) = getAmountOut(amountIn, reserveTnock, reserveEth);
        if (amountOut == 0) revert InsufficientOutput();
        if (amountOut < minOut) revert SlippageExceeded();
        if (amountOut >= reserveEth) revert InsufficientLiquidity();

        reserveTnock += amountIn - donation;
        reserveEth -= amountOut;

        if (donation > 0 && !tnock.transfer(donationWallet, donation)) revert TransferInFailed();
        (bool ok, ) = msg.sender.call{ value: amountOut }("");
        if (!ok) revert EthTransferFailed();
        emit Swap(msg.sender, false, amountIn, amountOut, donation);
    }

    // ---- views ---------------------------------------------------------------------------------

    /// @notice The tNOCK to pair with `ethIn` at the current pool ratio (for addLiquidity).
    function quoteTnockForEth(uint256 ethIn) external view returns (uint256) {
        if (reserveEth == 0) return 0;
        return (ethIn * reserveTnock) / reserveEth;
    }

    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
