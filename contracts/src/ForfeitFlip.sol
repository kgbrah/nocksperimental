// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title ForfeitFlip — provably-fair, commit-reveal coin-flip settlement.
/// @notice On-chain settlement for the Nocksperimental "Forfeit Flip" game. The HOUSE commits to a
///         per-round random `serverSeed` (via keccak256) BEFORE a player stakes, so neither side can
///         grind the result: the player never sees `serverSeed` (only its commitment), and the house
///         cannot change a committed seed. The outcome is the parity of
///         `keccak256(serverSeed, clientSeed, roundId)` — even money. If the house fails to reveal by
///         the deadline, the player claims their stake PLUS the house's matched stake, so withholding a
///         reveal is strictly -EV for the house.
/// @dev    Native-ETH stakes. Payouts use a pull-payment credit ledger (no value is pushed during
///         settlement) so settlement is reentrancy-free and a hostile receiver cannot grief it.
contract ForfeitFlip {
    // ---------------------------------------------------------------------------------------------
    // Config / roles
    // ---------------------------------------------------------------------------------------------

    /// @notice Operator that opens rounds, reveals seeds, and owns the bankroll.
    address public immutable house;

    /// @notice Inclusive stake bounds (wei) a player may wager per round.
    uint256 public immutable minStake;
    uint256 public immutable maxStake;

    /// @notice Seconds the house has to reveal after a player plays before the player may refund-claim.
    uint256 public immutable revealWindow;

    // ---------------------------------------------------------------------------------------------
    // Accounting (explicit balances; invariant checked in tests)
    //   address(this).balance == houseBankroll + 2*lockedLiabilities + totalCredits
    // where a Played round locks `stake` from the house AND holds the player's `stake` (a 2*stake pot).
    // ---------------------------------------------------------------------------------------------

    /// @notice Free house funds available to back new bets.
    uint256 public houseBankroll;
    /// @notice Sum of the house-side stake locked across all currently-Played rounds.
    uint256 public lockedLiabilities;
    /// @notice Sum of all withdrawable credits owed to accounts.
    uint256 public totalCredits;
    /// @notice Withdrawable balance per account (winnings, refunds, house withdrawals routed here).
    mapping(address => uint256) public credits;

    // ---------------------------------------------------------------------------------------------
    // Rounds
    // ---------------------------------------------------------------------------------------------

    enum Status {
        None,
        Open,
        Played,
        Settled,
        Refunded,
        Cancelled
    }

    struct Round {
        bytes32 commit; // keccak256(serverSeed)
        Status status;
        address player;
        uint96 stake;
        bytes32 clientSeed;
        uint64 playedAt;
        bool playerWon; // recorded on settle
    }

    uint256 public nextRoundId;
    mapping(uint256 => Round) public rounds;
    /// @notice Prevents a commit (and thus a serverSeed) from being reused across rounds.
    mapping(bytes32 => bool) public usedCommit;

    // ---------------------------------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------------------------------

    event RoundOpened(uint256 indexed roundId, bytes32 commit);
    event RoundCancelled(uint256 indexed roundId);
    event RoundPlayed(uint256 indexed roundId, address indexed player, uint256 stake, bytes32 clientSeed);
    event RoundSettled(
        uint256 indexed roundId, address indexed player, bool playerWon, bytes32 serverSeed, bytes32 outcome
    );
    event RoundRefunded(uint256 indexed roundId, address indexed player, uint256 amount);
    event Credited(address indexed account, uint256 amount);
    event Withdrawn(address indexed account, uint256 amount);
    event BankrollFunded(address indexed from, uint256 amount);
    event BankrollWithdrawn(address indexed to, uint256 amount);

    // ---------------------------------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------------------------------

    error NotHouse();
    error BadConfig();
    error EmptyCommit();
    error CommitReused();
    error InsufficientBankroll();
    error WrongStatus();
    error StakeOutOfRange();
    error BadReveal();
    error RevealWindowOpen();
    error NothingToWithdraw();
    error TransferFailed();
    error ZeroAmount();

    modifier onlyHouse() {
        if (msg.sender != house) revert NotHouse();
        _;
    }

    /// @param _minStake     Minimum wager (wei), > 0.
    /// @param _maxStake     Maximum wager (wei), >= _minStake and within uint96.
    /// @param _revealWindow Reveal deadline (seconds), 60s..7d.
    constructor(uint256 _minStake, uint256 _maxStake, uint256 _revealWindow) payable {
        if (_minStake == 0 || _maxStake < _minStake || _maxStake > type(uint96).max) revert BadConfig();
        if (_revealWindow < 60 || _revealWindow > 7 days) revert BadConfig();
        house = msg.sender;
        minStake = _minStake;
        maxStake = _maxStake;
        revealWindow = _revealWindow;
        if (msg.value > 0) {
            houseBankroll = msg.value;
            emit BankrollFunded(msg.sender, msg.value);
        }
    }

    // ---------------------------------------------------------------------------------------------
    // Bankroll
    // ---------------------------------------------------------------------------------------------

    /// @notice Add free funds to the house bankroll.
    function fundBankroll() external payable {
        if (msg.value == 0) revert ZeroAmount();
        houseBankroll += msg.value;
        emit BankrollFunded(msg.sender, msg.value);
    }

    /// @notice House withdraws FREE bankroll only (never locked liabilities or player credits) into its
    ///         own credit balance, then withdraws via {withdraw}. Two-step keeps all payouts pull-based.
    function withdrawBankroll(uint256 amount) external onlyHouse {
        if (amount == 0) revert ZeroAmount();
        if (amount > houseBankroll) revert InsufficientBankroll();
        houseBankroll -= amount;
        _credit(house, amount);
        emit BankrollWithdrawn(house, amount);
    }

    // ---------------------------------------------------------------------------------------------
    // Round lifecycle
    // ---------------------------------------------------------------------------------------------

    /// @notice House opens a round by committing to a fresh random serverSeed: `commit = keccak256(serverSeed)`.
    /// @dev    No bankroll is reserved here; reservation happens when a player actually plays.
    function openRound(bytes32 commit) external onlyHouse returns (uint256 roundId) {
        if (commit == bytes32(0)) revert EmptyCommit();
        if (usedCommit[commit]) revert CommitReused();
        usedCommit[commit] = true;
        roundId = nextRoundId++;
        Round storage r = rounds[roundId];
        r.commit = commit;
        r.status = Status.Open;
        emit RoundOpened(roundId, commit);
    }

    /// @notice House garbage-collects an Open round it no longer wants to honor. No funds are involved
    ///         (bankroll only locks at play). `usedCommit` stays set so the burned serverSeed can never
    ///         be reused — the house simply commits a fresh seed next time.
    function cancelRound(uint256 roundId) external onlyHouse {
        Round storage r = rounds[roundId];
        if (r.status != Status.Open) revert WrongStatus();
        r.status = Status.Cancelled;
        emit RoundCancelled(roundId);
    }

    /// @notice Player stakes ETH and supplies their own entropy (`clientSeed`). The player only knows
    ///         the commitment, never `serverSeed`, so the outcome is unpredictable to them.
    function play(uint256 roundId, bytes32 clientSeed) external payable {
        Round storage r = rounds[roundId];
        if (r.status != Status.Open) revert WrongStatus();
        uint256 stake = msg.value;
        if (stake < minStake || stake > maxStake) revert StakeOutOfRange();
        // The house must be able to MATCH the stake (even money). Move it from free bankroll to locked.
        if (houseBankroll < stake) revert InsufficientBankroll();
        houseBankroll -= stake;
        lockedLiabilities += stake;

        r.status = Status.Played;
        r.player = msg.sender;
        // safe: stake <= maxStake <= type(uint96).max (enforced in the constructor).
        // forge-lint: disable-next-line(unsafe-typecast)
        r.stake = uint96(stake);
        r.clientSeed = clientSeed;
        r.playedAt = uint64(block.timestamp);
        emit RoundPlayed(roundId, msg.sender, stake, clientSeed);
    }

    /// @notice House reveals `serverSeed`; the contract verifies it against the commit and settles.
    ///         Outcome = parity of keccak256(serverSeed, clientSeed, roundId). Player wins on odd.
    /// @dev    There is intentionally NO upper time bound: the outcome is fully fixed the instant the
    ///         player stakes (serverSeed is already committed), so a late reveal cannot change WHO won —
    ///         it only settles truthfully. `revealWindow` is the player's OPTION (via {claimTimeout}) to
    ///         reclaim the full pot if the house stalls, not a hard deadline that flips the round.
    function reveal(uint256 roundId, bytes32 serverSeed) external onlyHouse {
        Round storage r = rounds[roundId];
        if (r.status != Status.Played) revert WrongStatus();
        if (keccak256(abi.encodePacked(serverSeed)) != r.commit) revert BadReveal();

        bytes32 outcome = keccak256(abi.encodePacked(serverSeed, r.clientSeed, roundId));
        bool playerWon = (uint256(outcome) & 1) == 1;

        uint256 stake = r.stake;
        uint256 pot = stake * 2; // player's stake + house's locked stake
        lockedLiabilities -= stake;
        r.status = Status.Settled;
        r.playerWon = playerWon;

        if (playerWon) {
            _credit(r.player, pot);
        } else {
            // House keeps the whole pot back into free bankroll.
            houseBankroll += pot;
        }
        emit RoundSettled(roundId, r.player, playerWon, serverSeed, outcome);
    }

    /// @notice After the reveal window, the player reclaims the FULL pot (their stake + the house's
    ///         matched stake) — making a withheld reveal strictly -EV for the house. Callable by anyone
    ///         (funds always go to the player's credit), so a third party can rescue a stuck round.
    function claimTimeout(uint256 roundId) external {
        Round storage r = rounds[roundId];
        if (r.status != Status.Played) revert WrongStatus();
        // Coarse (hour-scale) timeout only — a ~seconds validator nudge is negligible here, and the
        // game OUTCOME has zero timestamp dependence (it is fixed by serverSeed/clientSeed at play).
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp <= uint256(r.playedAt) + revealWindow) revert RevealWindowOpen();

        uint256 stake = r.stake;
        uint256 pot = stake * 2;
        lockedLiabilities -= stake;
        r.status = Status.Refunded;
        _credit(r.player, pot);
        emit RoundRefunded(roundId, r.player, pot);
    }

    // ---------------------------------------------------------------------------------------------
    // Withdrawals (pull payment)
    // ---------------------------------------------------------------------------------------------

    /// @notice Withdraw all credited winnings/refunds. Checks-effects-interactions + a zeroed credit
    ///         before the external call make this reentrancy-safe.
    function withdraw() external {
        uint256 amount = credits[msg.sender];
        if (amount == 0) revert NothingToWithdraw();
        credits[msg.sender] = 0;
        totalCredits -= amount;
        (bool ok,) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(msg.sender, amount);
    }

    // ---------------------------------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------------------------------

    /// @notice Verify a settled round's fairness off-chain parity: returns the outcome + whether the
    ///         player won for a given (serverSeed, clientSeed, roundId).
    function computeOutcome(bytes32 serverSeed, bytes32 clientSeed, uint256 roundId)
        external
        pure
        returns (bytes32 outcome, bool playerWon)
    {
        outcome = keccak256(abi.encodePacked(serverSeed, clientSeed, roundId));
        playerWon = (uint256(outcome) & 1) == 1;
    }

    function getRound(uint256 roundId) external view returns (Round memory) {
        return rounds[roundId];
    }

    // ---------------------------------------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------------------------------------

    function _credit(address account, uint256 amount) internal {
        credits[account] += amount;
        totalCredits += amount;
        emit Credited(account, amount);
    }
}
