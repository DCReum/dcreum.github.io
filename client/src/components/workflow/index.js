import "./styles.scss";
import m from "mithril";
import Stream from "mithril/stream";
import WorkflowTab from "components/workflow-tab";
import EventsTab from "components/events-tab";
import Create from "components/create";
import { WorkflowManager } from "workflow-manager";

class Workflow {
  constructor() {
    this.workflowManager = new WorkflowManager(m.route.param("workflowId"));
  }

  view() {
    if (m.route.param("workflowId") != this.workflowManager.workflowId)
      this.workflowManager = new WorkflowManager(m.route.param("workflowId"));

    const panes = {
      workflow: WorkflowTab,
      events: EventsTab
    };

    let workflowId = m.route.param("workflowId");
    let tab = m.route.param("tab");
    let tabUrl = (to) => `/workflow/${workflowId}/${to}`;

    return m("section.workflow", [
      m("nav.nav.is-primary.has-shadow", [
          m("div.nav-left", [
            m("a.nav-item.is-tab" + (tab === "workflow" ? ".is-active" : ""), { href: tabUrl("workflow"), oncreate: m.route.link }, "Workflow"),
            m("a.nav-item.is-tab" + (tab === "events" ? ".is-active" : ""), { href: tabUrl("events"), oncreate: m.route.link }, "Events"),
          ]),
          m("div.nav-right", [
            m("a.nav-item.is-tab", { href: "/create", oncreate: m.route.link }, "Create new")
          ])
      ]),
      m("div.workspace", m(panes[tab], { workflowManager: this.workflowManager }))
    ]);
  }
}

export default Workflow
