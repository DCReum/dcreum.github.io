import "./styles.scss";
import m from "mithril";
import Stream from "mithril/stream";
import WorkflowTab from "components/workflow-tab";
import EventsTab from "components/events-tab";

class Workflow {
  view() {
    const panes = {
      workflow: WorkflowTab,
      events: EventsTab,
      settings: "span"
    };

    let workflowId = m.route.param("workflowId");
    let tab = m.route.param("tab");
    let setTab = (to) => m.route.set(`/workflow/${workflowId}/${to}`);

    return m("section#workspace", [
      m("nav.nav.is-primary.has-shadow",
          m("div.nav-left", [
            m("a.nav-item.is-tab" + (tab === "workflow" ? ".is-active" : ""), { onclick: () => setTab("workflow") }, "Workflow"),
            m("a.nav-item.is-tab" + (tab === "events"   ? ".is-active" : ""), { onclick: () => setTab("events")   }, "Events"),
            m("a.nav-item.is-tab" + (tab === "settings" ? ".is-active" : ""), { onclick: () => setTab("settings") }, "Settings")
          ])
      ),
      m(panes[tab])
    ]);
  }
}

export default Workflow
