import Web3 from "web3";

if (typeof web3 !== 'undefined')
  web3 = new Web3(web3.currentProvider);
else
  console.error("No web3 provider found!");

export default web3;
