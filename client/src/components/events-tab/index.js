import m from "mithril";
import Stream from "mithril/stream";
import moment from "moment";
import web3 from "web3-wrapper";
import { ExecutionEvent, WorkflowCreationEvent } from "components/events-tab/contract-event";
import WorkflowManager from "workflow-manager";

class Events {
  view(vnode) {
    return m("section.section.events-section", m("table.table", [
      m("thead", [
        m("tr", [
          m("td", "Date"),
          m("td", "Event"),
          m("td", "User"),
          m("td")
        ])
      ]),
      vnode.attrs.workflowManager.events().map(event => {
        let component;
        switch (event.type) {
          case "execution":
            component = ExecutionEvent;
            break;
          case "workflow-creation":
            component = WorkflowCreationEvent;
            break;
          default:
            console.error("Unknown event type", event.type);
            return m("tr");
        }
        return m(component, { event: event })
      })
    ]));
  }
}

export default Events;
