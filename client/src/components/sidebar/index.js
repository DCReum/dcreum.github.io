import "./styles.scss";
import m from "mithril";
import Stream from "mithril/stream";
import logo from "assets/img/Icon_v1_500width.png";
import { WorkflowManager } from "workflow-manager";

class RelevantWorkflow {
  constructor(workflowId) {
    this.workflowId = workflowId;
    this.isReady = false;
  }
}

class Sidebar {
  constructor() {
    this.recent = JSON.parse(localStorage.getItem("recent-workflows")) || [];
    
    let local = JSON.parse(localStorage.getItem("relevant-workflows")) || [];
    this.relevant = new Map(local.map(wf => {
      let rel = new RelevantWorkflow(wf.id);
      rel.workflowName = wf.name;
      rel.isReady = true;
      return [wf.id, rel];
    }));

    this.searchRelevant = this.searchRelevant.bind(this);
    this.checkIfRelevant = this.checkIfRelevant.bind(this);

    WorkflowManager.contract.getWorkflowCount((error, workflowCount) => {
      this.searchRelevant(workflowCount, +localStorage.getItem("best-workflow-id"));
    });
    
  }

  searchRelevant(workflowCount, workflowId) {
    let currentBest = +localStorage.getItem("best-workflow-id");
    localStorage.setItem("best-workflow-id", currentBest > workflowId ? currentBest : workflowId);
    if (workflowId < workflowCount) {
      setTimeout(() => {
        this.checkIfRelevant(workflowId);
        this.searchRelevant(workflowCount, workflowId + 1);
      }, 500);
    }
  }

  checkIfRelevant(workflowId) {
    WorkflowManager.contract.getActivityCount(workflowId, (error, activityCount) => {
      if (error) return;
      for (let activityId = 0; activityId < activityCount; activityId++) {
        WorkflowManager.contract.getAccountWhitelist(workflowId, activityId, (error, whitelist) => {
          whitelist.forEach(whitelistedAddress => {
            if (~web3.eth.accounts.indexOf(whitelistedAddress) && !this.relevant.has(workflowId)) {
              this.relevant.set(workflowId, new RelevantWorkflow(workflowId));
              WorkflowManager.contract.getWorkflowName(workflowId, (error, workflowName) => {
                if (error) return;
                workflowName = web3.toAscii(workflowName).trim();
                let relevant = this.relevant.get(workflowId);
                relevant.workflowName = workflowName;
                relevant.isReady = true;
                
                let local = JSON.parse(localStorage.getItem("relevant-workflows")) || [];
                if (!local.find(wf => wf.id == workflowId)) {
                  local.push({
                    id: workflowId,
                    name: workflowName
                  });
                  localStorage.setItem("relevant-workflows", JSON.stringify(local));
                }

                m.redraw();
              });
            }
          })
        });
      }
    });
  }

  view() {
    return m("aside#sidebar.menu", [
      m("div.logo",
        m("img", { src: logo })
      ),
      m("hr"),
      !this.recent.length ? null : [
        m("p.menu-label", "Recent"),
        m("ul.menu-list", this.recent.map(wf =>
          m("li", m("a", { href: `/workflow/${wf.id}/workflow`, oncreate: m.route.link }, wf.name))
        ))
      ],
      m("p.menu-label", "Relevant"),
      m("ul.menu-list", Array.from(this.relevant.values()).filter(wf => wf.isReady).map(wf =>
        m("li", m("a", { href: `/workflow/${wf.workflowId}/workflow`, oncreate: m.route.link }, wf.workflowName))
      ))
    ]);
  }
}

export default Sidebar;
