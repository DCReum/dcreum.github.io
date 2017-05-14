import "bulma";
import "font-awesome/scss/font-awesome.scss";
import m from "mithril";
import DashPage from "components/dash-page";
import Create from "components/create";
import Workflow from "components/workflow";

let wrap = component => m(DashPage, m(component));

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
