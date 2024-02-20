const Bridge = artifacts.require("Bridge");
const Tokens = artifacts.require("Tokens");
const {
  BN,           // Big Number support
  constants,    // Common constants, like the zero address and largest integers
  expectEvent,  // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

contract("Bridge", function (accounts) {
  let tokens = null;
  let otherTokens = null;
  let bridge = null;
  const PARCEL_NONE = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
  const TOKEN1 = new BN("0x100000000");
  const TOKEN2 = new BN("0x100000001");
  const TOKEN3 = new BN("0x100000002");
  const TOKEN4 = new BN("0x100000003");
  const TOKEN5 = new BN("0x100000004");
  const TOKEN6 = new BN("0x100000004");
  const UNITS1 = new BN("0x10000");
  const UNITS1b = new BN("0x20000");
  // const FULL_AMOUNT = new BN("0x20000");

  async function _makeContracts() {
    tokens = await Tokens.new();
    bridge = await Bridge.new(accounts[0], tokens.address);
  }

  before(async function() {
    otherTokens = await Tokens.new();
    await _makeContracts();
  });

  function _in(from, to, id, value, data) {
    return tokens.safeTransferFrom(from, to, id, value, data || "0x", {from: from});
  }

  function _out(to, id, units, from) {
    return bridge.sendTokens(to, id, units, {from: from || accounts[0]});
  }

  function _getType(id) {
    return bridge.bridgedResourceTypes(id);
  }

  function _getParcel(parcelId) {
    return bridge.parcels(parcelId);
  }

  function _getTerminated() {
    return bridge.terminated();
  }

  function _defineType(typeId, amountPerUnit, from) {
    return bridge.defineBridgedResourceType(typeId, amountPerUnit, {from: from || accounts[0]});
  }

  function _removeType(typeId, from) {
    return bridge.removeBridgedResourceType(typeId, {from: from || accounts[0]});
  }

  function _terminate(from) {
    return bridge.terminate({from: from || accounts[0]});
  }

  // All the tests I'll do:

  // 1. Fails to define an item type TOKEN1 while not being owner.
  // 2. Fails to define an item type TOKEN1 while being owner, but using an amount of 0.
  // 3. Succeeds defining an item.
  // 4. Succeeds updating the item.
  // 5. Fails to remove an item type TOKEN1 while not being owner.
  // 6. Fails to remove a non-existing item type TOKEN2.
  // 7. Succeeds removing an item type TOKEN1.
  // 8. Succeeds defining a new item TOKEN2.
  // 9. Succeeds defining the item type TOKEN1 again.
  // 10. Define item types TOKEN3, TOKEN4, TOKEN5.
  // 11. Ensure TOKEN1, TOKEN2, TOKEN3, TOKEN4, TOKEN5 are defined and active.
  // 12. Terminates!!!.
  // 13. Fails to define an item type TOKEN6 while not being the owner.
  // 14. Fails to define an item type TOKEN6 while being owner, because it is terminated.
  // 15. Re-create the contracts with _makeContracts().

  // The next tests can be done by ANYONE.

  // 1. Mint: TOKEN1 to account 1, and also TOKEN1 to the bridge.
  // 2. Succeeds minting TOKEN1 directly to the bridge (even when TOKEN1 is not defined there).
  // 3. Fails to transfer TOKEN1 from account 1 to the bridge, since no data is sent.
  // 4. Fails to transfer TOKEN1 from account 1 to the bridge, with shit data, since invalid bytes32 data is sent.
  // 5. Fails to transfer TOKEN1 from account 1 to the bridge, with good data, since TOKEN1 is not defined there.
  // 6. Register TOKEN1 item type.
  // 7. Define TOKEN1 with an amount of UNITS1.
  // 8. Succeeds transferring TOKEN1 from account 1 to the bridge, with an amount of 3 * UNITS1 & data=encode(PARCEL1).
  // 9. Fails transferring TOKEN1 from account 1 to the bridge, with an amount of 3 * UNITS1 & data=encode(PARCEL1).
  //    This, because the parcel code is already registered.
  // 10. Ensures the PARCEL1 is being registered.
  // 11. Fails transferring TOKEN1 from account 1 to the bridge, with a valid data=encode(PARCEL2) but invalid units.
  // 12. Succeeds transferring TOKEN1 from account 1 to the bridge, using PARCEL2 and valid units (3 * UNITS1).
  // 13. Ensure the PARCEL2 is being registered (and also PARCEL1 is there).
  // 14. Succeeds transferring TOKEN1 from account 1 to the bridge, using PARCEL_NONE and 1.5 * UNITS1.
  // 15. Ensure PARCEL1 and PARCEL2 are registered, but PARCEL_NONE is not registered.
  // 16. Remove TOKEN1.
  // 17. Succeeds transferring TOKEN1 from account 1 to the bridge, using PARCEL_NONE and  1.5 * UNITS1.
  // 18. Succeeds minting TOKEN1 to the bridge.
  // 19. Fails transferring TOKEN1 from account 1 to the bridge, using PARCEL3 and valid units (3 * UNITS1).
  //     This, because the item is not defined.
  // 20. Define TOKEN1 again, same units.
  // 21. Succeeds transferring TOKEN1 from account 1 to the bridge, using PARCEL3 and valid units (3 * UNITS1).
  // 22. Succeeds transferring (via sendUnits) 4 units of TOKEN1 to account 1.
  // 23. Fails transferring (via sendUnits) 6 units of TOKEN5 to account 1 (doesn't have funds of that).
  // 24. Terminates!!!.
  // 25. Succeeds transferring (via send) the equivalent of 8 units of TOKEN1 to account 1.
  // 26. Fails transferring (via sendUnits) 1 unit of TOKEN1 to account 1 (No funds).
  // 27. Fails transferring TOKEN1 from account 1 to the bridge, using PARCEL4 and a valid units (3 * UNITS1).
  //     Reason: Terminated.

  // TODO implement the tests.
  it("should assert true", async function () {
    // console.log(new BN("0x100000000").toString())
    // await Bridge.deployed();
    return assert.isTrue(true);
  });
});
