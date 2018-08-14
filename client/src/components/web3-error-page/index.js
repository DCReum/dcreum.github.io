import "./styles.scss";
import m from "mithril";

class Web3ErrorPage {
  view() {
    return m(".hero.is-warning#error-hero",
      m(".hero-body",
        m(".container", [
          m("h1.title.has-text-centered", "Unable to connect to Ethereum"),
          m("br"),
          m(".content", [
            m("strong", "You may be missing an Ethereum client"),
            m("br"),
            m("p", [
              m("span", "You can choose any Ethereum client with a web interface."),
              m("br"),
              m("span", "We recommend downloading the following program to get started using the tool in Google Chrome or Mozilla Firefox.")
            ]),
            m("strong", "MetaMask"),
            m("br"),
            m("a.button.is-success", { href: "https://metamask.io", target: "_blank" }, "Download here"),
          ])
        ])
      )
    );
  }
}

export default Web3ErrorPage;
