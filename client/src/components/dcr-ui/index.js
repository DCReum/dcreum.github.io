import "./styles.scss";
import m from "mithril";
import cytoscape from "cytoscape";
import WorkflowManager from "workflow-manager";
import Stream from "mithril/stream";

class DcrUi {
  constructor() {
    this.createGraph = this.createGraph.bind(this);
    this.updateGraph = this.updateGraph.bind(this);
    this.selectedActivityId = Stream();
    this.executing = [];
  }

  updateGraph(vnode) {
    let manager = vnode.attrs.workflowManager;

    this.cy.batch(() => {
      manager.activities().map((activity, i) => {
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
            classes: classes.join(" "),
            style: {
              label: activity.name
            }
          });
        } else {
          node.classes(classes.join(" "));
        } 
      });

      manager.relations().map((relation, i) => {
        let edge = this.cy.elements("#e" + i);
        if (edge.empty()) {
          this.cy.add({
            data: {
              id: "e" + i,
              source: "n" + relation.from,
              target: "n" + relation.to
            },
            classes: relation.type
          });
        }
      });
    });
  }

  createGraph(vnode) {
    let manager = vnode.attrs.workflowManager;
    let nodes = manager.activities().map((activity, i) => {
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
    let edges = manager.relations().map((relation, i) => ({
      data: {
        id: "e" + i,
        source: "n" + relation.from,
        target: "n" + relation.to
      },
      classes: relation.type
    }));

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
          selector: "node.excluded",
          style: {
            "border-style": "dashed"
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
      this.selectedActivityId(parseInt(event.target.data("id").replace("n", "")))
      m.redraw();
    });

    this.cy.on("unselect", "node", event => {
      this.selectedActivityId(null)
      m.redraw();
    });
  }

  onExecute(workflowManager) {
    let activityId = this.selectedActivityId();
    workflowManager.execute(m.route.param("workflowId"), activityId, (error, txhash) => {
      this.executing[activityId] = txhash;
      m.redraw();
    });
  }

  view(vnode) {
    let manager = vnode.attrs.workflowManager;
    let selected = manager.activities()[this.selectedActivityId()];

    manager.events().forEach(event => {
      this.executing.forEach((txhash, i) => {
        if (event.transactionHash == txhash)
          delete this.executing[i];
      });
    });

    return m("div.dcr-ui", [
      // TODO: Fix onupdate
      vnode.attrs.workflowManager.hasSynced()
        ? m("div.dcr-ui-graph", { oncreate: this.createGraph, onupdate: this.updateGraph, workflowManager: vnode.attrs.workflowManager })
        : null,
      m("div.column.dcr-ui-menu", [
        m("div", [
          m("h4", "WORKFLOW"),
          m("hr"),
          m(MenuField, {
            value: manager.workflowName(),
            loading: !manager.workflowName()
          }),
          m(MenuField, {
            size: "small",
            label: "BLOCK",
            value: manager.blockNumber() ? `#${manager.blockNumber()}` : "",
            href: "#"
          }),
          m(MenuField, {
            size: "small",
            label: "TRANSACTION",
            value: manager.transactionHash(),
            href: "#"
          }),
          m(MenuField, {
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
            value: selected ? selected.name : ""
          }),
          m(MenuField, {
            size: "small",
            label: "ID",
            value: this.selectedActivityId()
          }),
          m("div.field",
            m("p.control.activity-state", [
              m("label.checkbox", [
                m("input", { type: "checkbox", disabled: true, checked: selected.isIncluded }),
                " Included"
              ]),
              m("label.checkbox", [
                m("input", { type: "checkbox", disabled: true, checked: selected.isExecuted }),
                " Executed"
              ]),
              m("label.checkbox", [
                m("input", { type: "checkbox", disabled: true, checked: selected.isPending }),
                " Pending"
              ])
            ])
          ),
          m("div.field.has-addons",
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
        ]),
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
