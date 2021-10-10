// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract ERC721Mock is ERC721 {
    
    constructor(
        string memory name,
        string memory symbol
    ) ERC721(name, symbol) {}

    function mint(uint256 tokenId) public {
        _safeMint(msg.sender, tokenId);
    }
}