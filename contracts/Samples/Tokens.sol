// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

/**
 * This is a sample tokens contract. It will define tokens
 * with indices 0x100000000 to 0x100000004, with an amount
 * of 0x200000000 tokens for each index. This, to a target
 * beneficiary address.
 */
contract Tokens is ERC1155 {
    uint256 public constant AMOUNT = 0x200000000;

    constructor() ERC1155("about:blank") {}

    // Obviously, this method would NEVER exist in production!!!!!
    function mint(address to, uint256 id) external {
        _mint(to, id, AMOUNT, "");
    }
}