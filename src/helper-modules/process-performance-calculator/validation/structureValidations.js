/**Function that validates the basic criteria to ensure that the process is well-structured (structured into gateway blocks), which is necessary for further processing/the calculations.
 *
 * @param {Array} flowElements process flow elements
 * @returns {Object} {structureValidationPassed, problems, gateways}
 * gateways: [{id, $type, pattern, exclusiveOrParallel, incoming, outgoing, pathCount, potentialMatches, isLoop, matchId (not complete) }]
 */
function validateProcessStructure(flowElements) {
  let structureValidationPassed = true;
  const problems = [];
  let exclusiveSplitCount = 0;
  let parallelSplitCount = 0;
  let exclusiveJoinCount = 0;
  let parallelJoinCount = 0;

  const initialGateways = flowElements.filter((elem) => elem.$type.includes('Gateway'));

  if (initialGateways.length == 0) {
    return {
      structureValidationPassed: true,
      problems: [],
      gateways: [],
    };
  } else {
    const gatewayArray = initialGateways.map((elem) => {
      let splitOrJoin;
      let exclusiveOrParallel;
      let pathCount;

      //previous validations ensure that the following if-clauses are exhaustive and specific enough, but if the validations are changed, they need to be improved
      if (elem.outgoing.length > 1) {
        splitOrJoin = 'split';
        pathCount = elem.outgoing.length;
      } else if (elem.incoming.length > 1) {
        splitOrJoin = 'join';
        pathCount = elem.incoming.length;
      }

      if (elem.$type.includes('Exclusive') || elem.$type.includes('EventBased')) {
        exclusiveOrParallel = 'exclusive';
        if (splitOrJoin == 'split') {
          exclusiveSplitCount += 1;
        } else exclusiveJoinCount += 1;
      } else {
        exclusiveOrParallel = 'parallel';
        if (splitOrJoin == 'split') {
          parallelSplitCount += 1;
        } else parallelJoinCount += 1;
      }

      return {
        id: elem.id,
        $type: elem.$type,
        pattern: splitOrJoin,
        exclusiveOrParallel: exclusiveOrParallel,
        incoming: elem.incoming,
        outgoing: elem.outgoing,
        pathCount: pathCount,
        potentialMatches: [],
        isLoop: false,
        matchId: '',
      };
    });

    //if splits and joins match, check if path counts match
    if (exclusiveSplitCount != exclusiveJoinCount || parallelSplitCount != parallelJoinCount) {
      //check if the splits and joins match for exclusive gateways
      if (exclusiveSplitCount != exclusiveJoinCount) {
        problems.push({
          id: 'none',
          problem:
            'The number of exclusive splitting and exclusive joining gateways needs to be equal.',
        });
      }

      //check if the splits and joins match for parallel gateways
      if (parallelSplitCount != parallelJoinCount) {
        problems.push({
          id: 'none',
          problem:
            'The number of parallel splitting and parallel joining gateways needs to be equal.',
        });
      }
    } else {
      //determine potential matches and check if path counts match
      let mismatch = false;

      const intermediateGateways = gatewayArray.map((elem) => {
        let tempPathCount = elem.pathCount;
        let tempExclusiveOrParallel = elem.exclusiveOrParallel;
        let tempId = elem.id;

        //all splits with this path count and this exclusivity/parallelism
        const splitMatches = gatewayArray.filter(
          (el) =>
            el.exclusiveOrParallel == tempExclusiveOrParallel &&
            el.pattern == 'split' &&
            el.pathCount == tempPathCount,
        );

        //all joins with this path count and this exclusivity/parallelism
        const joinMatches = gatewayArray.filter(
          (el) =>
            el.exclusiveOrParallel == elem.exclusiveOrParallel &&
            el.pattern == 'join' &&
            el.pathCount == tempPathCount,
        );

        //check if the respective path counts match
        if (splitMatches.length != joinMatches.length) {
          mismatch = true;
          let matchProblem =
            elem.exclusiveOrParallel == 'exclusive'
              ? 'All paths that were created by an exclusive splitting gateway need to lead into a matching exclusive joining gateway.'
              : 'All paths that were created by a parallel splitting gateway need to lead into a matching parallel joining gateway.';

          structureValidationPassed = false;
          problems.push({
            id: 'none',
            problem: matchProblem,
          });
        } else {
          //fill in potential matches (changed: filtering (.filter((elem) => elem.id != tempId)) unnecessary!?)
          elem.potentialMatches =
            elem.pattern == 'split'
              ? joinMatches.map((el) => el.id)
              : splitMatches.map((el) => el.id);
        }
        return elem;
      });

      if (mismatch == false) {
        const joins = intermediateGateways.filter((el) => el.pattern == 'join');
        const loops = joins
          .map((elem) => {
            const loopSearchResult = findLoops(elem.outgoing[0], elem, [], intermediateGateways);
            if (loopSearchResult.loopResult == 'noLoop') {
              return;
            } else if (loopSearchResult.loopResult == 'forbiddenLoop') {
              structureValidationPassed = false;
              problems.push({
                id: elem.id,
                problem:
                  'The element is part of a loop that does not fulfill the requirements. ' +
                  'Loops can only consist of a join, an outgoing path with sequential elements that eventually leads to a split and a direct sequence flow from the split to the join.',
              });
              return;
            } else if (loopSearchResult.loopResult == 'allowedLoop') {
              return loopSearchResult;
            } else if (loopSearchResult.loopResult == 'unknownLoop') {
              return;
            } else {
              structureValidationPassed = false;
              problems.push({
                id: 'elem.id',
                problem:
                  'An unexpected error occurred when checking whether the gateway was part of a loop.',
              });
              return;
            }
          })
          .filter((elem) => elem != null);

        if (structureValidationPassed == true) {
          const finalGateways = intermediateGateways.map((elem) => {
            let tempId = elem.id;
            if (elem.pattern == 'join') {
              //check if id is in loops as a join
              let loopEntry = loops.find((el) => el.joinId == tempId); //action required
              if (loopEntry) {
                elem.isLoop = true;
                elem.matchId = loopEntry.loopMatch;
              }
            } else {
              //check if id is in loops as a match
              let loopEntry = loops.find((el) => el.loopMatch == tempId);
              if (loopEntry) {
                elem.isLoop = true;
                elem.matchId = loopEntry.joinId;
              }
            }
            return elem;
          });

          return {
            structureValidationPassed: true,
            problems: [],
            gateways: finalGateways,
          };
        }
      }
    }

    return {
      structureValidationPassed: false,
      problems: problems,
      gateways: [],
    };
  }
}

/**Function that finds out if a joining gateway is part of a loop and if so, whether the loop is allowed or forbidden ACTION REQUIRED: separate into findAllowedLoops and then findForbiddenLoops
 *
 * @param {Object} element the current element that is being evaluated (start: outgoing sequence flow of a joining gateway)
 * @param {Object} originalGateway the original join that is being checked for a loop
 * @param {Array} gatewayMemory the gateways that have already been passed (start: [])
 * @param {Array} allGateways gateway elements with additional info (gateway pattern (split/join) is relevant)
 * @returns {Object} {joinId: original joining gateway id, loopResult: 'noLoop'|'allowedLoop'|'unknownLoop'|'forbiddenLoop', (if allowedLoop:) loopMatch: id of the matching splitting gateway that "starts" the loop}
 */
function findLoops(element, originalGateway, gatewayMemory, allGateways) {
  const gatewayMem = gatewayMemory.flat();
  if (element.$type.includes('EndEvent')) {
    //the element is an end event:
    return { joinId: originalGateway.id, loopResult: 'noLoop' };
  } else if (!element.$type.includes('Gateway')) {
    //the element is not a gateway, continue with the next element
    if (element.$type.includes('SequenceFlow')) {
      let next = element.targetRef;
      if (next.$type.includes('Gateway')) {
        next = allGateways.find((elem) => elem.id == next.id);
      }
      return findLoops(next, originalGateway, gatewayMem, allGateways);
    } else {
      return findLoops(element.outgoing[0], originalGateway, gatewayMem, allGateways);
    }
  } else {
    //the element is a gateway:
    if (element.id == originalGateway.id) {
      //the element is the original gateway => it is part of a loop:
      let match;
      let allowedLoop = element.incoming.some((elem) => {
        let tempMatchId = elem.sourceRef.id;
        match = gatewayMem.find(
          (el) => el.id == tempMatchId && originalGateway.potentialMatches.includes(el.id),
        );
        if (
          match &&
          match.outgoing.length == 2 &&
          originalGateway.incoming.length == 2 &&
          originalGateway.$type.includes('Exclusive')
        ) {
          return true;
        } else return false;
      });
      if (allowedLoop == true) {
        //the loop is allowed (join has an incoming flow from matching split within gateway memory, join: 2 incoming, split: 2 outgoing)
        return { joinId: originalGateway.id, loopResult: 'allowedLoop', loopMatch: match.id };
      } else return { joinId: originalGateway.id, loopResult: 'forbiddenLoop' }; //the loop is not allowed
    } else {
      //the element is not the original gateway:
      if (gatewayMem.some((elem) => elem.id == element.id)) {
        //the element is in the gateway memory => there is a different loop in this path (which will be detected by another findLoops call)
        return { joinId: originalGateway.id, loopResult: 'unknownLoop' };
      } else {
        //the element is not in the gateway memory:
        gatewayMem.push(element);
        if (element.pattern == 'join') {
          //join: continue with the next element
          return findLoops(element.outgoing[0], originalGateway, gatewayMem, allGateways);
        } else {
          //split: findLoops for each outgoing path
          const nestedLoopSearch = element.outgoing.map((elem) => {
            let next = elem.targetRef;
            if (next.$type.includes('Gateway')) {
              next = allGateways.find((el) => el.id == next.id);
            }
            return findLoops(next, originalGateway, gatewayMem, allGateways);
          });
          if (nestedLoopSearch.every((elem) => elem.loopResult == 'noLoop')) {
            return { joinId: originalGateway.id, loopResult: 'noLoop' };
          } else if (nestedLoopSearch.some((elem) => elem.loopResult == 'forbiddenLoop')) {
            return { joinId: originalGateway.id, loopResult: 'forbiddenLoop' };
          } else {
            let loop = nestedLoopSearch.find((elem) => elem.loopResult == 'allowedLoop');
            if (loop) {
              return loop;
            } else return { joinId: originalGateway.id, loopResult: 'unknownLoop' };
          }
        }
      }
    }
  }
}

module.exports = {
  validateProcessStructure,
};
