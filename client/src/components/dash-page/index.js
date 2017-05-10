import "./styles.scss";
import m from "mithril";
import Sidebar from "components/sidebar";
import Workflow from "components/workflow";

class DashPage {
  view(vnode) {
    return m("div#dash.columns.is-marginless", [
      m("div#sidebar-column.column.is-3.is-paddingless.is-hidden-mobile", m(Sidebar)),
      m("div.column.is-paddingless", vnode.children)
    ]);
  }
}

export default DashPage;
