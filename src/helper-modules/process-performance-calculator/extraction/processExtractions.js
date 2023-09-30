const { extractElementInfos } = require('./elementExtractions');

//ACTION REQUIRED: specify mismatched (e.g. crisscross) join error and maybe generally improve error handling

/**Function that extracts relevant element information and builds an ordered array of the elements in a process
 *
 * @param {Array} validatedProcesses [{ processId, validationPassed, problems, validatedElements, gateways }] (for each included process in main)
 * (validatedElements: contains the original process elements as well as potentially nested gateways and validated elements -> relevant for call activities and subprocesses)
 * (gateways: {id, $type, pattern, exclusiveOrParallel, incoming, outgoing, pathCount, potentialMatches, isLoop, matchId (not complete) })
 * @returns {Array} [{ processId, validationPassed, extractionSuccessful, orderedProcess, problems }]
 */
function extractProcessInfos(validatedProcesses, settings) {
  const orderedProcesses = validatedProcesses.map((elem) => {
    let orderedProcess = [];
    let extractionSuccessful = false;
    if (elem.validationPassed == true) {
      let start = elem.validatedElements.find((el) => el.$type.includes('StartEvent'));
      let end = elem.validatedElements.find((el) => el.$type.includes('EndEvent')).id;
      let val = elem.validatedElements;
      orderedProcess = buildOrderedProcess(start, [end], val, elem.gateways, [], settings);
      //check for problems
      if (orderedProcess != 'unexpected error') {
        extractionSuccessful = true;
      }
    }
    return {
      processId: elem.processId,
      validationPassed: elem.validationPassed,
      extractionSuccessful: extractionSuccessful,
      orderedProcess: orderedProcess,
      problems: elem.problems,
    };
  });

  return orderedProcesses;
}

/**Function that builds an ordered array of the elements in a process by finding the successor(s) for every element, extracting relevant info
 * and pushing that into the ordered array (using special formats/structures for gateway blocks, sub processes and call activities)
 *
 * @param {Object} el (process) flow element
 * @param {Array} definedEndIds include the (potential) final element(s) of the respective process or element path array (end event or potential gateway matches)
 * @param {Array} valElems validated elements on the main level of a process (or subprocess)
 * @param {Array} gateways all gateways (with additional info) on the main level of a process (or subprocess)
 * @param {Array} target ordered process (or element path) array that is being built
 * @param {Object} settings mainly to see if the elements in nested processes (sub processes or called processes) need to be extracted (yes if overwriteWithParentPerformance == false)
 * @returns {Array} ordered array of the flow elements (with additional element information and nested/block elements) or 'unexpected error'
 */
function buildOrderedProcess(el, definedEndIds, valElems, gateways, targetArray, settings) {
  let overwrite = settings.overwriteWithParentPerformance;
  const target = targetArray;
  let elem;
  let next;

  //get next element
  if (!el.$type.includes('EndEvent')) {
    if (el.$type.includes('SequenceFlow')) {
      let nextId = el.targetRef.id;
      next = valElems.find((elem) => elem.id == nextId);
    } else {
      next = el.outgoing[0];
    }
  }

  //extractions according to element type
  if (
    el.$type.includes('StartEvent') ||
    el.$type.includes('Task') ||
    el.$type.includes('SequenceFlow') ||
    el.$type.includes('Intermediate')
  ) {
    elem = extractElementInfos(el, settings);
    target.push(elem);
  } else if (el.$type.includes('EndEvent')) {
    if (definedEndIds.includes(el.id)) {
      //if end event and defined end:
      elem = extractElementInfos(el);
      target.push(elem);
      return target;
    } else return 'unexpected error'; //shouldn't happen
  } else if (el.$type.includes('SubProcess') || el.$type.includes('CallActivity')) {
    elem = extractElementInfos(el);
    if (overwrite == false) {
      const validated = el.validatedElements;
      let start = validated.find((el) => el.$type.includes('StartEvent'));
      let end = validated.find((el) => el.$type.includes('EndEvent')).id;
      const ordered = buildOrderedProcess(start, [end], validated, el.gateways, [], settings);
      if (ordered == 'unexpected error') {
        return ordered;
      } else target.push({ $type: elem.$type, id: elem.id, parent: elem, nestedProcess: ordered });
    } else {
      target.push({ $type: elem.$type, id: elem.id, parent: elem, nestedProcess: [] });
    }
  } else if (el.$type.includes('Gateway')) {
    let tempId = el.id;
    let gateway = gateways.find((elem) => elem.id == tempId);
    if (gateway.pattern == 'split') {
      if (definedEndIds.includes(gateway.id) && gateway.isLoop == true) {
        // if defined end and loop: loop end
        target.push(gateway);
        return target;
      } else if (!definedEndIds.includes(gateway.id) && gateway.isLoop == false) {
        //if not defined end and not loop: new calls for outgoing paths
        const blockPaths = gateway.outgoing.map((elem) =>
          buildOrderedProcess(elem, gateway.potentialMatches, valElems, gateways, [], settings),
        );
        if (blockPaths.includes('unexpected error')) {
          return 'unexpected error';
        } else {
          //check if all paths return the same last element:
          const pathEnds = blockPaths.map((elem) => elem.pop());
          const join = pathEnds[0];
          let joinCheck = pathEnds.filter((elem) => elem.id != join.id).length;
          if (joinCheck != 0) {
            return 'unexpected error'; //shouldn't happen, but might happen if a crisscross gateway pattern is included
          } else {
            let blockType;
            if (gateway.$type.includes('Parallel')) {
              blockType = 'ParallelBlock';
            } else {
              //event based or exclusive, needs to be changed/extended if other gateways are allowed
              blockType = 'ExclusiveBlock';
            }
            target.push({
              $type: blockType,
              split: gateway,
              join: join,
              blockPaths: blockPaths,
            });
            next = join.outgoing[0];
          }
        }
      } else {
        return 'unexpected error'; //shouldn't happen
      }
    } else {
      //join
      if (gateway.isLoop == true) {
        let start = gateway.outgoing[0];
        let end = [gateway.matchId];
        const loopPath = buildOrderedProcess(start, end, valElems, gateways, [], settings);
        if (loopPath == 'unexpected error') {
          return loopPath;
        } else {
          loopPath.pop(); //split?
          const split = gateways.find((elem) => elem.id == gateway.matchId);
          const loopingSequenceFlow = split.outgoing.find((elem) =>
            gateway.incoming.some((el) => el.id == elem.id),
          );
          target.push({
            $type: 'LoopBlock',
            split: split,
            join: gateway,
            loopedPath: loopPath,
            loopingSequenceFlow: extractElementInfos(loopingSequenceFlow, settings),
          });
          next = split.outgoing.find((elem) => !gateway.incoming.includes(elem.id));
        }
      } else {
        if (definedEndIds.includes(gateway.id)) {
          //if not loop and defined end: block end
          target.push(gateway);
          return target;
        } else {
          return 'unexpected error'; //shouldn't happen
        }
      }
    }
  } else {
    return 'unexpected error'; //shouldn't happen
  }

  return buildOrderedProcess(next, definedEndIds, valElems, gateways, target, settings);
}

module.exports = {
  extractProcessInfos,
};
