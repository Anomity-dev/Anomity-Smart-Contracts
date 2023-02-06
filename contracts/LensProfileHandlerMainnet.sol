// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ILensHub.sol";
import "./interfaces/IMockProfileCreationProxy.sol";


interface IERC721Receiver {
    /**
     * @dev Whenever an {IERC721} `tokenId` token is transferred to this contract via {IERC721-safeTransferFrom}
     * by `operator` from `from`, this function is called.
     *
     * It must return its Solidity selector to confirm the token transfer.
     * If any other value is returned or the interface is not implemented by the recipient, the transfer will be reverted.
     *
     * The selector can be obtained in Solidity with `IERC721.onERC721Received.selector`.
     */
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}

contract LensHUBConnectorMainnet is ReentrancyGuard, Ownable, IERC721Receiver {
    address public HUB;
    address public COLLECT_MODULE;
    address public PROFILE_CREATOR;

    mapping(address => bool) public verifiedAddresses;

    uint256 public lensTokenId;
    string public  handle;
    string public  imageURI;

    event NewPost(address indexed relayer, uint256 indexed tokenId, string handle, string content);
    event NewComment(address indexed relayer, uint256 indexed tokenId, string handle, uint256 profileIdPointed, uint256 pubIdPointed, string content);

    constructor(
        address _lensHub,
        address _collectModule,
        address _profileCreator
    ) {
        HUB = _lensHub;
        COLLECT_MODULE = _collectModule;
        PROFILE_CREATOR = _profileCreator;
    }

    fallback() external payable {}

    function switchProfile(uint256 _lensTokenId) external onlyOwner {
        ILensHub hub = ILensHub(HUB);
        require(hub.ownerOf(_lensTokenId) == address(this), "Lens: not owner of lensTokenId");
        lensTokenId = _lensTokenId;
    }

    function returnProfileNFT(uint256 _lensTokenId) external onlyOwner {
        ILensHub(HUB).transferFrom(address(this), msg.sender, _lensTokenId);
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function setVerifiedAddress(address addr, bool isVerified) public onlyOwner {
        verifiedAddresses[addr] = isVerified;
    }

    function post(
        string memory word
    ) external nonReentrant {
        require(lensTokenId > 0, "Lens: lensTokenId is not set");
        require(verifiedAddresses[msg.sender], "Lens: sender is not verified");

        ILensHub.PostData memory data = ILensHub.PostData({
        profileId : lensTokenId,
        contentURI : word,
        collectModule : COLLECT_MODULE,
        collectModuleInitData : abi.encode(false),
        referenceModule : address(0),
        referenceModuleInitData : ""
        });


        ILensHub hub = ILensHub(HUB);
        hub.post(data);

        emit NewPost(msg.sender, lensTokenId, handle, word);
    }


    function comment(
        uint256 profileIdPointed,
        uint256 pubIdPointed,
        string memory word
    ) external nonReentrant {
        require(lensTokenId > 0, "Lens: lensTokenId is not set");
        require(verifiedAddresses[msg.sender], "Lens: sender is not verified");

        ILensHub.CommentData memory data = ILensHub.CommentData({
        profileId : lensTokenId,
        profileIdPointed : profileIdPointed,
        pubIdPointed : pubIdPointed,
        contentURI : word,

        collectModule : COLLECT_MODULE,
        collectModuleInitData : abi.encode(false),
        referenceModule : address(0),
        referenceModuleInitData : "",
        referenceModuleData : ""
        });


        ILensHub hub = ILensHub(HUB);
        hub.comment(data);

        emit NewComment(msg.sender, lensTokenId, handle, profileIdPointed, pubIdPointed, word);
    }
}
