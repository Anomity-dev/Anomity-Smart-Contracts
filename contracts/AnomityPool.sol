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
        uint[3] memory input
    ) external view returns (bool);
}

interface ILensHubConnector {
    function post(
        string memory _contentIPFSURI
    ) external;
}

contract AnomityPool is MerkleTreeWithHistory, ReentrancyGuard {
    ILensHubConnector public lensHubConnector;

    address public usdcAddress;

    IVerifier public immutable verifier;

    mapping(bytes32 => bool) public nullifierHashes;
    mapping(bytes32 => bool) public commitments;

    uint256 public depositAmount;
    uint256 lensTokenId;
    string handle;

    event Deposit(bytes32 indexed commitment, uint32 leafIndex, uint256 timestamp);
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
        address _usdcAddress
    ) MerkleTreeWithHistory(_merkleTreeHeight, _hasher) {
        verifier = _verifier;
        depositAmount = _depositAmount;
        usdcAddress = _usdcAddress;
        lensHubConnector = ILensHubConnector(_lensHubConnector);
    }

    function depositWithUSDC(bytes32 _commitment) external nonReentrant {
        IERC20 usdc = IERC20(usdcAddress);
        require(usdc.transferFrom(msg.sender, address(this), depositAmount), "anomity: transferFrom failed");
        deposit(_commitment);
    }


    function deposit(bytes32 _commitment) internal {
        require(!commitments[_commitment], "The commitment has been submitted");

        uint32 insertedIndex = _insert(_commitment);
        commitments[_commitment] = true;

        emit Deposit(_commitment, insertedIndex, block.timestamp);
    }


    function verifyAndPost(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        bytes32 _root,
        bytes32 _nullifierHash,
        string memory contentIpfsURI
    ) external nonReentrant {
        require(!nullifierHashes[_nullifierHash], "The note has been already spent");
        require(isKnownRoot(_root), "Cannot find your merkle root");
        bytes32 contentIpfsURIHash = keccak256(abi.encode(contentIpfsURI));

        uint[3] memory pubSignals = [
            uint256(_root),
            uint256(_nullifierHash),
            uint256(contentIpfsURIHash) >> 128
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

        require(IERC20(usdcAddress).transfer(msg.sender, depositAmount), "Lens: transferFrom failed");

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

        uint[3] memory pubSignals = [
            uint256(_root),
            uint256(_nullifierHash),
            uint256(contentIpfsURIHash) >> 128
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
