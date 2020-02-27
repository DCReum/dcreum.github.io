import Web3 from "web3";

const wrapper = {};

window.addEventListener("load", function() {
  console.log("Wrapping web3");
  if (typeof window.web3 !== "undefined")
    window.web3 = new Web3(window.web3.currentProvider);
  else
    console.error("No web3 provider found!");

  if (window.web3) {
    ethereum.enable();
    window.web3.eth.defaultAccount = window.web3.eth.defaultAccount || window.web3.eth.accounts[0];
  }
  wrapper.web3 = window.web3;
});

export default wrapper;
