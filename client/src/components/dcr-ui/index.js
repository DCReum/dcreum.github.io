import "./styles.scss";
import m from "mithril";
import cytoscape from "cytoscape";
import WorkflowManager from "workflow-manager";
import Stream from "mithril/stream";

class DcrUi {
  constructor() {
    this.createGraph = this.createGraph.bind(this);
    this.selectedActivityId = Stream();
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
          id: i
        },
        classes: classes.join(" "),
        style: {
          label: activity.name
        }
      };
    })
    let edges = manager.relations().map(relation => ({
      data: {
        source: relation.from,
        target: relation.to
      },
      classes: relation.type
    }));

    let cy = cytoscape({
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
    cy.on("select", "*", event =>
      cy.collection("*:selected").not(event.target).unselect()
    );

    cy.on("select", "node", event => {
      this.selectedActivityId(event.target.data("id"))
      m.redraw();
    });

    cy.on("unselect", "node", event => {
      this.selectedActivityId(null)
      m.redraw();
    });
  }

  view(vnode) {
    let manager = vnode.attrs.workflowManager;
    let selected = manager.activities()[this.selectedActivityId()];

    return m("div.dcr-ui", [
      // TODO: Fix onupdate
      m("div.dcr-ui-graph", { oncreate: this.createGraph, onupdate: this.createGraph, workflowManager: vnode.attrs.workflowManager }),
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
          m("div.field",
            m("p.control",
              m("button.button.is-warning", { disabled: !selected.canExecute, onclick: () => manager.execute(this.selectedActivityId()) }, "EXECUTE")
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
