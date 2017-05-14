import web3 from "web3-wrapper";
import Stream from "mithril/stream";
import moment from "moment";
import m from "mithril";
import { address, abi } from "contract-details";

const contract = web3.eth.contract(abi).at(address);

class WorkflowEvent {
  static create(event, contract) {
    return new Promise((resolve, reject) => {
      web3.eth.getBlock(event.blockNumber, (error, block) => {
        if (error) reject(error);
        resolve({
          blockNumber: block.number,
          blockHash: block.hash,
          timestamp: moment.unix(block.timestamp),
          transactionHash: event.transactionHash,
        });
      });
    });
  }
}

class WorkflowCreationEvent extends WorkflowEvent {
  static create(event) {
    return super.create(event).then(result => new Promise((resolve, reject) => {
      result.type = "workflow-creation";
      result.senderAddress = event.args.creator;
      result.senderName = event.args.creator;
      result.workflowId = event.args.workflowId;
      result.workflowName = web3.toAscii(event.args.workflowName).trim();
      resolve(result);
    }));
  }
}

class ExecutionEvent extends WorkflowEvent {
  static create(event) {
    return super.create(event).then(result => new Promise((resolve, reject) => {
      contract.getWorkflowName(event.args.workflowId, (error, workflowName) => {
        if (error) reject(error);
        contract.getActivityName(event.args.activityId, (error, activityName) => {
          if (error) reject(error);
          result.type = "execution";
          result.senderAddress = event.args.executor;
          result.senderName = event.args.executor;
          result.workflowId = event.args.workflowId;
          result.workflowName = workflowName;
          result.activityId = event.args.activityId;
          result.activityName = web3.toAscii(activityName).trim();
          resolve(result);
        });
      });
    }));
  }
}

class Workflow {
  constructor(workflowName, activities, relations) {
    this.workflowName = workflowName;
    this.activities = activities;
    this.relations = relations;
    this.getContractArguments = this.getContractArguments.bind(this);
  }

  getContractArguments() {
    const count = (array, predicate) => array.filter(predicate).length;
    const relationNode = (relation, isOther) => {
      switch (relation.type) {
        case "include":
        case "exclude":
        case "response":
          return isOther ? relation.to : relation.from;
        case "condition":
        case "milestone":
          return isOther ? relation.from : relation.to;
        default:
          throw "Invalid relation type";
      }
    }
    const relationSelf = relation => relationNode(relation, false);
    const relationOther = relation => relationNode(relation, true);
    const padEnd = (str, targetLength, padStr) => str + padStr.repeat(targetLength - str.length);
    const packedActivityId = oldId => count(this.activities.slice(0, oldId), x => x);

    let activities = this.activities.filter(x => x);
    let relations = this.relations.filter(x => x)
      .map(relation => new Relation(packedActivityId(relation.from), packedActivityId(relation.to), relation.type))
      .sort((lhs, rhs) => relationSelf(lhs) - relationSelf(rhs));


    return [
      // names
      [this.workflowName]
        .concat(activities.map(activity => activity.name))
        .map(str => padEnd(str, 32, " ")),

      // activityStates
      activities.map(activity => [
        activity.isIncluded,
        activity.isExecuted,
        activity.isPending
      ]),

      // activityData
      activities.map((activity, i) => [
        // counts for relationTypes and relationActivityIds
        count(relations, relation => relationSelf(relation) === i),

        // counts for accountWhitelist
        activity.accountWhitelist.length,
      ]),

      // relationTypes
      relations.map(relation => relation.typeToNumber()),

      // relationActivityIds
      relations.map(relation => relationOther(relation)),

      // accountWhitelist
      activities.map(activity => activity.accountWhitelist).reduce((prev, curr) => prev.concat(curr), []),

      // authDisabled
      activities.map(activity => activity.accountWhitelist.length === 0)
    ];
  }
}

class Activity {
  constructor(id, name, included, executed, pending) {
    this.id = id;
    this.name = name;
    this.isIncluded = included;
    this.isExecuted = executed;
    this.isPending = pending;
    this.relations = [];
    this.accountWhitelist = [];
  }
}

class Relation {
  constructor(from, to, type) {
    this.from = from;
    this.to = to;
    this.type = type;
    this.typeToNumber = this.typeToNumber.bind(this);
  }

  typeToNumber() {
    switch (this.type) {
      case "include":
        return 0;
      case "exclude":
        return 1;
      case "response":
        return 2;
      case "condition":
        return 3;
      case "milestone":
        return 4;
      default:
        throw "Invalid relation type";
    }
  }
}

// Converts a web3-style callback function to an ES6 promise
function promiseCall(fn) {
  return function () {
    return new Promise((resolve, reject) => {
      let args = Array.prototype.slice.call(arguments);
      args.push((error, result) => error ? reject(error) : resolve(result));
      fn.apply(null, args);
    });
  };
}

class WorkflowManager {
  constructor(workflowId) {
    this.workflowId = workflowId;

    this.hasSynced = Stream(false);
    this.blockNumber = Stream();
    this.transactionHash = Stream();
    this.creatorAddress = Stream();
    this.workflowName = Stream();
    this.events = Stream([]);
    this.activities = Stream([]);
    this.relations = this.activities.map(activities =>
      activities.map(activity => activity.relations).reduce((acc, relations) => acc.concat(relations), []));

    // Bind instance functions
    this.createEvent = this.createEvent.bind(this);
    this.sync = this.sync.bind(this);

    // Convert all contract calls to ES6 promise calls
    this.getWorkflowName = promiseCall(contract.getWorkflowName).bind(null, this.workflowId);
    this.getGroupNames = promiseCall(contract.getGroupNames).bind(null, this.workflowId);
    this.getGroupsOfAccount = promiseCall(contract.getGroupsOfAccount).bind(null, this.workflowId);
    this.getActivityCount = promiseCall(contract.getActivityCount).bind(null, this.workflowId);
    this.getActivityName = promiseCall(contract.getActivityName).bind(null, this.workflowId);
    this.isIncluded = promiseCall(contract.isIncluded).bind(null, this.workflowId);
    this.isExecuted = promiseCall(contract.isExecuted).bind(null, this.workflowId);
    this.isPending = promiseCall(contract.isPending).bind(null, this.workflowId);
    this.getIncludes = promiseCall(contract.getIncludes).bind(null, this.workflowId);
    this.getExcludes = promiseCall(contract.getExcludes).bind(null, this.workflowId);
    this.getResponses = promiseCall(contract.getResponses).bind(null, this.workflowId);
    this.getConditions = promiseCall(contract.getConditions).bind(null, this.workflowId);
    this.getMilestones = promiseCall(contract.getMilestones).bind(null, this.workflowId);
    this.getGroupWhitelist = promiseCall(contract.getGroupWhitelist).bind(null, this.workflowId);
    this.getAccountWhitelist = promiseCall(contract.getAccountWhitelist).bind(null, this.workflowId);
    this.isAuthDisabled = promiseCall(contract.isAuthDisabled).bind(null, this.workflowId);
    this.canExecute = promiseCall(contract.canExecute).bind(null, this.workflowId);
    this.LogExecution = promiseCall(contract.LogExecution);
    this.execute = contract.execute;
    
    // Fetch  workflow name, activities and relations
    this.sync();

    let addEvent = event => {
      let events = this.events();
      events.push(event);
      this.events(events);
    };

    let redraw = () => m.redraw();
    let sync = () => this.sync();

    // Fetch all events so far and subscribe to future events
    contract.LogWorkflowCreation({ workflowId: this.workflowId }, { fromBlock: "earliest" }, (error, event) =>
      this.createEvent(event)
        .then(addEvent)
        .then(redraw)
    );
    
    contract.LogExecution({ workflowId: this.workflowId }, { fromBlock: "earliest" }, (error, event) =>
      this.createEvent(event)
        .then(addEvent)
        .then(sync)
        .then(redraw)
    );
  };

  sync() {
    let result = {};
    return Promise.all([
      WorkflowManager.LogWorkflowCreation({ workflowId: this.workflowId }, { fromBlock: 0 }).then(event => {
        result.creatorAddress = event.args.creator;
        result.blockNumber = event.blockNumber;
        result.transactionHash = event.transactionHash;
      }),

      this.getWorkflowName()
        .then(web3.toAscii)
        .then(String.trim)
        .then(name => result.workflowName = name),

      this.getActivityCount()
        .then(count => {
          result.activities = [];
          let promises = [];
          for (let activityId = 0; activityId < count; activityId++) {
            result.activities[activityId] = new Activity(activityId);
            promises.push(this.getActivityName(activityId).then(web3.toAscii).then(name => result.activities[activityId].name = name));
            promises.push(this.isIncluded(activityId).then(isIncluded => result.activities[activityId].isIncluded = isIncluded));
            promises.push(this.isExecuted(activityId).then(isExecuted => result.activities[activityId].isExecuted = isExecuted));
            promises.push(this.isPending(activityId).then(isPending => result.activities[activityId].isPending = isPending));
            promises.push(this.canExecute(activityId).then(canExecute => result.activities[activityId].canExecute = canExecute));

            promises.push(this.getIncludes(activityId).then(includes => includes.forEach(to => result.activities[activityId].relations.push(new Relation(activityId, to.toNumber(), "include")))));
            promises.push(this.getExcludes(activityId).then(excludes => excludes.forEach(to => result.activities[activityId].relations.push(new Relation(activityId, to.toNumber(), "exclude")))));
            promises.push(this.getResponses(activityId).then(responses => responses.forEach(to => result.activities[activityId].relations.push(new Relation(activityId, to.toNumber(), "response")))));
            promises.push(this.getConditions(activityId).then(conditions => conditions.forEach(from => result.activities[activityId].relations.push(new Relation(from.toNumber(), activityId, "condition")))));
            promises.push(this.getMilestones(activityId).then(milestones => milestones.forEach(from => result.activities[activityId].relations.push(new Relation(from.toNumber(), activityId, "milestone")))));

            promises.push(this.getAccountWhitelist(activityId).then(whitelist => result.activities[activityId].accountWhitelist = whitelist));
          }
          return Promise.all(promises);
        })
    ])
    .then(() => {
      this.creatorAddress(result.creatorAddress);
      this.blockNumber(result.blockNumber);
      this.transactionHash(result.transactionHash);
      this.workflowName(result.workflowName);
      this.activities(result.activities);
      this.hasSynced(true);
    });
  }

  createEvent(event) {
    switch (event.event) {
      case "LogWorkflowCreation":
        return WorkflowCreationEvent.create(event);
      case "LogExecution":
        return ExecutionEvent.create(event);
      default:
        console.error("Unknown event type", event.event);
    }
  }
}

WorkflowManager.contract = contract;
WorkflowManager.createWorkflow = promiseCall(contract.createWorkflow);
WorkflowManager.LogWorkflowCreation = promiseCall(contract.LogWorkflowCreation);

WorkflowManager.blockHref = blockNumber => `https://etherscan.io/block/${blockNumber}`;
WorkflowManager.transactionHref = hash => `https://etherscan.io/tx/${hash}`;
WorkflowManager.addressHref = address => `https://etherscan.io/address/${address}`;

export { WorkflowManager, Workflow, Activity, Relation };
