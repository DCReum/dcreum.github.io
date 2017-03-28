pragma solidity ^0.4.9;

contract Workflow {

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


// Workflow data and creation:

    event Execution(address sender, uint32 id, bool successful);
    event ExternalStateEdit(address sender, uint32 id, RelationType typ, bool successful);
    event ActivityAdded(address sender, uint32 id);
    event RelationAdded(address sender, uint32 fromId, uint32 toId, RelationType typ);
    Activity[] activities;
    uint256 deletedActivitiesVector;
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
    /// localId: array of ids where the following external relation data should be put. Expected to be ordered such that localId[i] is id of the activity where externalId[i], workflowAddress[i] and relationType[i] is relevant.
    /// externalId: array of ids of activities on other workflow contracts. Ordered such that externalId[i] is activity i on workflowAddress[i]
    /// workflowAddress: array of addresses to other workflow contracts.
    /// relationType: array of external relation type enums.
    function Workflow (
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
        name = wfName;
        owner = msg.sender;

        activities.length = names.length;

        for (var i = 0; i < names.length; i++) {
            activities[i].name      = names[i];
            activities[i].included  = included[i];
            activities[i].executed  = executed[i];
            activities[i].pending   = pending[i];
        }
        uint externalRelationCounter = 0;
        // We expect all relation arrays are formed such that i % 2 = 0 is where the data is to be stored, and i+1 is the data that is to be stored there.
        for(i = 0; i < relations.length; i=i+2){
            if(relationType[i/2] == RelationType.Include)        activities[relations[i]].include.push(relations[i+1]);
            else if(relationType[i/2] == RelationType.Exclude)   activities[relations[i]].exclude.push(relations[i+1]);
            else if(relationType[i/2] == RelationType.Response)  activities[relations[i]].response.push(relations[i+1]);
            else if(relationType[i/2] == RelationType.Condition) activities[relations[i+1]].condition.push(relations[i]);
            else if(relationType[i/2] == RelationType.Milestone) activities[relations[i+1]].milestone.push(relations[i]);
            else if(relationType[i/2] == RelationType.External)
                activities[relations[i]].extRel.push(ExternalRelation(relations[i+1], externalWorkflowAddress[externalRelationCounter], RelationType(externalRelationType[i-externalRelationCounter++])));
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
        Activity memory a = activities[id];
        
        authorize(id);
        
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

        // Effect on executing activity - reentrancy issues!?
        a.executed = true;
        a.pending = false;
        Execution(msg.sender, id, true);

    }

    // Add a new authorized pub key to specified activity 
    function addToWhitelist(uint32 id, address actor){
        if(msg.sender != owner)
            throw;
        
        activities[id].whitelist.push(actor);
    }

    // Add a new external relation on activity id
    function addExternalRelation (uint32 actId, address workflow, RelationType relTyp) {
        authorize(actId);
                
        activities[actId].extRel.push(ExternalRelation(actId, workflow, relTyp));
    }

    function addActivities (
        bytes32[] names,        
        bool[] included,
        bool[] executed,
        bool[] pending,
        uint32[] relations, // even ids are fromIds, odd are toIds
        uint32[] internalRelations, // even ids are fromIds, odd are toIds
        RelationType[] relTyps, // expected to have size relations.length /2
        RelationType[] intRelTyps // expected to have size internalRelations.length /2
    ) returns (uint32[]) {
        // Non-invasive check
        for(var i = 0; i < relTyps.length; i++){
            RelationType typ = relTyps[i];

            if(typ == RelationType.Include || typ == RelationType.Exclude)
                throw;
        }

        uint32[] memory ids = new uint32[](names.length);
        
        for(i = 0; i < names.length; i++) {
            uint32 id = uint32(activities.length++);
            activities[id].name = name;
            activities[id].included = included[i];
            activities[id].executed = executed[i];
            activities[id].pending = pending[i];
            ids[i] = id;

            ActivityAdded(msg.sender, id);
        }

        for(i = 0; i < relations.length; i++) 
            addRelation(relations[i++], relations[i], relTyps[(i-1) / 2]);
        for(i = 0; i < internalRelations.length; i++) 
            addRelation(ids[internalRelations[i++]], ids[internalRelations[i]], intRelTyps[(i-1) / 2]);
        
        return ids;
    }
    
    function addRelation (uint32 fromId, uint32 toId, RelationType relTyp) {
        if(fromId >= activities.length || toId >= activities.length)
            throw;
        
        if(relTyp == RelationType.Include) activities[fromId].include.push(toId);
        else if(relTyp == RelationType.Exclude) activities[fromId].exclude.push(toId);
        else if(relTyp == RelationType.Response) activities[fromId].response.push(toId);
        else if(relTyp == RelationType.Condition) activities[toId].condition.push(fromId);
        else if(relTyp == RelationType.Milestone) activities[toId].milestone.push(fromId);

        RelationAdded(msg.sender, fromId, toId, relTyp);
    }

    function contains (uint32[] container, uint32 containee) internal returns (bool) {
        for(var j = 0; j < container.length; j++)
            if(container[j] == containee)
                return true;
        return false;
    }

    function isSubSetOf (uint32[] subSet, uint32[] superSet) internal returns (bool) {
        for(var i = 0; i < subSet.length; i++){
            if(!contains(superSet, subSet[i]))
                return false;
        }
        return true;
    }

    function isDeleted (uint32 id) internal returns (bool) {
        return (deletedActivitiesVector & (1 << id) == 0);
    }


    function deleteActivities(uint32[] ids) {
        uint256 deleteVector = 0;
        for(var i = 0; i < ids.length; i++){
            deleteVector = deleteVector ^ (1 << ids[i]);
        }

        if(deletedActivitiesVector & deleteVector != 0)
            throw;

        // check for outgoing relations
        for(i = 0; i < ids.length; i++){
            if(!isSubSetOf(activities[ids[i]].response, ids))
                throw;
        }

        // check incoming relations
        for(i = 0; i < activities.length; i++){
            if(contains(ids, i) || isDeleted(i))
                continue;

            for(var j = 0; j < activities[i].condition.length; j++)
                if(contains(ids, activities[i].condition[j]))
                    throw;
            
            for(j = 0; j < activities[i].milestone.length; j++)
                if(contains(ids, activities[i].milestone[j]))
                    throw;
        }

        //from here on in, we know that ids are allowed to be deleted
        deletedActivitiesVector = deletedActivitiesVector ^ deleteVector;

        for(i = 0; i < activities.length; i++){
            if(isDeleted(ids[i]))
                continue;
            
            // remove deleted include relations
            for(j = 0; j < activities[i].include.length; j++){
                if(isDeleted(activities[i].include[j])){
                    for(var k = j; k < activities[i].include.length; k++){
                        activities[i].include[k] = activities[i].include[k+1];
                    }
                    delete activities[i].include[activities[i].include.length - 1];
                    activities[i].include.length--;
                    j--;
                }
            }

            // remove deleted exclude relations            
            for(j = 0; j < activities[i].exclude.length; j++){
                if(isDeleted(activities[i].exclude[j])){
                    for(var k = j; k < activities[i].exclude.length; k++){
                        activities[i].exclude[k] = activities[i].exclude[k+1];
                    }
                    delete activities[i].exclude[activities[i].exclude.length - 1];
                    activities[i].exclude.length--;
                    j--;
                }
            }

            // remove deleted response relations
            for(j = 0; j < activities[i].response.length; j++){
                if(isDeleted(activities[i].response[j])){
                    for(k = j; k < activities[i].response.length; k++){
                        activities[i].response[k] = activities[i].response[k+1];
                    }
                    delete activities[i].response[activities[i].response.length - 1];
                    activities[i].response.length--;
                    j--;
                }
            }
        }

    }

    // Selfdestruct
    function sudoku() {
        if(msg.sender != owner)
            throw;
        
        selfdestruct(owner);
    }

   
// Functions for external activity state interaction, to enable interworkflow communication:

    // External state change call
    function externalStateChange (uint32 actId, RelationType relTyp) {
        
        // Authorization: Assuming that calling contract address is in activity whitelist
        authorize(actId);

        // Change local state
        if(relTyp == RelationType.Include) activities[actId].included = true;
        if(relTyp == RelationType.Exclude) activities[actId].included = false;
        if(relTyp == RelationType.Response) activities[actId].pending = true;
        ExternalStateEdit(msg.sender, actId, relTyp, true);
        
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