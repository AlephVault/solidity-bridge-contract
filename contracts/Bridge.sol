// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

/**
 * This is a bridge contract which has two main features:
 *
 *   It can receive critical resources (fungible tokens,
 *   from certain expected types) and properly allows
 *   redemptions in the non-critical world (game).
 *
 *   The reverse process might also be possible. The game
 *   might receive in-game items and send fungible tokens
 *   to the user.
 */
contract Bridge is Ownable {
  using ERC165Checker for address;

  /**
   * The configuration for a bridged resource type.
   */
  struct BridgedResourceType {
    /**
     * Flag telling the entry exists. Always true for
     * created records.
     */
    bool created;

    /**
     * Flag telling the entry is active. By default,
     * true on new entries. It can be deactivated or
     * activated at will.
     */
    bool active;

    /**
     * The amount of the resource for each unit. It is
     * typically 1e18 (the standard amount of decimals
     * for fungible tokens), but it is not mandatory.
     * In any case, it must not be zero.
     */
    uint256 amountPerUnit;
  }

  /**
   * The registered bridged resources.
   */
  mapping(uint256 => BridgedResourceType) public bridgedResourceTypes;

  /**
   * This is the ERC1155 contract.
   */
  address public economy;

  /**
   * Tells that this bridge was terminated. This will be needed
   * when the game stops / is re-set, if the case. Redemptions
   * may occur but, when terminated, no ERC-1155 will be received
   * by this contract anymore.
   */
  bool public terminated;

  /**
   * A bridged resource type was defined.
   */
  event BridgedResourceTypeDefined(uint256 indexed id, uint256 amountPerUnit);

  /**
   * A bridged resource type was removed.
   */
  event BridgedResourceTypeRemoved(uint256 indexed id);

  /**
   * The owner for this contract is the underlying game.
   */
  constructor(address _game, address _economy) public Ownable(_game) {
    require(_economy != address(0), "Bridge: the economy must not be null");
    require(_economy.supportsInterface(type(IERC1155).interfaceId));
    economy = _economy;
  }

  /**
   * Sends an amount of units of certain tokens to a target address.
   */
  function sendTokens(address _to, uint256 _id, uint256 _units) external onlyOwner {
    require(_units > 0, "Bridge: cannot send 0 units");
    BridgedResourceType storage resourceType = bridgedResourceTypes[_id];
    require(resourceType.created, "Bridge: resource not defined");
    IERC1155(economy).safeTransferFrom(
      address(this), _to, _id, _units * resourceType.amountPerUnit
    );
  }

  /**
   * Defines a bridged resource type.
   */
  function defineBridgedResourceType(uint256 _id, uint256 _amountPerUnit) external onlyOwner {
    require(!terminated, "Bridge: already terminated");
    require(_amountPerUnit, "Bridge: cannot define resource with 0 units");
    bridgedResourceTypes[_id] = BridgedResourceType(true, true, _amountPerUnit);
    emit BridgedResourceTypeDefined(_id, _amountPerUnit);
  }

  /**
   * Removes a bridged resource type.
   */
  function removeBridgedResourceType(uint256 _id) external onlyOwner {
    require(!terminated, "Bridge: already terminated");
    BridgedResourceType storage bridgedResourceType = bridgedResourceTypes[_id];
    require(bridgedResourceType.created, "Bridge: resource not defined");
    bridgedResourceType.active = false;
    emit BridgedResourceTypeRemoved(_id);
  }

  /**
   * Terminates the contract. No more bridged resource type definitions
   * or removals will be allowed.
   */
  function terminate() external onlyOwner {
    terminated = true;
  }
}
