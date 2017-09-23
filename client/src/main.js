import "bulma";
import "font-awesome/scss/font-awesome.scss";
import m from "mithril";
import DashPage from "components/dash-page";
import Create from "components/create";
import Workflow from "components/workflow";
import Web3ErrorPage from "components/web3-error-page";
import web3wrapper from "web3-wrapper";

let wrap = component => m(DashPage, m(component));

window.addEventListener('load', function() {
  console.log("Page initialization");
  if (web3wrapper.web3) {
    m.route(document.body, "/", {
      "/": {
        onmatch: (args, path) => m.route.set("/create")
      },
      "/create": {
        render: () => wrap(Create)
      },
      "/workflow/:workflowId": {
        onmatch: (args, path) => m.route.set(`/workflow/${args.workflowId}/workflow`)
      },
      "/workflow/:workflowId/:tab": {
        render: () => wrap(Workflow)
      }
    });
  }
  else {
    m.render(document.body, m(Web3ErrorPage));
  }
})

