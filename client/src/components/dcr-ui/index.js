import "./styles.scss";
import m from "mithril";
import cytoscape from "cytoscape";
import { WorkflowManager, Workflow, Activity, Relation } from "workflow-manager";
import Stream from "mithril/stream";

class DcrUi {
  constructor() {
    this.createGraph = this.createGraph.bind(this);
    this.updateGraph = this.updateGraph.bind(this);
    this.publish = this.publish.bind(this);
    
    this.selectedActivityId = Stream();
    this.executing = [];
    this.workflowName = Stream("New workflow");
    this.activities = [];
    this.relations = [];
    this.publishHash = Stream();
    this.publishWorkflowId = Stream();
  }

  updateGraph(vnode) {
    let manager = vnode.attrs.workflowManager;

    this.cy.batch(() => {
      let activities = manager ? manager.activities() : this.activities;
      let relations = manager ? manager.relations() : this.relations;

      activities.forEach((activity, i) => {
        let classes = [];
        if (activity.isIncluded) classes.push("included");
        if (activity.isExecuted) classes.push("executed");
        if (activity.isPending) classes.push("pending");
        if (activity.canExecute) classes.push("executable");

        let node = this.cy.elements("#n" + i);
        if (node.empty()) {
          this.cy.add({
            data: {
              id: "n" + i
            },
            position: activity.initialPosition,
            classes: classes.join(" "),
            style: {
              label: activity.name
            }
          });
        } else {
          node.classes(classes.join(" "));
          node.style("label", activity.name);
        }
        activity.initialPosition = null;
      });

      this.cy.elements("edge").remove();
      relations.forEach((relation, i) => {
        this.cy.add({
          data: {
            id: "e" + i,
            source: "n" + relation.from,
            target: "n" + relation.to
          },
          classes: relation.type
        });
      });
    });
  }

  createGraph(vnode) {
    let manager = vnode.attrs.workflowManager;
    let nodes = manager
      ? manager.activities().map((activity, i) => {
          let classes = [];
          if (activity.isIncluded) classes.push("included");
          if (activity.isExecuted) classes.push("executed");
          if (activity.isPending) classes.push("pending");
          if (activity.canExecute) classes.push("executable");

          return {
            data: {
              id: "n" + i
            },
            classes: classes.join(" "),
            style: {
              label: activity.name
            }
          };
        })
      : [];
    let edges = manager
      ? manager.relations().map((relation, i) => ({
          data: {
            id: "e" + i,
            source: "n" + relation.from,
            target: "n" + relation.to
          },
          classes: relation.type
        }))
      : [];

    this.cy = cytoscape({
      container: vnode.dom,
      elements: nodes.concat(edges),
      layout: { name: "grid" },
      style: [
        {
          selector: "node",
          style: {
            "shape": "rectangle",
            "height": 35,
            "width": 65,
            "background-color": "#ccc",
            "border-style": "dashed",
            "border-width": 1,
            "border-color": "#777",
            "color": "#777",
            "font-size": 6,
            "font-weight": "bold",
            "text-halign": "center",
            "text-valign": "center",
            "text-wrap": "ellipsis",
            "text-max-width": 60
          }
        },
        {
          selector: "node.executable",
          style: {
            "border-color": "#454545",
            "color": "#454545",
            "background-color": "#fafafa",
          }
        },
        {
          selector: "node.included",
          style: {
            "border-style": "solid"
          }
        },
        {
          selector: "node.executed",
          style: {
            "color": "#29A81A"
          }
        },
        {
          selector: "node.pending",
          style: {
            "border-color": "#1E90FF"
          }
        },
        {
          selector: "node:selected",
          style: {
            "border-width": 2
          }
        },
        
        {
          selector: "edge",
          style: {
            "width": 2,
            "curve-style": "bezier",
            "source-endpoint": "inside-to-node"
          }
        },
        {
          selector: "edge.include, edge.exclude, edge.response",
          style: {
            "target-arrow-shape": "triangle"
          }
        },
        {
          selector: "edge.include",
          style: {
            "line-color": "#29A81A",
            "target-arrow-color": "#29A81A"
          }
        },
        {
          selector: "edge.exclude",
          style: {
            "line-color": "#FF0000",
            "target-arrow-color": "#FF0000"
          }
        },
        {
          selector: "edge.response",
          style: {
            "line-color": "#1E90FF",
            "target-arrow-color": "#1E90FF"
          }
        },
        {
          selector: "edge.condition",
          style: {
            "line-color": "#FFA500",
            "target-arrow-color": "#FFA500",
            "target-arrow-shape": "circle"
          }
        },
        {
          selector: "edge.milestone",
          style: {
            "line-color": "#BC1AF2",
            "target-arrow-color": "#BC1AF2",
            "target-arrow-shape": "diamond"
          }
        },
        {
          selector: "edge:selected",
          style: {
            "line-color": "#00d1b2",
            "target-arrow-color": "#00d1b2",
          }
        },
      ],
      boxSelectionEnabled: false,
    });

    // Only allow single element to be selected
    this.cy.on("select", "*", event =>
      this.cy.collection("*:selected").not(event.target).unselect()
    );

    this.cy.on("select", "node", event => {
      this.selectedActivityId(parseInt(event.target.data("id").replace("n", "")));
      m.redraw();
    });

    this.cy.on("unselect", "node", event => {
      if (this.ctxActive) return;
      this.selectedActivityId(null);
      m.redraw();
    });

    if (vnode.attrs.editable) {
      this.cy.on("cxttap", event => {
        this.ctxActive = true
        this.ctxDomPosition = { x: event.originalEvent.offsetX, y: event.originalEvent.offsetY };
        this.ctxPosition = event.position;
        this.ctxTarget = event.target;
        this.ctxTargetGroup = event.target.group ? event.target.group() : "none";
        m.redraw();
      });
    }
  }

  onExecute(workflowManager) {
    let activityId = this.selectedActivityId();
    workflowManager.execute(m.route.param("workflowId"), activityId, (error, txhash) => {
      this.executing[activityId] = txhash;
      m.redraw();
    });
  }

  publish() {
    let args = new Workflow(this.workflowName(), this.activities, this.relations).getContractArguments();
    console.log("publish", args);
    console.log(WorkflowManager.contract.createWorkflow.getData.apply(this, args));
    WorkflowManager.createWorkflow.apply(this, args)
      .then(this.publishHash)
      .then(() => m.redraw())
      .then(() => {
        let filter = WorkflowManager.contract.LogWorkflowCreation({ fromBlock: "latest" });
        filter.watch((error, event) => {
          if (event.transactionHash === this.publishHash()) {
            filter.stopWatching();
            this.publishWorkflowId(event.args.workflowId.toNumber());
            m.redraw();
          }
        })
      });;
    
  }

  view(vnode) {
    let editable = !!vnode.attrs.editable;
    let manager = vnode.attrs.workflowManager;
    let selected = manager
      ? manager.activities()[this.selectedActivityId()]
      : this.activities[this.selectedActivityId()];

    if (manager) {
      manager.events().forEach(event => {
        this.executing.forEach((txhash, i) => {
          if (event.transactionHash == txhash)
            delete this.executing[i];
        });
      });
    }

    let showRelationCtxItems = !!selected && this.ctxTargetGroup === "nodes";
    let addRelation = type => {
      let targetActivityId = parseInt(this.ctxTarget.data("id").replace("n", ""));
      let relation = new Relation(this.selectedActivityId(), targetActivityId, type);
      if (this.relations.find(r => r && r.from === relation.from && r.to === relation.to && r.type == relation.type))
        return; // no duplicates
      this.relations.push(relation);
    };

    if (this.cy && this.cy.elements(":selected").empty() && selected)
      this.cy.elements("#n" + selected.id).select();

    return m("div.dcr-ui", [
      manager && manager.hasSynced() || editable
        ? m("div.dcr-ui-graph", {
            oncreate: this.createGraph,
            onupdate: this.updateGraph,
            workflowManager: vnode.attrs.workflowManager,
            editable: vnode.attrs.editable,
            onclick: () => this.ctxActive = false
          }, !this.ctxActive
                ? null
                : m("div.ctx-menu", {
                    style: `top: ${this.ctxDomPosition.y}px; left: ${this.ctxDomPosition.x}px`,
                    oncontextmenu: () => false
                  }, m("div.panel", [
                    this.ctxTargetGroup !== "none"
                      ? null
                      : m("a.panel-block", { onclick: () => {
                          let activity = new Activity(this.activities.length, "New node", true, false, false);
                          activity.canExecute = true;
                          activity.initialPosition = this.ctxPosition;
                          this.activities.push(activity);
                        } }, [
                          m("span.panel-icon",
                            m("i.fa.fa-plus")
                          ),
                          "Add activity"
                        ]),
                    this.ctxTargetGroup !== "nodes"
                      ? null
                      : m("a.panel-block", { onclick: () => {
                          let targetActivityId = parseInt(this.ctxTarget.data("id").replace("n", ""));
                          delete this.activities[targetActivityId];
                          this.relations = this.relations.filter(relation => relation.from !== targetActivityId && relation.to !== targetActivityId);
                          this.cy.remove(this.ctxTarget);
                        } }, [
                          m("span.panel-icon",
                            m("i.fa.fa-remove")
                          ),
                          "Remove activity"
                        ]),
                    this.ctxTargetGroup !== "edges"
                      ? null
                      : m("a.panel-block", { onclick: () => {
                          let targetRelationId = parseInt(this.ctxTarget.data("id").replace("e", ""));
                          delete this.relations[targetRelationId];
                          // this.cy.remove(this.ctxTarget);
                        } }, [
                          m("span.panel-icon",
                            m("i.fa.fa-remove")
                          ),
                          "Remove relation"
                        ]),
                    m("div.panel-block.panel-seperator"),
                    !showRelationCtxItems ? null : m("a.panel-block.include", { onclick: addRelation.bind(this, "include") }, [
                      m("span.panel-icon",
                        m("i.fa.fa-long-arrow-right")
                      ),
                      "Include"
                    ]),
                    !showRelationCtxItems ? null : m("a.panel-block.exclude", { onclick: addRelation.bind(this, "exclude") }, [
                      m("span.panel-icon",
                        m("i.fa.fa-long-arrow-right")
                      ),
                      "Exclude"
                    ]),
                    !showRelationCtxItems ? null : m("a.panel-block.condition", { onclick: addRelation.bind(this, "condition") }, [
                      m("span.panel-icon",
                        m("i.fa.fa-long-arrow-right")
                      ),
                      "Condition"
                    ]),
                    !showRelationCtxItems ? null : m("a.panel-block.response", { onclick: addRelation.bind(this, "response") }, [
                      m("span.panel-icon",
                        m("i.fa.fa-long-arrow-right")
                      ),
                      "Response"
                    ]),
                    !showRelationCtxItems ? null : m("a.panel-block.milestone", { onclick: addRelation.bind(this, "milestone") }, [
                      m("span.panel-icon",
                        m("i.fa.fa-long-arrow-right")
                      ),
                      "Milestone"
                    ]),
                  ])))
        : null,
      m("div.column.content.dcr-ui-menu", [
        m("div", [
          m("h4", "WORKFLOW"),
          m("hr"),
          m(MenuField, {
            value: manager ? manager.workflowName() : null,
            loading: manager ? !manager.workflowName() : null,
            input: !editable
              ? null
              : m("input.input", {  maxlength: 32, value: this.workflowName(), oninput: m.withAttr("value", this.workflowName) })
          }),
          !editable
            ? null
            : m("div.field.has-addons",
                m("p.control",
                  !this.publishWorkflowId()
                    ? m("button.button.is-success" + (this.publishHash() ? ".is-loading" : ""), {
                        disabled: !this.activities.length,
                        onclick: this.publish
                      }, "PUBLISH")
                    : m("a.button.is-success", { href: `/workflow/${this.publishWorkflowId()}/workflow`, oncreate: m.route.link }, "OPEN")
                ),
                !this.publishHash()
                  ? null
                  : m("p.control.execution-tx",
                      m("div.input.imitate-disabled",
                        m("a", this.publishHash())
                      )
                    )
              ),
          !manager
            ? null
            : m(MenuField, {
                size: "small",
                label: "BLOCK",
                value: manager.blockNumber() ? `#${manager.blockNumber()}` : null,
                href: "#"
              }),
          !manager
            ? null
            : m(MenuField, {
                size: "small",
                label: "TRANSACTION",
                value: manager.transactionHash(),
                href: "#"
              }),
          !manager
            ? null
            : m(MenuField, {
                size: "small",
                label: "CREATOR",
                value: manager.creatorAddress(),
                href: "#"
              })
        ]),

        !selected ? null : m("div", [
          m("h4", "ACTIVITY"),
          m("hr"),
          m(MenuField, {
            value: selected ? selected.name : "",
            input: !editable ? null : m("input.input", { maxlength: 32, value: selected.name, oninput: m.withAttr("value", name => selected.name = name) })
          }),
          editable
            ? null
            : m(MenuField, {
                size: "small",
                label: "ID",
                value: this.selectedActivityId()
              }),
          m("div.field",
            m("p.control.activity-state", [
              m("label.checkbox", [
                m("input", { type: "checkbox", disabled: !editable, checked: selected.isIncluded, onclick: m.withAttr("checked", included => selected.isIncluded = !selected.isIncluded) }),
                " Included"
              ]),
              m("label.checkbox", [
                m("input", { type: "checkbox", disabled: !editable, checked: selected.isExecuted, onclick: m.withAttr("checked", executed => selected.isExecuted = !selected.isExecuted) }),
                " Executed"
              ]),
              m("label.checkbox", [
                m("input", { type: "checkbox", disabled: !editable, checked: selected.isPending, onclick: m.withAttr("checked", pending => selected.isPending = !selected.isPending) }),
                " Pending"
              ])
            ])
          ),
          m("br"),
          m("h6.whitelist-heading", "WHITELIST"),
          !editable ? null : m("p.extra-info", "Leave empty to disable authorization"),
          editable || selected.accountWhitelist.length ? null : m("p.extra-info", "Authorization disabled"),
          selected.accountWhitelist.map((address, i) => m(MenuField, {
            size: "small",
            input: !editable ? null : m("input.input.is-small" + (web3.isAddress(address) ? "" : ".is-danger"), { value: address, oninput: m.withAttr("value", value => selected.accountWhitelist[i] = value) }),
            value: editable ? null : address,
            href: editable ? null : "#"
          })),
          !editable
            ? null
            : m("div.field",
                m("p.control", [
                  m("button.button.is-small", { disabled: selected.accountWhitelist.length >= 32, onclick: () => selected.accountWhitelist.push("") }, [
                    m("i.fa.fa-plus"),
                    " ADD ACCOUNT"
                  ]),
                  m.trust("&nbsp;"),
                  m("button.button.is-small", { disabled: selected.accountWhitelist.length === 0, onclick: () => selected.accountWhitelist.pop() }, [
                    m("i.fa.fa-trash"),
                    " REMOVE ACCOUNT"
                  ]),
                ])
              ),
          editable
            ? null
            : m("div.field.has-addons",
                m("p.control",
                  m("button.button.is-warning" + (this.executing[this.selectedActivityId()] ? ".is-loading" : ""), {
                    disabled: !selected.canExecute,
                    onclick: this.onExecute.bind(this, vnode.attrs.workflowManager)
                  }, "EXECUTE")
                ),
                !this.executing[this.selectedActivityId()]
                  ? null
                  : m("p.control.execution-tx",
                      m("div.input.imitate-disabled",
                        m("a", this.executing[this.selectedActivityId()])
                      )
                    )
              )
        ])
      ])
    ]);
  }
}

class MenuField {
  view(vnode) {
    let size;
    switch (vnode.attrs.size) {
      case "small":
        size = ".is-small";
        break;
      case "large":
        size = ".is-large";
        break;
      case "normal":
      default:
        size = ""
    }

    let loading = vnode.attrs.loading ? ".is-loading" : "";

    let control;
    if (vnode.attrs.input)
      control = vnode.attrs.input;
    else if (vnode.attrs.href)
      control = m("div.input.imitate-disabled" + size, m("a", { href: vnode.attrs.href }, vnode.attrs.value));
    else
      control = m("div.input.imitate-disabled" + size, m("p", vnode.attrs.value));

    return m("div.field", [
      vnode.attrs.label ? m("label.label" + size, vnode.attrs.label) : null,
      m("p.control" + loading, control)
    ]);
  }
}

export default DcrUi;
