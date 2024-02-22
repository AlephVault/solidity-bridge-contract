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
  const CREATED = new BN(1);
  const ACTIVE = new BN(3);
  // const FULL_AMOUNT = new BN("0x20000");

  async function _makeContracts() {
    tokens = await Tokens.new();
    bridge = await Bridge.new(accounts[0], tokens.address);
  }

  before(async function() {
    otherTokens = await Tokens.new();
    await _makeContracts();
  });

  function _hash(value) {
    return web3.utils.soliditySha3(value);
  }

  function _data(hash) {
    return web3.eth.abi.encodeParameters(["bytes32"], [hash]);
  }

  function _in(from, id, value, data) {
    return tokens.safeTransferFrom(from, bridge.address, id, value, data || "0x", {from: from});
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

  async function _testSuccessfulDefine(token, units, again) {
    if (!again) assert.isTrue((await _getType(token))["status"].cmp(ACTIVE) !== 0);
    expectEvent(
      await _defineType(token, units || UNITS1, accounts[0]),
      "BridgedResourceTypeDefined", [token, units || UNITS1]
    );
    assert.isTrue((await _getType(token))["status"].cmp(ACTIVE) === 0);
  }

  async function _testSuccessfulRemove(token) {
    assert.isTrue((await _getType(token))["status"].cmp(0) !== 0);
    expectEvent(
      await _removeType(token, accounts[0]),
      "BridgedResourceTypeRemoved", [token]
    );
    assert.isTrue((await _getType(token))["status"].cmp(CREATED) === 0);
  }

  // All the tests I'll do:

  // 1. Fails to define an item type TOKEN1 while not being owner.
  it("must fail to define an item type TOKEN1 while not being owner", async function() {
    // Unspecified because it works like shit for custom errors.
    await expectRevert.unspecified(_defineType(TOKEN1, UNITS1, accounts[1]));
  });

  // 2. Fails to define an item type TOKEN1 while being owner, but using an amount of 0.
  it("must fail to define an item type TOKEN1 while being owner, but using an amount of 0", async function() {
    await expectRevert(
      _defineType(TOKEN1, 0, accounts[0]),
      "Bridge: cannot define resource with 0 units"
    );
  })

  // 3. Succeeds defining an item.
  it("must succeed defining an item type TOKEN1 while being owner and using a non-zero units", async function() {
    await _testSuccessfulDefine(TOKEN1, new BN(1));
  });

  // 4. Succeeds updating the item.
  it("must succeed updating the item type TOKEN1, again, while being owner and using another units", async function(){
    await _testSuccessfulDefine(TOKEN1, UNITS1, true);
  });

  // 5. Fails to remove an item type TOKEN1 while not being owner.
  it("must fail to remove an item type TOKEN1 while not being owner", async function() {
    await expectRevert.unspecified(_removeType(TOKEN1, accounts[1]));
  });

  // 6. Fails to remove a non-existing item type TOKEN2.
  it("must fail to remove a non-existing item type TOKEN2", async function() {
    await expectRevert(_removeType(TOKEN2, accounts[0]), "Bridge: resource not defined");
  });

  // 7. Succeeds removing an item type TOKEN1.
  it("must succeed removing an item type TOKEN1", async function() {
    await _testSuccessfulRemove(TOKEN1);
  });

  // 8. Succeeds defining a new item TOKEN2.
  it("must succeed defining a new item type TOKEN2", async function() {
    await _testSuccessfulDefine(TOKEN2);
  });

  // 9. Succeeds defining the item type TOKEN1 again.
  it("must succeed defining the item type TOKEN1 again", async function() {
    await _testSuccessfulDefine(TOKEN1);
  });

  // 10. Defines item types TOKEN3, TOKEN4, TOKEN5.
  it("must succeed defining the item types TOKEN3, TOKEN4, TOKEN5", async function() {
    await _testSuccessfulDefine(TOKEN3);
    await _testSuccessfulDefine(TOKEN4);
    await _testSuccessfulDefine(TOKEN5);
  });

  // 11. Fails to terminate when the requester is not the owner.
  it("must fail to terminate when not done by the owner", async function() {
    await expectRevert.unspecified(_terminate(accounts[1]));
  });

  // 12. Succeeds terminating when the requester is the owner.
  it("must succeed terminating when done by the owner", async function() {
    await _terminate(accounts[0]);
  });

  // 13. Fails to define an item type TOKEN6 while not being the owner.
  it("must fail to define an item type TOKEN6 while not being the owner", async function() {
    await expectRevert.unspecified(_defineType(TOKEN6, UNITS1, accounts[1]));
  })

  // 14. Fails to define an item type TOKEN6 while being owner, because it is terminated.
  it("must fail to define an item TOKEN6 while being the owner, because it is terminated", async function() {
    await expectRevert(_defineType(TOKEN6, UNITS1, accounts[0]), "Bridge: already terminated");
  });

  // 15. Fails to remove an item type TOKEN5 while not being the owner.
  it("must fail to remove an item type TOKEN5 while not being the owner", async function() {
    await expectRevert.unspecified(_removeType(TOKEN5, accounts[1]));
  });

  // 16. Fails to remove an item type TOKEN5 while being owner, because it is terminated.
  it("must fails to remove an item type TOKEN5 while being owner, because it is terminated", async function() {
    await expectRevert(_removeType(TOKEN5, accounts[0]), "Bridge: already terminated");
  });

  // 15. Re-create the contracts with _makeContracts().
  it("must re-create the contract successfully", async function() {
    await _makeContracts();
  });

  // The next tests can be done by ANYONE.

  // 1. Mint: TOKEN1 to account 1.
  it("mints some tokens of TOKEN1 to account 1, and also to the bridge", async function() {
    await tokens.mint(accounts[1], TOKEN1, {from: accounts[0]});
  });

  // 2. Succeeds minting TOKEN1 directly to the bridge (even when TOKEN1 is not defined there).
  it("must succeed directly minting to the bridge", async function() {
    await tokens.mint(bridge.address, TOKEN1, {from: accounts[0]});
  });

  // 3. Fails to transfer TOKEN1 from account 1 to the bridge, since no data is sent.
  it("must fail to transfer TOKEN1 from account 1 to the bridge, since no data is sent", async function() {
    await expectRevert.unspecified(_in(accounts[1], TOKEN1, UNITS1));
  });

  // 4. Fails to transfer TOKEN1 from account 1 to the bridge, with shit data, since invalid bytes32 data is sent.
  it("must fail to transfer TOKEN1 from account 1 to the bridge, with shit data, since invalid bytes32 data is sent", async function() {
    await expectRevert.unspecified(
      _in(accounts[1], TOKEN1, UNITS1, web3.eth.abi.encodeParameters(["string"], ["foo"]))
    );
  });

  // 5. Fails to transfer TOKEN1 from account 1 to the bridge, with good data, since TOKEN1 is not defined there.
  it("must fail to transfer TOKEN1 from account 1 to the bridge, with good data, since TOKEN1 is not defined there", async function() {
    await expectRevert(
      _in(accounts[1], TOKEN1, UNITS1, _data(_hash("PARCEL1"))),
      "Bridge: resource not defined"
    );
  });

  // 6. Register TOKEN1 item type.
  it("registers the TOKEN1 item type", async function() {
    await _defineType(TOKEN1, UNITS1, accounts[0]);
  });

  // 7. Succeeds transferring TOKEN1 from account 1 to the bridge, with an amount of 3 * UNITS1 & data=encode(PARCEL1).
  it("succeeds transferring TOKEN1 from account 1 to the bridge, with an amount of 3 * UNITS1 & data=encode(PARCEL1)", async function() {
    let parcelId = _data(_hash("PARCEL1"));
    assert.isTrue(!(await _getParcel(parcelId)).created);
    await _in(accounts[1], TOKEN1, 3 * UNITS1, _data(_hash("PARCEL1")));
    assert.isTrue((await _getParcel(parcelId)).created);
  });

  // 8. Fails transferring TOKEN1 from account 1 to the bridge, with an amount of 3 * UNITS1 & data=encode(PARCEL1).
  //    This, because the parcel code is already registered.
  it("fails transferring TOKEN1 from account 1 to the bridge, with an amount of 3 * UNITS1 & data=encode(PARCEL1), since it is already registered", async function() {
    await expectRevert(
      _in(accounts[1], TOKEN1, 3 * UNITS1, _data(_hash("PARCEL1"))),
      "Bridge: parcel id already taken"
    );
  });

  // 9. Fails transferring TOKEN1 from account 1 to the bridge, with a valid data=encode(PARCEL2) but invalid units.
  it("fails transferring TOKEN1 from account 1 to the bridge, with a valid data=encode(PARCEL2) but invalid units", async function() {
    await expectRevert(
        _in(accounts[1], TOKEN1, (3 * UNITS1 / 256), _data(_hash("PARCEL2"))),
        "Bridge: invalid amount"
    );
  });

  // 10. Succeeds transferring TOKEN1 from account 1 to the bridge, using PARCEL2 and valid units (3 * UNITS1).
  // 11. Ensure the PARCEL2 is being registered (and also PARCEL1 is there).
  // 12. Succeeds transferring TOKEN1 from account 1 to the bridge, using PARCEL_NONE and 1.5 * UNITS1.
  // 13. Ensure PARCEL1 and PARCEL2 are registered, but PARCEL_NONE is not registered.
  // 14. Remove TOKEN1.
  // 15. Succeeds transferring TOKEN1 from account 1 to the bridge, using PARCEL_NONE and  1.5 * UNITS1.
  // 16. Succeeds minting TOKEN1 to the bridge.
  // 17. Fails transferring TOKEN1 from account 1 to the bridge, using PARCEL3 and valid units (3 * UNITS1).
  //     This, because the item is not defined.
  // 18. Define TOKEN1 again, same units.
  // 19. Succeeds transferring TOKEN1 from account 1 to the bridge, using PARCEL3 and valid units (3 * UNITS1).
  // 20. Succeeds transferring (via sendUnits) 4 units of TOKEN1 to account 1.
  // 21. Fails transferring (via sendUnits) 6 units of TOKEN5 to account 1 (doesn't have funds of that).
  // 22. Terminates!!!.
  // 23. Succeeds transferring (via send) the equivalent of 8 units of TOKEN1 to account 1.
  // 24. Fails transferring (via sendUnits) 1 unit of TOKEN1 to account 1 (No funds).
  // 25. Fails transferring TOKEN1 from account 1 to the bridge, using PARCEL4 and a valid units (3 * UNITS1).
  //     Reason: Terminated.

  // TODO implement the tests.
  it("should assert true", async function () {
    // console.log(new BN("0x100000000").toString())
    // await Bridge.deployed();
    return assert.isTrue(true);
  });
});
