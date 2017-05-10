import m from "mithril";

class MUtil {
  static visible(show) {
    return show ? "" : "is-hidden";
  }
  
  static stopEvent(event) {
    event.stopPropagation();
  }
}

export default MUtil