pragma solidity 0.4.9;

contract DCReum {
  event LogWorkflowCreation(uint256 indexed workflowId, bytes32 indexed workflowName);
  event LogExecution(uint256 indexed workflowId, uint256 indexed activityId, address indexed executor);

  enum RelationType {
    Include, Exclude, Response, Condition, Milestone, External
  }

  struct ExternalRelation {
    uint256 workflowId;
    uint256 activityId;
    RelationType relationType;
  }

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
    ExternalRelation[] externals;
  }

  Workflow[] public workflows;

  function canExecute(uint256 workflowId, uint256 activityId) returns (bool) {
    var workflow = workflows[workflowId];
    var activity = workflow.activities[activityId];
    Activity memory fromActivity;
    uint32 i;
    bool isSenderAuthed;
    bool[32] memory senderGroups;
    ExternalRelation memory externalRelation;
    Workflow memory externalWorkflow;

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

    if (!isSenderAuthed) return false;

    // activity must be included
    if (!activity.included) return false;

    // all conditions executed
    for (i = 0; i < activity.conditionFrom.length; i++) {
      fromActivity = workflow.activities[activity.conditionFrom[i]];
      if (!fromActivity.executed && fromActivity.included) return false;
    }

    // no milestones pending
    for (i = 0; i < activity.milestoneFrom.length; i++) {
      fromActivity = workflow.activities[activity.milestoneFrom[i]];
      if (fromActivity.pending && fromActivity.included) return false;
    }

    // External checks
    for (i = 0; i < activity.externals.length; i++) {
      externalWorkflow = workflows[activity.externals[i].workflowId];
      fromActivity = externalWorkflow.activities[activity.externals[i].activityId];
      externalRelation = activity.externals[i];

      // Condition logic
      if(externalRelation.relationType == RelationType.Condition && !fromActivity.executed && fromActivity.included) 
        return false;
      
      // Milestone logic
      else if(externalRelation.relationType == RelationType.Milestone && fromActivity.pending && fromActivity.included) 
        return false;
    }

    return true;
  }

  function execute(uint256 workflowId, uint256 activityId) {
    var workflow = workflows[workflowId];
    var activity = workflow.activities[activityId];
    uint32 i;
    uint32 toId;
    Workflow memory externalWorkflow;
    ExternalRelation memory externalRelation;    
    
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

    // External state changes
    for (i = 0; i < activity.externals.length; i++) {
      externalRelation = activity.externals[i];
      externalWorkflow = workflows[externalRelation.workflowId];

      if(externalRelation.relationType == RelationType.Exclude)
        externalWorkflow.activities[externalRelation.activityId].included = false;
      if(externalRelation.relationType == RelationType.Include)
        externalWorkflow.activities[externalRelation.activityId].included = true;
      if(externalRelation.relationType == RelationType.Response)
        externalWorkflow.activities[externalRelation.activityId].pending = true;
    }

    LogExecution(workflowId, activityId, msg.sender);
  }

  function createWorkflow(
        bytes32 workflowName,
        bytes32[] activityNames,
        bool[] included,
        bool[] executed,
        bool[] pending,

        uint32[] relations,
        RelationType[] relationType,
        // External relation data:
        uint256[] externalWorkflowId,
        uint32[] externalRelationType,

        bytes32[32] groupNames,
        address[] groupMemberAddresses,
        bool[] groupMemberRights
    ) {
        // uint256 i;
        // uint256 j;

        Workflow wf = workflows[workflows.length++];
        // if((relations.length/2) != relationType.length)
        //     throw;
            
        wf.name = workflowName;
        // wf.groupNames = groupNames;
        // for (i = 0; i < groupMemberAddresses.length; i++) {
        //   var rights = wf.groupMembers[groupMemberAddresses[i]];
        //   for (j = 0; j < 32; j++) {
        //      rights[j] = groupMemberRights[i*32 + j];
        //   }
        // }

        // wf.activities.length = activityNames.length;

        // for (i = 0; i < activityNames.length; i++) {
        //     wf.activities[i].name      = activityNames[i];
        //     wf.activities[i].included  = included[i];
        //     wf.activities[i].executed  = executed[i];
        //     wf.activities[i].pending   = pending[i];
        // }
        
        // // We expect all relation arrays are formed such that i % 2 = 0 is where the data is to be stored, and i+1 is the data that is to be stored there.
        // j = 0;
        // for(i = 0; i <= relations.length; i += 2){
        //     if(relationType[i/2] == RelationType.Include)        wf.activities[relations[i]].includeTo.push(relations[i+1]);
        //     else if(relationType[i/2] == RelationType.Exclude)   wf.activities[relations[i]].excludeTo.push(relations[i+1]);
        //     else if(relationType[i/2] == RelationType.Response)  wf.activities[relations[i]].responseTo.push(relations[i+1]);
        //     else if(relationType[i/2] == RelationType.Condition) wf.activities[relations[i+1]].conditionFrom.push(relations[i]);
        //     else if(relationType[i/2] == RelationType.Milestone) wf.activities[relations[i+1]].milestoneFrom.push(relations[i]);
        //     else if(relationType[i/2] == RelationType.External)
        //         wf.activities[relations[i]].externals.push(ExternalRelation(relations[i+1], externalWorkflowId[j], RelationType(externalRelationType[i-j++])));
        // }

        LogWorkflowCreation(workflows.length - 1, workflowName);
    }
}
