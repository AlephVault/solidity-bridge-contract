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
  let bridge = null;

  before(async function() {
    tokens = await Tokens.new(accounts[0]);
    bridge = await Bridge.new(accounts[0], tokens.address);
  });

  function _in(from, to, id, value, data) {
    return tokens.safeTransferFrom(from, to, id, value, data, {from: from});
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

  // await tokens.safeTransferFrom(from, to, id, value, data, {from: from})

  // TODO implement the tests.
  it("should assert true", async function () {
    // await Bridge.deployed();
    return assert.isTrue(true);
  });
});
