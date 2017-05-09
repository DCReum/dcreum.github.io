import m from "mithril";
import * as d3 from "d3";

class Workflow {
  view() {
    return m("section.section",
      m("svg", {
        oncreate: (vnode) => {
          let svg = d3.select(vnode.dom);
        }
      })
    );
  }
}

export default Workflow;
