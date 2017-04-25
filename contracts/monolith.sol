pragma solidity 0.4.10;

contract DCReum {
  event LogWorkflowCreation(uint256 indexed workflowId, bytes32 indexed workflowName);
  event LogActivityCreation(uint256 indexed workflowId, uint256 indexed activityId, bytes32 indexed activityName);
  event LogExecution(uint256 indexed workflowId, uint256 indexed activityId, address indexed executor);

  enum RelationType {
    Include, Exclude, Response, Condition, Milestone
  }

  struct Workflow {
    bytes32 name;
    
    // Note that while activities is indexed with 256 bit, it must not surpass 2^32 entries
    Activity[] activities;

    // Group 0-31     permits execution of activities with the corresponding auth bit set
    // Group 32       permits workflow modification
    // Group 33-39    reserved
    mapping (address => uint40) groupMembers;
    
    // Names of group 0-31
    bytes32[32] groupNames;
  }

  struct Activity {
    bytes32 name;

    // Activity state
    bool included;
    bool executed;
    bool pending;

    // Activity relations
    uint32[] includeTo;
    uint32[] excludeTo;
    uint32[] responseTo;
    uint32[] conditionFrom;
    uint32[] milestoneFrom;
    
    // Group execution rights bit vector
    // A set bit means the corresponding group is allowed to execute
    uint32 groupWhitelist;

    // Individual accounts with rights to execute
    address[] accountWhitelist;

    // If true anyone can execute
    bool authDisabled;
  }

  Workflow[] workflows;

  // Not intended for use in transactions, as returned structs will exist in memory instead of as storage pointers!
  function getWorkflowActivity(uint256 workflowId, uint256 activityId) private constant returns (Workflow, Activity) {
    var workflow = workflows[workflowId];
    var activity = workflow.activities[activityId];
    return (workflow, activity);
  }

  function getAccountWhitelist(uint256 workflowId, uint256 activityId) public constant returns (address[]) {
    var (workflow, activity) = getWorkflowActivity(workflowId, activityId);
    return activity.accountWhitelist;
  }

  function isIncluded(uint256 workflowId, uint256 activityId) public constant returns (bool) {
    var (workflow, activity) = getWorkflowActivity(workflowId, activityId);
    return activity.included;
  }

  function isExecuted(uint256 workflowId, uint256 activityId) public constant returns (bool) {
    var (workflow, activity) = getWorkflowActivity(workflowId, activityId);
    return activity.executed;
  }

  function isPending(uint256 workflowId, uint256 activityId) public constant returns (bool) {
    var (workflow, activity) = getWorkflowActivity(workflowId, activityId);
    return activity.pending;
  }

  function getIncludes(uint256 workflowId, uint256 activityId) external constant returns (uint32[]) {
    var (workflow, activity) = getWorkflowActivity(workflowId, activityId);
    return activity.includeTo;
  }

  function getExcludes(uint256 workflowId, uint256 activityId) external constant returns (uint32[]) {
    var (workflow, activity) = getWorkflowActivity(workflowId, activityId);
    return activity.excludeTo;
  }

  function getResponses(uint256 workflowId, uint256 activityId) external constant returns (uint32[]) {
    var (workflow, activity) = getWorkflowActivity(workflowId, activityId);
    return activity.responseTo;
  }

  function getConditions(uint256 workflowId, uint256 activityId) external constant returns (uint32[]) {
    var (workflow, activity) = getWorkflowActivity(workflowId, activityId);
    return activity.conditionFrom;
  }

  function getMilestones(uint256 workflowId, uint256 activityId) external constant returns (uint32[]) {
    var (workflow, activity) = getWorkflowActivity(workflowId, activityId);
    return activity.milestoneFrom;
  }

  function canExecute(uint256 workflowId, uint256 activityId) public constant returns (bool) {
    var workflow = workflows[workflowId];
    var activity = workflow.activities[activityId];
    uint32 i;
    uint32 fromId;

    // Sender address must have rights to execute or sender must be member of a group with rights to execute
    // Note that the operands of the AND are of different bit lengths, causing the 8 special group bits to be ignored
    if (!activity.authDisabled && (workflow.groupMembers[msg.sender] & activity.groupWhitelist) == 0) {
      // Sender not in allowed group - check individual account access rights
      for (i = 0; i < activity.accountWhitelist.length; i++) {
        if (activity.accountWhitelist[i] == msg.sender)
          break;
      }

      // Sender not in accountWhitelist array
      if (i == activity.accountWhitelist.length)
        return false;
    }

    // Activity must be included
    if (!activity.included) return false;

    // All conditions executed
    for (i = 0; i < activity.conditionFrom.length; i++) {
      fromId = activity.conditionFrom[i];
      if (!workflow.activities[fromId].executed) return false;
    }

    // No milestones pending
    for (i = 0; i < activity.milestoneFrom.length; i++) {
      fromId = activity.milestoneFrom[i];
      if (workflow.activities[fromId].pending) return false;
    }

    return true;
  }

  function execute(uint256 workflowId, uint256 activityId) {
    var workflow = workflows[workflowId];
    var activity = workflow.activities[activityId];
    uint32 i;
    uint32 toId; 

    if (!canExecute(workflowId, activityId)) throw;

    // Executed activity
    activity.executed = true;
    activity.pending = false;

    // Exclude relations pass
    for (i = 0; i < activity.excludeTo.length; i++) {
      toId = activity.excludeTo[i];
      workflow.activities[toId].included = false;
    }

    // Include relations pass
    // Note this happens after the exlude pass
    for (i = 0; i < activity.includeTo.length; i++) {
      toId = activity.includeTo[i];
      workflow.activities[toId].included = true;
    }

    // Response relations pass
    for (i = 0; i < activity.responseTo.length; i++) {
      toId = activity.responseTo[i];
      workflow.activities[toId].pending = true;
    }

    LogExecution(workflowId, activityId, msg.sender);
  }

  function createWorkflow(
    // Ugly squash hack to decrease stack depth
    // 0        workflow name
    // 1-32     group names
    // 33-end   activity names
    bytes32[] names,
    bool[3][] activityStates, // included, executed, pending

    // Ugly squash hack to decrease stack depth
    // Length of outer array is amount of activities
    // 0  counts for relationTypes and relationActivityIds
    // 1  counts for accountWhitelist
    // 2  groupWhitelist
    uint32[3][] activityData,
    RelationType[] relationTypes,
    uint32[] relationActivityIds,

    address[] groupAccounts,
    uint40[] groupMemberships,
    address[] accountWhitelist,
    bool[] authDisabled
  ) {
    var workflow = workflows[workflows.length++];
    uint256 i;
    uint256 j;
    uint32 relationIndex = 0;
    uint32 authAccountIndex = 0;

    assert(activityData.length == names.length - 33);
    assert(activityData.length == authDisabled.length);
    assert(groupAccounts.length == groupMemberships.length);

    workflow.name = names[0];
    for (i = 0; i < 32; i++) {
      workflow.groupNames[i] = names[1 + i];
    }

    // Group accounts
    for (i = 0; i < groupAccounts.length; i++) {
      workflow.groupMembers[groupAccounts[i]] = groupMemberships[i];
    }

    // Activities
    for (i = 0; i < activityData.length; i++) {
      var activity = workflow.activities[workflow.activities.length++];
      activity.name = names[33 + i];
      activity.included = activityStates[i][0];
      activity.executed = activityStates[i][1];
      activity.pending = activityStates[i][2];
      activity.groupWhitelist = activityData[i][2];
      activity.authDisabled = authDisabled[i];

      // Activity relations
      for (j = 0; j < activityData[i][0]; j++) {
        if (relationTypes[relationIndex] == RelationType.Include)
          activity.includeTo.push(relationActivityIds[relationIndex]);
        else if (relationTypes[relationIndex] == RelationType.Exclude)
          activity.excludeTo.push(relationActivityIds[relationIndex]);
        else if (relationTypes[relationIndex] == RelationType.Response)
          activity.responseTo.push(relationActivityIds[relationIndex]);
        else if (relationTypes[relationIndex] == RelationType.Condition)
          activity.conditionFrom.push(relationActivityIds[relationIndex]);
        else if (relationTypes[relationIndex] == RelationType.Milestone)
          activity.milestoneFrom.push(relationActivityIds[relationIndex]);
        
        relationIndex++;
      }

      // Individually whitelisted accounts
      for (j = 0; j < activityData[i][1]; j++) {
        activity.accountWhitelist.push(accountWhitelist[authAccountIndex++]);
      }
    }
    
    LogWorkflowCreation(workflows.length - 1, workflow.name);
  }
}
