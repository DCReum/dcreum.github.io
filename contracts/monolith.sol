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

    // group 0-31     permits execution of activities with the corresponding auth bit set
    // group 32       permits workflow modification
    // group 33-39    reserved
    mapping (address => uint40) groupMembers;

    // names of group 0-31
    bytes32[32] groupNames;
  }

  struct Activity {
    bytes32 name;

    // group execution rights bit vector
    // a set bit means the corresponding group is allowed to execute
    uint32 authGroups;

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

  function get(uint256 workflowId, uint256 activityId) internal returns (Workflow, Activity) {
    var workflow = workflows[workflowId];
    var activity = workflow.activities[activityId];
    return (workflow, activity);
  }

  function canExecute(uint256 workflowId, uint256 activityId) returns (bool) {
    var workflow = workflows[workflowId];
    var activity = workflow.activities[activityId];
    uint32 i;
    uint32 fromId;

    // sender must be member of a group with rights to execute
    // note that workflow.groupMembers[msg.sender] defaults to 0 for unmapped sender
    if ((workflow.groupMembers[msg.sender] & activity.authGroups) != 0) return false;

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
    var (workflow, activity) = get(workflowId, activityId);
    uint32 i;
    uint32 toId; 

    if (!canExecute(workflowId, workflowId)) throw;

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
  function createWorkflow(bytes32 workflowName, bytes32[32] groupNames) returns (uint256) {
    var workflowId = workflows.length++;
    workflows[workflowId].name = workflowName;
    workflows[workflowId].groupNames = groupNames;
    LogWorkflowCreation(workflowId, workflowName);
    return workflowId;
  }

  // temporary debug function
  function createActivity(uint256 workflowId, bytes32 activityName) returns (uint256) {
    var workflow = workflows[workflowId];
    var activityId = workflow.activities.length++;
    workflow.activities[activityId].name = activityName;
    LogActivityCreation(workflowId, activityId, activityName);
    return activityId;
  }
}
