import "./styles.scss";
import m from "mithril";
import DcrUi from "components/dcr-ui";

class Create {
  view() {
    return m("section.create", [
      m("nav.nav.is-primary.has-shadow", [
          m("div.nav-right", [
            m("a.nav-item.is-tab.is-active", { href: "/create", oncreate: m.route.link }, "Create new")
          ])
      ]),
      m("div.workspace",
        m("div.create-tab",
          m(DcrUi, { editable: true })
        )
      )
    ]);
  }
}

export default Create;
