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
    uint256 public constant TOKEN1 = 0x100000000;
    uint256 public constant TOKEN2 = 0x100000001;
    uint256 public constant TOKEN3 = 0x100000002;
    uint256 public constant TOKEN4 = 0x100000003;
    uint256 public constant TOKEN5 = 0x100000004;
    uint256 public constant AMOUNT = 0x200000000;

    constructor(address beneficiary) ERC1155("about:blank") {
        require(beneficiary != address(0), "Tokens: invalid beneficiary");
        _mint(beneficiary, TOKEN1, AMOUNT, "");
        _mint(beneficiary, TOKEN2, AMOUNT, "");
        _mint(beneficiary, TOKEN3, AMOUNT, "");
        _mint(beneficiary, TOKEN4, AMOUNT, "");
        _mint(beneficiary, TOKEN5, AMOUNT, "");
    }
}