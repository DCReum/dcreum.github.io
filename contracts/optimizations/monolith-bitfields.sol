pragma solidity 0.4.10;

contract DCReum {
  event LogWorkflowCreation(uint256 indexed workflowId, bytes32 indexed workflowName);
  event LogExecution(uint256 indexed workflowId, uint256 indexed activityId, address indexed executor);

  enum RelationType {
    Include, Exclude, Response, Condition, Milestone
  }

  struct Workflow {
    bytes32 name;

    //activity data:
    bytes32[] activityNames;
    uint256 included;
    uint256 executed;
    uint256 pending;

    //relations
    uint256[] includesTo;
    uint256[] excludesTo;
    uint256[] responsesTo;
    uint256[] conditionsFrom;
    uint256[] milestonesFrom;

    //auth:
    uint256 authDisabled;
    address[][] authAccounts;
  }

  Workflow[] workflows;

  function getWorkflowName(uint256 workflowId) public constant returns (bytes32) {
    return workflows[workflowId].name;
  }

  function getActivityCount(uint256 workflowId) public constant returns (uint256) {
    return workflows[workflowId].activityNames.length;
  }

  function getActivityName(uint256 workflowId, uint256 activityId) public constant returns (bytes32) {
     return workflows[workflowId].activityNames[activityId];
  }

  function isIncluded(uint256 workflowId, uint256 activityId) public constant returns (bool) {
    return ((workflows[workflowId].included & (1<<activityId)) == 0);
  }

  function isExecuted(uint256 workflowId, uint256 activityId) public constant returns (bool) {
    return ((workflows[workflowId].executed & (1<<activityId)) == 0);
  }

  function isPending(uint256 workflowId, uint256 activityId) public constant returns (bool) {
    return ((workflows[workflowId].pending & (1<<activityId)) == 0);
  }

  function getRelations(uint256 relations) private constant returns (uint32[]) {
    uint32[] ret;
    for(var i = 0; i < 256; i++){
      if(relations & (1<<i) != 0)
        ret.push(i);
    }
    return ret;
  }

  function getIncludes(uint256 workflowId, uint256 activityId) external constant returns (uint32[]) {
    return getRelations(workflows[workflowId].includesTo[activityId]);
  }

  function getExcludes(uint256 workflowId, uint256 activityId) external constant returns (uint32[]) {
    return getRelations(workflows[workflowId].excludesTo[activityId]);
  }

  function getResponses(uint256 workflowId, uint256 activityId) external constant returns (uint32[]) {
    return getRelations(workflows[workflowId].responsesTo[activityId]);
  }

  function getConditions(uint256 workflowId, uint256 activityId) external constant returns (uint32[]) {
    return getRelations(workflows[workflowId].conditionsFrom[activityId]);
  }

  function getMilestones(uint256 workflowId, uint256 activityId) external constant returns (uint32[]) {
    return getRelations(workflows[workflowId].milestonesFrom[activityId]);
  }

  function getAccountWhitelist(uint256 workflowId, uint256 activityId) public constant returns (address[]) {
    return workflows[workflowId].authAccounts[activityId];
  }

  function isAuthDisabled(uint256 workflowId, uint256 activityId) public constant returns (bool) {
    return ((workflows[workflowId].authDisabled & (1<<activityId)) == 0);
  }

  function canExecute(uint256 workflowId, uint256 activityId) public constant returns (bool) {
    var workflow = workflows[workflowId];
    uint32 i;
    uint32 fromId;

    // sender address must have rights to execute or authentication must be disabled entirely
    if ((workflow.authDisabled & (1<<activityId)) == 0){
      for (i = 0; i < workflow.authAccounts[activityId].length; i++) {
        if (workflow.authAccounts[activityId][i] == msg.sender)
          break;
      }

      // sender not in authAccounts array
      if (i ==  workflow.authAccounts[activityId].length)
        return false;
    }
    
  
    // activity must be included
    if ((workflow.included & (1<<activityId)) == 0) return false;

    // all conditions executed
    if(workflow.conditionsFrom[activityId] & (~(workflow.executed & workflow.included)) != 0) return false;

    // no milestones pending
    if(workflow.milestonesFrom[activityId] & (workflow.pending & workflow.included) != 0) return false;

    return true;
  }

  function execute(uint256 workflowId, uint256 activityId) {
    var workflow = workflows[workflowId];
    uint32 i;
    uint32 toId; 

    if (!canExecute(workflowId, activityId)) throw;

    // executed activity
    workflow.executed = workflow.executed | (1<<activityId);
    workflow.pending = workflow.pending & (~(1<<activityId));

    // exclude and include relations pass
    // note includes happens after the exclude pass    
    workflow.included = (workflow.included & (~workflow.excludesTo[activityId])) | workflow.includesTo[activityId];

    // response relations pass
    workflow.pending = (workflow.pending | workflow.responsesTo[activityId]);

    LogExecution(workflowId, activityId, msg.sender);
  }

  function createWorkflow(
    // ugly squash hack to decrease stack depth
    // 0: workflow name
    // 1-end: activity names
    bytes32[] names,
    bool[3][] activityStates, // included, executed, pending

    // ugly squash hack to decrease stack depth
    // length is amount of activities
    // 0: counts for relationTypes and relationActivityIds
    // 1: counts for authAccounts
    uint32[2][] activityData,
    RelationType[] relationTypes,
    uint32[] relationActivityIds,

    address[] authAccounts, //mangler
    bool[] authDisabled
  ) {
    var workflow = workflows[workflows.length++];
    uint256 i;
    uint256 j;
    uint32 relationIndex = 0;
    uint32 authAccountIndex = 0;

    assert(activityData.length == names.length - 1);
    assert(activityData.length == authDisabled.length);
    assert(activityData.length <= 256);

    workflow.name = names[0];
    workflow.authAccounts.length = activityData.length;

    // authDisabled
    for (i = 0; i < authDisabled.length; i++){
        if(authDisabled[i]) {
            workflow.authDisabled = workflow.authDisabled | (1<<i);
        }
    }

    // states
    for (i = 0; i < activityStates.length; i++){
        if(activityStates[i][0]) {
            workflow.included = workflow.included | (1<<i);
        }
        if(activityStates[i][1]) {
            workflow.executed = workflow.executed | (1<<i);
        }
        if(activityStates[i][2]) {
            workflow.pending = workflow.pending | (1<<i);
        }
    }

    // relations and name
    for (i = 0; i < activityData.length; i++) {
        workflow.activityNames[i] = names[1 + i];
        uint256[5] memory relations;
        for (j = 0; j < activityData[i][0]; j++) {
            if (relationTypes[relationIndex] == RelationType.Include)
                relations[0] = relations[0] | (1<<(relationActivityIds[relationIndex])); 
            else if (relationTypes[relationIndex] == RelationType.Exclude)
                relations[1] = relations[1] | (1<<(relationActivityIds[relationIndex])); 
            else if (relationTypes[relationIndex] == RelationType.Response)
                relations[2] = relations[2] | (1<<(relationActivityIds[relationIndex])); 
            else if (relationTypes[relationIndex] == RelationType.Condition)
                relations[3] = relations[3] | (1<<(relationActivityIds[relationIndex])); 
            else if (relationTypes[relationIndex] == RelationType.Milestone)
                relations[4] = relations[4] | (1<<(relationActivityIds[relationIndex])); 
            
            relationIndex++;
        }
        workflow.includesTo[i] = relations[0];
        workflow.excludesTo[i] = relations[1];
        workflow.responsesTo[i] = relations[2];
        workflow.conditionsFrom[i] = relations[3];
        workflow.milestonesFrom[i] = relations[4];

        for (j = 0; j < activityData[i][1]; j++) {
          workflow.authAccounts[j].push(authAccounts[authAccountIndex++]);
        }
    }
    
    LogWorkflowCreation(workflows.length - 1, workflow.name);
  }
}
