pragma solidity ^0.4.9;

contract theMonolith {
    // Data types:

    // enums are zero indexed - FYI.  
        enum RelationType {
        Include, Exclude, Response, Condition, Milestone, External
    }

    struct ExternalRelation {
        uint32 id;
        address ext;
        RelationType relationType;
    }

    struct Activity {
        // State
        bytes32 name;
        bool included;
        bool executed;
        bool pending;

        // Outgoing relations:
        uint32[] include;
        uint32[] exclude;
        uint32[] response;
        
        // Incoming relations:
        uint32[] condition;
        uint32[] milestone;

        // Access rights:
        address[] whitelist;

        // External relations:
        ExternalRelation[] extRel; // could be made into several lists if large 
    }
    struct Workflow{
        bytes32 workflowName;
        Activity[] activities;
        address creator;
    }

// Workflow data and creation:

    event Execution(address sender, uint32 id, bool successful);
    event ExternalStateEdit(address sender, uint32 id, RelationType typ, bool successful);
    event ActivityAdded(address sender, uint32 id);
    event RelationAdded(address sender, uint32 fromId, uint32 toId, RelationType typ);

    Workflow[] workflows;

    function CreateWorkflow (
        bytes32 wfName,
        bytes32[] names,
        bool[] included,
        bool[] executed,
        bool[] pending,

        uint32[] relations,
        RelationType[] relationType,
        // External relation data:
        address[] externalWorkflowAddress,
        uint32[] externalRelationType
    ) {
        Workflow wf = workflows[workflows.length++];
        if((relations.length/2) != relationType.length)
            throw;
            
        wf.workflowName = wfName;
        wf.creator = msg.sender;

        wf.activities.length = names.length;

        for (var i = 0; i < names.length; i++) {
            wf.activities[i].name      = names[i];
            wf.activities[i].included  = included[i];
            wf.activities[i].executed  = executed[i];
            wf.activities[i].pending   = pending[i];
        }
        uint externalRelationCounter = 0;
        // We expect all relation arrays are formed such that i % 2 = 0 is where the data is to be stored, and i+1 is the data that is to be stored there.
        for(i = 0; i <= relations.length; i+2){
            if(relationType[i/2] == RelationType.Include)        wf.activities[relations[i]].include.push(relations[i+1]);
            else if(relationType[i/2] == RelationType.Exclude)   wf.activities[relations[i]].exclude.push(relations[i+1]);
            else if(relationType[i/2] == RelationType.Response)  wf.activities[relations[i]].response.push(relations[i+1]);
            else if(relationType[i/2] == RelationType.Condition) wf.activities[relations[i+1]].condition.push(relations[i]);
            else if(relationType[i/2] == RelationType.Milestone) wf.activities[relations[i+1]].milestone.push(relations[i]);
            else if(relationType[i/2] == RelationType.External)
                wf.activities[relations[i]].extRel.push(ExternalRelation(relations[i+1], externalWorkflowAddress[externalRelationCounter], RelationType(externalRelationType[i-externalRelationCounter++])));
        }

    }

    function authorize(uint32 wfId, uint32 actId) private {
        if(workflows[wfId].activities[actId].whitelist.length > 0) {
            for (var i = 0; i < workflows[wfId].activities[actId].whitelist.length; i++) 
                if(workflows[wfId].activities[actId].whitelist[i] == msg.sender)
                    break;
            
            if(i == workflows[wfId].activities[actId].whitelist.length){
                throw; 
            }
        }
    }
    function logFail(uint32 wfId, uint32 id) private {
        Execution(msg.sender, id, false);
    }

    function execute(uint32 wfId, uint32 actId) {
        // Check that activity is in executable state
        Activity memory a = workflows[wfId].activities[actId];
        
        authorize(wfId, actId);
        
        if(!a.included){
            logFail(wfId, actId);
            return;
        }
        
        for (var i = 0; i < a.condition.length; i++) 
            if(!workflows[wfId].activities[a.condition[i]].executed && workflows[wfId].activities[a.condition[i]].included) {
                logFail(wfId, actId);
                return;
            }
        
        for (i = 0; i < a.milestone.length; i++) 
            if(workflows[wfId].activities[a.milestone[i]].pending && workflows[wfId].activities[a.milestone[i]].included) {
                logFail(wfId, actId);
                return;
            }

        // External checks
        for (i = 0; i < a.extRel.length; i++) {
            if(a.extRel[i].relationType == RelationType.Condition || a.extRel[i].relationType == RelationType.Milestone){
                // Maybe check if wf address is valid?
                Workflow wf = Workflow(a.extRel[i].ext);
                if(!wf.relationFulfilled(a.extRel[i].actId, a.extRel[i].relationType)) {
                    logFail(wfId, actId);
                    return;       
                }
            }
        }
        
        // Effects on other activities
        for (i = 0; i < a.include.length; i++) 
            workflows[wfId].activities[a.include[i]].included = true;
        for (i = 0; i < a.exclude.length; i++) 
            workflows[wfId].activities[a.exclude[i]].included = false;
        for (i = 0; i < a.response.length; i++) 
            workflows[wfId].activities[a.response[i]].pending = true; 

        // External state changes
        for (i = 0; i < a.extRel.length; i++){
            if( a.extRel[i].relationType == RelationType.Include || 
                a.extRel[i].relationType == RelationType.Exclude || 
                a.extRel[i].relationType == RelationType.Response) {
                    wf = Workflow(a.extRel[i].ext);
                    wf.externalStateChange(a.extRel[i].actId, a.extRel[i].relationType);
            }   
        }

        // Effect on executing activity - reentrancy issues!?
        a.executed = true;
        a.pending = false;
        Execution(msg.sender, actId, true);

    }
}