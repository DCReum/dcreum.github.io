pragma solidity ^0.4.9;

contract Workflow {


    // zero indexation.
    enum RelationType {
        Include, Exclude, Response, Condition, Milestone //Spawn to be added
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




    event Execution(address sender, uint32 id, bool successful);
    event ExternalEdit(address sender, uint32 id, RelationType typ, bool successful);
    Activity[] activities;
    address owner;
    bytes32 name;

    /// names: array of activity names, where names[i] is the name of activity with id i
    /// included: array of activity included state, where included[i] is the included state of activity with id i 
    /// executed: array of activity executed state, where executed[i] is the executed state of activity with id i 
    /// pending: array of activity pending state, where pending[i] is the pending state of activity with id i 
    /// include: array of include relations. The array is expected to have a structure such that i % 2 = 0 is the FROM activity and i + 1 is the TO activity 
    /// exclude: array of exclude relations. The array is expected to have a structure such that i % 2 = 0 is the FROM activity and i + 1 is the TO activity 
    /// response: array of response relations. The array is expected to have a structure such that i % 2 = 0 is the FROM activity and i + 1 is the TO activity 
    /// condition: array of condition relations. The array is expected to have a structure such that i % 2 = 0 is the TO activity and i + 1 is the FROM activity 
    /// milestone: array of milestone relations. The array is expected to have a structure such that i % 2 = 0 is the TO activity and i + 1 is the FROM activity 
    function Workflow (
        bytes32 wfName,
        bytes32[] names,
        bool[] included,
        bool[] executed,
        bool[] pending,
        uint32[] include,
        uint32[] exclude,
        uint32[] response,
        uint32[] condition,
        uint32[] milestone,
        // External relations:
        uint32[] localId,
        uint32[] externalId,
        address[] workflowAddress,
        uint32[] relationType

    ) {
        name = wfName;
        owner = msg.sender;

        activities.length = names.length;

        for (var i = 0; i < names.length; i++) {
            activities[i].name      = names[i];
            activities[i].included  = included[i];
            activities[i].executed  = executed[i];
            activities[i].pending   = pending[i];
        }

        // We expect all relation arrays are formed such that i % 2 = 0 is where the data is to be stored, and i+1 is the data that is to be stored there
        for (i = 0; i < include.length; i++) 
            activities[include[i++]].include.push(include[i]);
        for (i = 0; i < exclude.length; i++) 
            activities[exclude[i++]].exclude.push(exclude[i]);
        for (i = 0; i < response.length; i++) 
            activities[response[i++]].response.push(response[i]);
        for (i = 0; i < condition.length; i++) 
            activities[condition[i++]].condition.push(condition[i]);
        for (i = 0; i < milestone.length; i++) 
            activities[milestone[i++]].milestone.push(milestone[i]);

        // External relation creation
        for (i = 0; i < localId.length; i++)
            activities[localId[i]].extRel.push(ExternalRelation(externalId[i], workflowAddress[i], RelationType(relationType[i])));

    }

    function addToWhitelist(uint32 id, address actor){
        if(msg.sender != owner)
            throw;
        
        activities[id].whitelist.push(actor);
    }

    function logFail(uint32 id) private {
        Execution(msg.sender, id, false);
    }

    function execute(uint32 id) {
        // Check that activity is in executable state
        Activity memory a = activities[id];
        
        if(a.whitelist.length > 0) {
            for (var i = 0; i < a.whitelist.length; i++) 
                if(a.whitelist[i] == msg.sender)
                    break;
            
            if(i == a.whitelist.length){
                logFail(id);
                return;
            }
        }
        
        if(!a.included){
            logFail(id);
            return;
        }
        
        for (i = 0; i < a.condition.length; i++) 
            if(!activities[a.condition[i]].executed && activities[a.condition[i]].included) {
                logFail(id);
                return;
            }
        
        for (i = 0; i < a.milestone.length; i++) 
            if(activities[a.milestone[i]].pending && activities[a.milestone[i]].included) {
                logFail(id);
                return;
            }

        // External checks
        for (i = 0; i < a.extRel.length; i++) {
            if(a.extRel[i].relationType == RelationType.Condition || a.extRel[i].relationType == RelationType.Milestone){
                // Maybe check if wf address is valid?
                Workflow wf = Workflow(a.extRel[i].ext);
                if(!wf.relationFulfilled(a.extRel[i].id, a.extRel[i].relationType)) {
                    logFail(id);
                    return;       
                }
            }
        }
        
        // Effects on other activities
        for (i = 0; i < a.include.length; i++) 
            activities[a.include[i]].included = true;            
        
        for (i = 0; i < a.exclude.length; i++) 
            activities[a.exclude[i]].included = false; 
        
        for (i = 0; i < a.response.length; i++) 
            activities[a.response[i]].pending = true; 

        // External state changes
        for (i = 0; i < a.extRel.length; i++){
            if( a.extRel[i].relationType == RelationType.Include || 
                a.extRel[i].relationType == RelationType.Exclude || 
                a.extRel[i].relationType == RelationType.Response) {
                    wf = Workflow(a.extRel[i].ext);
                    wf.externalStateChange(a.extRel[i].id, a.extRel[i].relationType);
            }   
        }

        // Effect on executing activity
        a.executed = true;
        a.pending = false;
        Execution(msg.sender, id, true);

    }


    function sudoku() {
        if(msg.sender != owner)
            throw;
        
        selfdestruct(owner);
    }
   
    // Functions meant for external activity state interaction, to enable interworkflow communication
    function externalStateChange (uint32 actId, RelationType relTyp) {
        
        // Authorization: Assuming that calling contract address is in activity whitelist
        if(activities[actId].whitelist.length > 0) {
            for (var i = 0; i < activities[actId].whitelist.length; i++) 
                if(activities[actId].whitelist[i] == msg.sender)
                    break;
            
            if(i == activities[actId].whitelist.length){
                //ExternalEdit(msg.sender, actId, relTyp, false); // comment in for debug
                //return; // comment in for debug
                throw; // Comment out for debug
            }
        }

        if(relTyp == RelationType.Include) activities[actId].included = true;
        if(relTyp == RelationType.Exclude) activities[actId].included = false;
        if(relTyp == RelationType.Response) activities[actId].pending = true;
        ExternalEdit(msg.sender, actId, relTyp, true);
        
    }


    // returns true if calling activity is executable according to specified relation type
    function relationFulfilled (uint32 actId, RelationType relTyp) returns (bool) {

        // Condition logic
        if(relTyp == RelationType.Condition) 
            return !activities[actId].included || activities[actId].executed;
        
        // Milestone logic
        else if(relTyp == RelationType.Milestone) 
            return !activities[actId].included || !activities[actId].pending;
        
        // Default case given non-valid relation
        return false;
    }

}