import "./styles.scss";
import m from "mithril";
import DcrUi from "components/dcr-ui";

class WorkflowTab {
  view(vnode) {
    return m("div.workflow-tab",
      m(DcrUi, { workflowManager: vnode.attrs.workflowManager })
    );
  }
}

export default WorkflowTab;
