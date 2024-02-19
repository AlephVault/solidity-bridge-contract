// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";

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
contract Bridge is Ownable, IERC1155Receiver {
  using ERC165Checker for address;

  /**
   * A return value for the IERC1155 callback.
   */
  bytes4 public constant IERC1155_OK = bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"));

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
   * The details for a received parcel.
   */
  struct BridgedResourceParcel {
    /**
     * Flag telling the entry exists. Always true for
     * created records.
     */
    bool created;

    /**
     * The ID of the mapped resource.
     */
    uint256 id;

    /**
     * The amount of units to redeem.
     */
    uint256 units;
  }

  /**
   * The received parcels.
   */
  mapping(bytes32 => BridgedResourceParcel) public parcels;

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
      address(this), _to, _id, _units * resourceType.amountPerUnit, ""
    );
  }

  /**
   * Defines a bridged resource type.
   */
  function defineBridgedResourceType(uint256 _id, uint256 _amountPerUnit) external onlyOwner {
    require(!terminated, "Bridge: already terminated");
    require(_amountPerUnit != 0, "Bridge: cannot define resource with 0 units");
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

  /**
   * Stores a parcel for the given resource and from the given data.
   */
  function storeParcel(uint256 _id, uint256 _value, uint256 _amountPerUnit, bytes calldata _data) private {
    // Require the parcel id to NOT be present.
    bytes32 parcelId = abi.decode(_data, (bytes32));
    require(!parcels[parcelId].created, "Bridge: parcel id already taken");
    // Requires the amount to be divisible by the units, and get the amount of units.
    require(_value % _amountPerUnit == 0, "Bridge: invalid amount");
    uint256 units = _value / _amountPerUnit;
    // Register the parcel.
    parcels[parcelId] = BridgedResourceParcel(true, _id, units);
  }

  /**
   * Receives tokens. It gets the corresponding units, always checking
   * the amount is aligned to the amount per unit in the resource. In
   * the end, the user must ensure the in-game redemption of the parcel
   * by the id used here in the data (data==abi.encode(parcelId)).
   */
  function onERC1155Received(
    address operator, address from, uint256 id, uint256 value, bytes calldata data
  ) external returns (bytes4) {
    // Requires the game to be not terminated.
    require(!terminated, "Bridge: already terminated");
    // Requires the sender to be the ERC1155 contract.
    require(msg.sender == economy, "Bridge: invalid sender");
    // Requires the resource type to be defined.
    BridgedResourceType storage bridgedResourceType = bridgedResourceTypes[id];
    require(bridgedResourceType.active, "Bridge: resource not defined");
    if (from != address(0)) {
      // This occurs when it is NOT a direct mint.
      //
      // NOTES: It is valid to have direct mints. When a mint is direct, then
      // no parcel allocation will occur. For this to work, the corresponding
      // contract must implement its own method(s) to mint tokens to fund a
      // given Bridge.
      //
      // Registers the incoming parcel.
      storeParcel(id, value, bridgedResourceType.amountPerUnit, data);
    }
    return IERC1155_OK;
  }

  /**
   * Ensures the batch transfer is not allowed.
   */
  function onERC1155BatchReceived(
    address operator,
    address from,
    uint256[] calldata ids,
    uint256[] calldata values,
    bytes calldata data
  ) external returns (bytes4) {
    revert("Bridge: batch transfer is not allowed");
  }

  /**
   * The only interface meant to be implemented here is IERC1155Receiver.
   */
  function supportsInterface(bytes4 interfaceId) external view returns (bool) {
    return interfaceId == type(IERC1155Receiver).interfaceId;
  }
}
