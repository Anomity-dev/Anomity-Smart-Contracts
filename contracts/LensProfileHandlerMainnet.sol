// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ILensHub.sol";
import "./interfaces/IMockProfileCreationProxy.sol";


contract LensHUBConnector is ReentrancyGuard, Ownable {
    address public HUB;
    address public COLLECT_MODULE;
    address public PROFILE_CREATOR;

    mapping(address => bool) public verifiedAddresses;

    uint256 lensTokenId;
    string handle;
    string imageURI;


    event NewPost(address indexed author, uint256 indexed tokenId, string handle, string content);

    constructor(
        string memory _handle,
        address _lensHub,
        address _collectModule,
        address _profileCreator
    ) {
        handle = _handle;
        HUB = _lensHub;
        COLLECT_MODULE = _collectModule;
        PROFILE_CREATOR = _profileCreator;
    }

    fallback() external payable {}

    function createProfile() external onlyOwner {
        require(lensTokenId == 0, "Lens: lensTokenId is already set");
        //Create lens profile
        IMockProfileCreationProxy profileCreator = IMockProfileCreationProxy(PROFILE_CREATOR);

        IMockProfileCreationProxy.CreateProfileData memory vars = IMockProfileCreationProxy.CreateProfileData({
        to : address(this),
        handle : handle,
        imageURI : imageURI,
        followModule : address(0),
        followModuleInitData : "",
        followNFTURI : ""
        });

        profileCreator.proxyCreateProfile(vars);

        //Get lens token tokenId
        lensTokenId = ILensHub(HUB).tokenOfOwnerByIndex(address(this), 0);
    }


    function setVerifiedAddress(address addr, bool isVerified) public onlyOwner {
        verifiedAddresses[addr] = isVerified;
    }


    function post(
        string memory word
    ) external nonReentrant {
        require(lensTokenId >= 0, "Lens: lensTokenId is not set");
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
}
