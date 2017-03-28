pragma solidity 0.4.9;

contract DCReum {
  event LogWorkflowCreation(uint256 indexed workflowId, bytes32 indexed workflowName);
  event LogActivityCreation(uint256 indexed workflowId, uint256 indexed activityId, bytes32 indexed activityName);
  event LogExecution(uint256 indexed workflowId, uint256 indexed activityId, address indexed executor);

  struct Workflow {
    bytes32 name;
    
    // note that while activities is indexed with 256 bit,
    // it must not surpass 2^32 entries
    Activity[] activities;

    bytes32[32] groupNames;
    mapping(address => bool[32]) groupMembers;
  }

  struct Activity {
    bytes32 name;
    address[] executorAccounts;
    bool[32] executorGroups;

    // activity state
    bool included;
    bool executed;
    bool pending;

    // activity relations
    uint32[] includeTo;
    uint32[] excludeTo;
    uint32[] responseTo;
    uint32[] conditionFrom;
    uint32[] milestoneFrom;
  }

  Workflow[] workflows;

  function canExecute(uint256 workflowId, uint256 activityId) returns (bool) {
    var workflow = workflows[workflowId];
    var activity = workflow.activities[activityId];
    uint32 i;
    uint32 fromId;
    bool isSenderAuthed;
    bool[32] memory senderGroups;

    // sender must be an executor account or in an executor group 
    for (i = 0; i < activity.executorAccounts.length; i++) {
      if (activity.executorAccounts[i] == msg.sender) {
        isSenderAuthed = true;
        break;
      }
    }

    senderGroups = workflow.groupMembers[msg.sender];
    for (i = 0; i < 32; i++) {
      if (senderGroups[i] && activity.executorGroups[i]) {
        isSenderAuthed = true;
        break;
      }
    }

    if (!isSenderAuthed) throw;

    // activity must be included
    if (!activity.included) return false;

    // all conditions executed
    for (i = 0; i < activity.conditionFrom.length; i++) {
      fromId = activity.conditionFrom[i];
      if (!workflow.activities[fromId].executed) return false;
    }

    // no milestones pending
    for (i = 0; i < activity.milestoneFrom.length; i++) {
      fromId = activity.milestoneFrom[i];
      if (workflow.activities[fromId].pending) return false;
    }
  }

  function execute(uint256 workflowId, uint256 activityId) {
    var workflow = workflows[workflowId];
    var activity = workflow.activities[activityId];
    uint32 i;
    uint32 toId; 

    if (!canExecute(workflowId, activityId)) throw;

    // executed activity
    activity.executed = true;
    activity.pending = false;

    // exclude relations pass
    for (i = 0; i < activity.excludeTo.length; i++) {
      toId = activity.excludeTo[i];
      workflow.activities[toId].included = false;
    }

    // include relations pass
    // note this happens after the exlude pass
    for (i = 0; i < activity.includeTo.length; i++) {
      toId = activity.includeTo[i];
      workflow.activities[toId].included = true;
    }

    // response relations pass
    for (i = 0; i < activity.responseTo.length; i++) {
      toId = activity.responseTo[i];
      workflow.activities[toId].pending = true;
    }

    LogExecution(workflowId, activityId, msg.sender);
  }

  // temporary debug function
  function createWorkflow(bytes32 workflowName, bytes32[32] groupNames, address[] groupMemberAddresses, bool[] groupMemberRights) returns (uint256) {
    var workflowId = workflows.length++;
    uint256 i;
    uint256 j;
    workflows[workflowId].name = workflowName;
    workflows[workflowId].groupNames = groupNames;
    for (i = 0; i < groupMemberAddresses.length; i++) {
      bool[32] memory rights;
      for (j = 0; j < 32; j++) {
        rights[j] = groupMemberRights[i*32 + j];
      }
      workflows[workflowId].groupMembers[groupMemberAddresses[i]] = rights;
    }
    LogWorkflowCreation(workflowId, workflowName);
    return workflowId;
  }

  // temporary debug function
  function createActivity(uint256 workflowId, bytes32 activityName, address[] executorAccounts, bool[32] executorGroups) returns (uint256) {
    var workflow = workflows[workflowId];
    var activityId = workflow.activities.length++;
    workflow.activities[activityId].name = activityName;
    workflow.activities[activityId].executorAccounts = executorAccounts;
    workflow.activities[activityId].executorGroups = executorGroups;
    LogActivityCreation(workflowId, activityId, activityName);
    return activityId;
  }
}
