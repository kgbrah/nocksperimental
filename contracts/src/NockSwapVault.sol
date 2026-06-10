// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @title NockSwapVault — fixed-rate testnet vending vault: native ETH in, tNOCK out.
/// @notice First leg of the Nocksperimental swap flow (ETH → tNOCK → bridge burn → native NOCK on
///         fakenet). Users send Base Sepolia ETH and receive tNOCK from owner-funded reserves at a
///         posted rate. This is a TESTNET liquidity stand-in, not a market: the owner sets the rate,
///         funds the tNOCK reserve (plain ERC20 transfer to this address), and can sweep both sides.
/// @dev    No minimum swap — any amount whose tNOCK output is non-zero is accepted, matching the
///         bridge's no-minimum policy. tNOCK has 16 decimals; `rate` is tNOCK base units per 1 ETH
///         (1e18 wei), so `out = msg.value * rate / 1e18` floors sub-unit dust.
contract NockSwapVault {
    /// @notice The tNOCK token paid out by this vault.
    IERC20 public immutable tnock;

    /// @notice Operator able to set the rate and withdraw reserves.
    address public owner;

    /// @notice tNOCK base units (16 decimals) paid per 1 ETH (1e18 wei).
    uint256 public rate;

    event Swapped(address indexed buyer, uint256 ethIn, uint256 tnockOut);
    event RateUpdated(uint256 oldRate, uint256 newRate);
    event EthWithdrawn(address indexed to, uint256 amount);
    event TNockWithdrawn(address indexed to, uint256 amount);
    event OwnerTransferred(address indexed oldOwner, address indexed newOwner);

    error NotOwner();
    error BadConfig();
    error ZeroOutput();
    error InsufficientReserves();
    error TransferFailed();
    error UseSwap();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address _tnock, uint256 _rate) {
        if (_tnock == address(0) || _rate == 0) revert BadConfig();
        tnock = IERC20(_tnock);
        owner = msg.sender;
        rate = _rate;
    }

    /// @notice Quote how much tNOCK `ethWei` buys at the current rate.
    function quote(uint256 ethWei) public view returns (uint256) {
        return (ethWei * rate) / 1e18;
    }

    /// @notice tNOCK currently available to vend.
    function reserves() external view returns (uint256) {
        return tnock.balanceOf(address(this));
    }

    /// @notice Swap the sent ETH for tNOCK at the posted rate.
    function swapEthForTNock() external payable returns (uint256 tnockOut) {
        tnockOut = quote(msg.value);
        if (tnockOut == 0) revert ZeroOutput();
        if (tnock.balanceOf(address(this)) < tnockOut) revert InsufficientReserves();
        if (!tnock.transfer(msg.sender, tnockOut)) revert TransferFailed();
        emit Swapped(msg.sender, msg.value, tnockOut);
    }

    /// @notice Update the vend rate (tNOCK base units per 1 ETH).
    function setRate(uint256 newRate) external onlyOwner {
        if (newRate == 0) revert BadConfig();
        emit RateUpdated(rate, newRate);
        rate = newRate;
    }

    /// @notice Withdraw accumulated ETH proceeds.
    function withdrawEth(address payable to, uint256 amount) external onlyOwner {
        (bool ok, ) = to.call{ value: amount }("");
        if (!ok) revert TransferFailed();
        emit EthWithdrawn(to, amount);
    }

    /// @notice Withdraw tNOCK reserves.
    function withdrawTNock(address to, uint256 amount) external onlyOwner {
        if (!tnock.transfer(to, amount)) revert TransferFailed();
        emit TNockWithdrawn(to, amount);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert BadConfig();
        emit OwnerTransferred(owner, newOwner);
        owner = newOwner;
    }

    /// @dev Reject blind ETH transfers — swaps must go through {swapEthForTNock} so the
    ///      sender always receives tNOCK (accidental sends would otherwise be donations).
    receive() external payable {
        revert UseSwap();
    }
}
