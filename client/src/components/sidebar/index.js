import "./styles.scss";
import m from "mithril";
import Stream from "mithril/stream";

class Sidebar {
  oninit() {
    this.relevant = Stream(["Auction", "IT-Support Ticket"]);
    this.recent = Stream(["Hospital", "Bf4eD7b"]);
  }

  controller() {

  }

  view() {
    return m("aside#sidebar.menu", [
      m("p.menu-label", "Relevant"),
      m("ul.menu-list", this.relevant().map(wf =>
        m("li", m("a", wf))
      )),
      m("p.menu-label", "Recent"),
      m("ul.menu-list", this.relevant().map(wf =>
        m("li", m("a", wf))
      )),
      m("p.menu-label", "Search")
    ]);
  }
}

export default new Sidebar();
