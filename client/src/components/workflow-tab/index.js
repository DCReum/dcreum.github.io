import "./styles.scss";
import m from "mithril";
import DcrUi from "components/dcr-ui";

class Workflow {
  view() {
    return m("div.workflow-tab",
      m(DcrUi)
    );
  }
}

export default Workflow;
