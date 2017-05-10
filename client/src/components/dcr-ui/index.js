import "./styles.scss";
import m from "mithril";
import cytoscape from "cytoscape";

class DcrUi {
  constructor() {
    this.onCreateGraph = this.onCreateGraph.bind(this);
  }

  onCreateGraph(vnode) {
    let cy = cytoscape({
      container: vnode.dom,
      elements: [
        { data: { id: 0, name: "Submit ticket" }, classes: "included", style: { label: "Submit ticket" } },
        { data: { id: 1, name: "Propose solution" }, classes: "included", style: { label: "Propose solution" } },
        { data: { id: 2, name: "Reject solution" }, classes: "included", style: { label: "Reject solution" } },
        { data: { id: 3, name: "Close ticket" }, classes: "excluded", style: { label: "Close ticket" } },
        { data: { id: 4, name: "Accept solution" }, classes: "included", style: { label: "Accept solution" } },

        { data: { id: 5, source: 0, target: 0 }, classes: "exclude" },
        { data: { id: 6, source: 0, target: 1 }, classes: "condition" },
        { data: { id: 7, source: 0, target: 3 }, classes: "include" },
        { data: { id: 8, source: 1, target: 2 }, classes: "condition" },
        { data: { id: 9, source: 1, target: 4 }, classes: "response" },
        { data: { id: 10, source: 1, target: 4 }, classes: "milestone" },
        { data: { id: 11, source: 2, target: 1 }, classes: "response" },
        { data: { id: 12, source: 4, target: 1 }, classes: "exclude" },
        { data: { id: 13, source: 4, target: 2 }, classes: "exclude" },
        { data: { id: 14, source: 4, target: 3 }, classes: "condition" },
        { data: { id: 15, source: 4, target: 3 }, classes: "response" }
      ],
      layout: { name: "grid" },
      style: [
        {
          selector: "node",
          style: {
            "shape": "rectangle",
            "height": 50,
            "width": 35,
            "background-color": "#e5e5e5",
            "border-width": 1,
            "border-color": "#454545",
            "color": "#454545",
            "font-size": 6,
            "font-weight": "bold",
            "text-halign": "center",
            "text-valign": "center",
            "text-wrap": "ellipsis",
            "text-max-width": 30
          }
        },
        {
          selector: "node.excluded",
          style: {
            "border-style": "dashed"
          }
        },
        {
          selector: "node:selected",
          style: {
            "border-color": "#00d1b2"
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
    cy.on("select", "*", (event) =>
      cy.collection("*:selected").not(event.target).unselect()
    );
  }

  view() {
    return m("div.columns.dcr-ui", [
      m("div.column.dcr-ui-graph", { oncreate: this.onCreateGraph }),
      m("div.column.is-3.dcr-ui-menu", m("div.content", [

        m("h4", "WORKFLOW"),
        m("hr"),
        
        m("div.field",
          m("p.control.is-loading",
            m("input.input", { type: "text", placeholder: "NAME", disabled: true })
          )
        ),
        m("div.field",
          m("p.control.is-loading",
            m("input.input", { type: "text", placeholder: "CREATOR", disabled: true })
          )
        ),
        m("div.field",
          m("p.control.is-loading",
            m("input.input", { type: "text", placeholder: "BLOCK", disabled: true })
          )
        ),
        m("div.field",
          m("p.control.is-loading",
            m("input.input", { type: "text", placeholder: "TXHASH", disabled: true })
          )
        ),

        // m("div.field", [
        //   m("div.field-label",
        //     m("label.label", "WORKFLOW")
        //   ),
        //   m("div.field-body",
        //   ),
        //   // m("div.field-body",
        //   //   m("div.field",
        //   //     m("div.control.is-loading",
        //   //       m("input.input", { type: "text", disabled: true })
        //   //     )
        //   //   )
        //   // )
        // ])
      ]))
    ]);
  }
}

export default DcrUi;
