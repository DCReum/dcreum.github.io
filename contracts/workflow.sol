pragma solidity ^0.4.9;

contract Workflow {

// Data types:

    // enums are zero indexed - FYI.
    enum RelationType {
        Include, Exclude, Response, Condition, Milestone
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
    }


// Workflow data and creation:
    event Execution(address sender, uint32 id, bool successful);

    Activity[] activities;
    address owner;
    bytes32 name;

    /// names: array of activity names, where names[i] is the name of activity with id i
    /// included: array of activity included state, where included[i] is the included state of activity with id i 
    /// executed: array of activity executed state, where executed[i] is the executed state of activity with id i 
    /// pending: array of activity pending state, where pending[i] is the pending state of activity with id i 
    function Workflow (
        bytes32 wfName,
        bytes32[] names,
        bool[] included,
        bool[] executed,
        bool[] pending,

        uint32[] relations,
        RelationType[] relationType,

        address[] authorizedUsers, //order is defined by numberOfAuths
        uint32[] numberOfAuths //numberOfAuths[0] = number of authorized users for activity 0. If 0, anyone is authorized. 
    ) {
        if((relations.length/2) != relationType.length)
            throw;
            
        name = wfName;
        owner = msg.sender;

        activities.length = names.length;
        var authIndex = 0;

        for (var i = 0; i < names.length; i++) {
            activities[i].name      = names[i];
            activities[i].included  = included[i];
            activities[i].executed  = executed[i];
            activities[i].pending   = pending[i];
            activities[i].whitelist.length = numberOfAuths[i];
            for(var j = 0; j < numberOfAuths[i]; j++){
                activities[i].whitelist[j] = authorizedUsers[authIndex++];
            }
        }
        // We expect the 'relations' array is formed such the first index is the FROM activity and the next index is the TO activity. Rinse and repeat.
        for(i = 0; i < relations.length; i=i+2){
            if(relationType[i/2] == RelationType.Include)        activities[relations[i]].include.push(relations[i+1]);
            else if(relationType[i/2] == RelationType.Exclude)   activities[relations[i]].exclude.push(relations[i+1]);
            else if(relationType[i/2] == RelationType.Response)  activities[relations[i]].response.push(relations[i+1]);
            else if(relationType[i/2] == RelationType.Condition) activities[relations[i+1]].condition.push(relations[i]);
            else if(relationType[i/2] == RelationType.Milestone) activities[relations[i+1]].milestone.push(relations[i]);
            else throw;
        }

        

    }

// Internal functions:
    function logFail(uint32 id) private {
        Execution(msg.sender, id, false);
    }
    
    function authorize(uint32 actId) private {
        if(activities[actId].whitelist.length > 0) {
            for (var i = 0; i < activities[actId].whitelist.length; i++) 
                if(activities[actId].whitelist[i] == msg.sender)
                    break;
            
            if(i == activities[actId].whitelist.length){
                throw; 
            }
        }
    }

// External functions:
    function execute(uint32 id) {
        // Check that activity is in executable state
        authorize(id);
        Activity memory a = activities[id];
        
        if(!a.included){
            logFail(id);
            return;
        }
        
        for (var i = 0; i < a.condition.length; i++) 
            if(!activities[a.condition[i]].executed && activities[a.condition[i]].included) {
                logFail(id);
                return;
            }
        
        for (i = 0; i < a.milestone.length; i++) 
            if(activities[a.milestone[i]].pending && activities[a.milestone[i]].included) {
                logFail(id);
                return;
            }

        a.executed = true;
        a.pending = false;

        // Effects on other activities
        for (i = 0; i < a.include.length; i++) 
            activities[a.include[i]].included = true;
        for (i = 0; i < a.exclude.length; i++) 
            activities[a.exclude[i]].included = false;
        for (i = 0; i < a.response.length; i++) 
            activities[a.response[i]].pending = true; 

        Execution(msg.sender, id, true);
    }

    // Selfdestruct
    function sudoku() {
        if(msg.sender != owner)
            throw;
        
        selfdestruct(owner);
    }
}