import * as web3 from "web3";

document.addEventListener("DOMContentLoaded", function(event) { 
  document.getElementById("pkey").innerHTML = web3.eth.accounts[0];
  console.debug("test");
});
