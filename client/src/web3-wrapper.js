import Web3 from "web3";

if (typeof web3 !== 'undefined')
  web3 = new Web3(web3.currentProvider);
else
  console.error("No web3 provider found!");

web3.eth.defaultAccount = web3.eth.defaultAccount || web3.eth.accounts[0];

export default web3;
