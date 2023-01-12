// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./MerkleTreeWithHistory.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/ILensHub.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IMockProfileCreationProxy.sol";
import "./interfaces/IUniswapV2Router02.sol";

interface IVerifier {
    function verifyProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[4] memory input
    ) external view returns (bool);
}

interface ILensHubConnector {
    function post(
        string memory _contentIPFSURI
    ) external;
}

    struct ContentCommitmentData {
        bytes32 hash;
        uint256 blockNumber;
    }

contract AnomityPool is MerkleTreeWithHistory, ReentrancyGuard {
    ILensHubConnector public lensHubConnector;

    address public usdcAddress;

    IVerifier public immutable verifier;

    mapping(bytes32 => bool) public nullifierHashes;
    mapping(bytes32 => uint256) public contentVerificationCommitBlockNumber;
    mapping(bytes32 => bool) public commitments;

    address public uniswapRouter;


    uint256 public depositAmount;
    uint256 lensTokenId;
    string handle;

    event Deposit(bytes32[] commitment, uint32 leafIndex, uint256 timestamp);
    event VerifyAndPost(bytes32 nullifierHash, address relayer, string contentIPFSURI);

    /**
    @dev The constructor
    @param _verifier the address of SNARK verifier for this contract
    @param _hasher the address of MiMC hash contract
    @param _merkleTreeHeight the height of deposits' Merkle Tree
    @param _lensHubConnector the address of LensHUBConnector

  */
    constructor(
        IVerifier _verifier,
        IHasher _hasher,
        uint32 _merkleTreeHeight,
        uint256 _depositAmount,
        address _lensHubConnector,
        address _uniswapRouter,
        address _usdcAddress
    ) MerkleTreeWithHistory(_merkleTreeHeight, _hasher) {
        verifier = _verifier;
        depositAmount = _depositAmount;
        usdcAddress = _usdcAddress;
        lensHubConnector = ILensHubConnector(_lensHubConnector);
        uniswapRouter = _uniswapRouter;
    }

    fallback() external payable {}

    receive() external payable {}


    function checkAllowance(address _token, address _spender, uint256 _amount) internal view returns (bool) {
        return IERC20(_token).allowance(_spender, address(this)) >= _amount;
    }

    function swapPathToUSDC(uint256 depositAmountForAll, address[] calldata path, uint256 initialTokenAmount) internal returns (uint256) {
        IUniswapV2Router02 uniswapRouterObject = IUniswapV2Router02(uniswapRouter);

        if (!checkAllowance(path[0], uniswapRouter, initialTokenAmount)) {
            IERC20(path[0]).approve(uniswapRouter, type(uint256).max);
        }

        uint256[] memory amounts = uniswapRouterObject.swapTokensForExactTokens(depositAmountForAll, initialTokenAmount, path, address(this), block.timestamp);

        return amounts[0];
    }


    function swapMaticForUSDC(uint256 depositAmountForAll) internal returns (uint256) {
        IUniswapV2Router02 uniswapRouterObject = IUniswapV2Router02(uniswapRouter);
        address[] memory path = new address[](2);
        path[0] = uniswapRouterObject.WETH();
        path[1] = usdcAddress;

        uint256[] memory amounts = uniswapRouterObject.swapETHForExactTokens{value : msg.value}(depositAmountForAll, path, address(this), block.timestamp);

        return amounts[0];
    }


    function depositWithOtherToken(bytes32[] memory _commitments, address[] calldata path, uint256 initialTokenAmount) external nonReentrant {
        uint256 depositAmountForAll = depositAmount * _commitments.length;
        IERC20 usdc = IERC20(path[0]);

        require(usdc.transferFrom(msg.sender, address(this), initialTokenAmount), "anomity: transferFrom failed");

        uint256 usedAmount = swapPathToUSDC(depositAmountForAll, path, initialTokenAmount);

        if (usedAmount < initialTokenAmount) {
            require(usdc.transfer(msg.sender, initialTokenAmount - usedAmount));
        }

        depositBulk(_commitments);
    }


    function depositWithMatic(bytes32[] memory _commitments) external payable nonReentrant {
        uint256 depositAmountForAll = depositAmount * _commitments.length;

        uint256 amount = msg.value;
        uint256 usedAmount = swapMaticForUSDC(depositAmountForAll);
        if (usedAmount < amount) {
            payable(msg.sender).transfer(amount - usedAmount);
        }
        depositBulk(_commitments);
    }


    function depositWithUSDC(bytes32[] memory _commitments) external nonReentrant {
        uint256 depositAmountForAll = depositAmount * _commitments.length;

        IERC20 usdc = IERC20(usdcAddress);
        require(usdc.transferFrom(msg.sender, address(this), depositAmountForAll), "anomity: transferFrom failed");

        depositBulk(_commitments);
    }

    function depositBulk(bytes32[] memory _commitments) internal {
        uint32 startingIndex = nextIndex;

        for (uint256 i = 0; i < _commitments.length; i++) {
            require(!commitments[_commitments[i]], "The commitment has been submitted");
            commitments[_commitments[i]] = true;
        }
        _insertBulk(_commitments);

        emit Deposit(_commitments, startingIndex, block.timestamp);
    }

    function setVerificationCommitment(bytes32 addressCommitment) public {
        require(contentVerificationCommitBlockNumber[addressCommitment] == 0);
        contentVerificationCommitBlockNumber[addressCommitment] = block.number;
    }

    function withdrawProof(uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        bytes32 _root,
        bytes32 _nullifierHash,
        string memory contentIpfsURI,
        address relayer
    ) external nonReentrant {
        require(!nullifierHashes[_nullifierHash], "The note has been already spent");
        require(isKnownRoot(_root), "Cannot find your merkle root");

        bytes32 addressCommitment = keccak256(abi.encode(_nullifierHash, relayer));
        uint256 commitmentBlockNumber = contentVerificationCommitBlockNumber[addressCommitment];
        require(commitmentBlockNumber > 0, "commitment is not send!");
        require(block.number > commitmentBlockNumber + 1, "commitment is sent too soon!");
        bytes32 contentIpfsURIHash = keccak256(abi.encode(contentIpfsURI));

        uint[4] memory pubSignals = [
        uint256(_root),
        uint256(_nullifierHash),
        uint256(contentIpfsURIHash) >> 128,
        uint256(0)
        ];

        require(
            verifier.verifyProof(
                a,
                b,
                c,
                pubSignals
            ),
            "Invalid withdraw proof"
        );

        nullifierHashes[_nullifierHash] = true;

        require(IERC20(usdcAddress).transfer(relayer, depositAmount), "Lens: transferFrom failed");
    }

    function verifyAndPost(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        bytes32 _root,
        bytes32 _nullifierHash,
        string memory contentIpfsURI,
        address relayer
    ) external nonReentrant {
        require(!nullifierHashes[_nullifierHash], "The note has been already spent!");
        require(isKnownRoot(_root), "Cannot find your merkle root!");

        bytes32 contentCommitment = keccak256(abi.encode(_nullifierHash));
        ContentCommitmentData memory contentCommitmentData = contentVerificationCommitHashes[contentCommitment];
        require(contentCommitmentData.blockNumber - block.number > 1, "commitment is not send or sent too soon!");
        bytes32 addressCommitment = keccak256(abi.encode(_nullifierHash, relayer));
        require(contentCommitmentData.hash == addressCommitment, "commitment does not match!");
        bytes32 contentIpfsURIHash = keccak256(abi.encode(contentIpfsURI));

        uint[4] memory pubSignals = [
        uint256(_root),
        uint256(_nullifierHash),
        uint256(contentIpfsURIHash) >> 128,
        uint256(1)
        ];

        require(
            verifier.verifyProof(
                a,
                b,
                c,
                pubSignals
            ),
            "Invalid withdraw proof"
        );

        nullifierHashes[_nullifierHash] = true;

        require(IERC20(usdcAddress).transfer(relayer, depositAmount), "Lens: transferFrom failed");

        lensHubConnector.post(contentIpfsURI);

        emit VerifyAndPost(_nullifierHash, msg.sender, contentIpfsURI);
    }

    function getWordHash(string memory word) public pure returns (bytes32) {
        return keccak256(abi.encode(word));
    }

    function isProofValid(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        bytes32 _root,
        bytes32 _nullifierHash,
        string memory contentIpfsURI
    ) public view returns (bool) {
        require(!nullifierHashes[_nullifierHash], "The note has been already spent");
        require(isKnownRoot(_root), "Cannot find your merkle root");
        bytes32 contentIpfsURIHash = keccak256(abi.encode(contentIpfsURI));

        uint[4] memory pubSignals = [
        uint256(_root),
        uint256(_nullifierHash),
        uint256(contentIpfsURIHash) >> 128,
        uint256(1)
        ];

        return verifier.verifyProof(
            a,
            b,
            c,
            pubSignals
        );
    }

    /** @dev whether a note is already spent */
    function isSpent(bytes32 _nullifierHash) public view returns (bool) {
        return nullifierHashes[_nullifierHash];
    }

    /** @dev whether an array of notes is already spent */
    function isSpentArray(bytes32[] calldata _nullifierHashes) external view returns (bool[] memory spent) {
        spent = new bool[](_nullifierHashes.length);
        for (uint256 i = 0; i < _nullifierHashes.length; i++) {
            if (isSpent(_nullifierHashes[i])) {
                spent[i] = true;
            }
        }
    }
}
