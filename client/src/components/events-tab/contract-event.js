import "./styles.scss";
import m from "mithril";
import moment from "moment";
import mutil from "mutil.js";
import { WorkflowManager } from "workflow-manager";

class ContractEvent {
  constructor(vnode) {
    this.event = vnode.attrs.event;
    this.showDropdown = false;
    this.onclick = this.onclick.bind(this);
  }

  body(dropdown, eventType) {
    return m("tbody.contract-event", { onclick: this.onclick }, [
      m("tr", [
        m("td", moment(this.event.timestamp).format("lll")),
        m("td", eventType),
        m("td",
          m("a", { href: this.event.senderHref, onclick: mutil.stopEvent }, this.event.senderName)
        ),
        m("td",
          m("button.button.is-small",
            m("i.fa", { class: this.showDropdown ? "fa-chevron-up" : "fa-chevron-down" })
          )
        )
      ]),
      m("tr",
        m("td.dropdown", { colspan: 4, class: mutil.visible(this.showDropdown), onclick: mutil.stopEvent }, dropdown)
      )
    ]);
  }

  onclick() {
    this.showDropdown = !this.showDropdown;
  }
}

class ExecutionEvent extends ContractEvent {
  constructor(vnode) {
    super(vnode);
    this.type = "execution";
    this.activityId = this.event.activityId;
    this.activityName = this.event.activityName;
    this.activityHref = this.event.activityHref;
  }

  view() {
    // Don't show the same information twice
    let showSenderAddress = this.event.senderName !== this.event.senderAddress;

    return super.body(
      m("div", [
        m("div.column", [
          m("h1", "ACTIVITY"),
          m("a", { href: `/workflow/${this.event.workflowId}`, oncreate: m.route.link }, this.event.activityName),
          m("p.extra-info", `Global ID ${this.activityId}`)
        ]),
        m("div.column", [
          m("h1", "EXECUTOR"),
          m("a", { href: WorkflowManager.addressHref(this.event.senderAddress) }, this.event.senderName),
          showSenderAddress ? m("p.extra-info", `${this.event.senderAddress}`) : null
        ]),
        m("div.column", [
          m("h1", "BLOCK"),
          m("a", { href: WorkflowManager.blockHref(this.event.blockNumber) }, `#${this.event.blockNumber}`),
          m("p.extra-info", this.event.blockHash)
        ]),
        m("div.column", [
          m("h1", "TRANSACTION"),
          m("a", { href: WorkflowManager.transactionHref(this.event.transactionHash) }, this.event.transactionHash)
        ])
      ]),

      // Event type
      m("span.tag.is-warning", this.type)
    );
  }
}

class WorkflowCreationEvent extends ContractEvent {
  constructor(vnode) {
    super(vnode);
    this.type = "creation";
    this.workflowId = this.event.workflowId;
    this.workflowName = this.event.workflowName;
    this.workflowHref = this.event.workflowHref;
  }

  view() {
    // Don't show the same information twice
    let showSenderAddress = this.event.senderName !== this.event.senderAddress;

    return super.body(
      m("div", [
        m("div.column", [
          m("h1", "WORKFLOW"),
          m("a", { href: `/workflow/${this.event.workflowId}`, oncreate: m.route.link }, this.event.workflowName),
          m("p.extra-info", `Global ID ${this.workflowId}`)
        ]),
        m("div.column", [
          m("h1", "CREATOR"),
          m("a", { href: WorkflowManager.addressHref(this.event.senderAddress) }, this.event.senderName),
          showSenderAddress ? m("p.extra-info", `${this.event.senderAddress}`) : null
        ]),
        m("div.column", [
          m("h1", "BLOCK"),
          m("a", { href: WorkflowManager.blockHref(this.event.blockNumber) }, `#${this.event.blockNumber}`),
          m("p.extra-info", this.event.blockHash)
        ]),
        m("div.column", [
          m("h1", "TRANSACTION"),
          m("a", { href: WorkflowManager.transactionHref(this.event.transactionHash) }, this.event.transactionHash)
        ])
      ]),

      // Event type
      m("span.tag.is-success", this.type)
    );
  }
}

export { ExecutionEvent, WorkflowCreationEvent };
