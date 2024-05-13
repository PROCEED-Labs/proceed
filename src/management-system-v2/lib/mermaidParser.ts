type shape = {
  metaInfo: MetaInfo;
  id: string;
  label: string;
  pos: point;
  incoming: Array<string>;
  outgoing: Array<string>;
};

type point = {
  x: number;
  y: number;
};

type flow = {
  id: string;
  sourceRef: string;
  targetRef: string;
  waypoints: Array<point>;
  name?: string;
  namePoint?: point;
  nameWidth?: number;
  nameHeight?: number;
};

type MetaInfo = {
  xmlTag: string;
  width: number;
  height: number;
};

export function mermaid2BPMN(mermaid: string, xml: string): string {
  //extract relevant lines describing the graph from mermaid string
  //apply regular expression to split lines into groups
  const lines = mermaid.split('\n').map((l) => l.trim());
  const regExp = new RegExp(
    /(?<source>[A-Za-z0-9äüöÄÖÜ]+)(?<sourceBracketsLeft>[\(\[\{\>\/\\]*)(?<sourceLabel>[A-Za-z0-9 ?ÄÜÖäüö]*)(?<sourceBracketsRight>[\)\]\}\/\\]*) -->[\|]?(?<edgeLabel>[A-Za-z0-9ÄÜÖäüö ]*)[\|]? (?<target>[A-Za-z0-9ÄÖÜäöü]+)(?<targetBracketsLeft>[\(\[\{\>\/\\]*)(?<targetLabel>[A-Za-z0-9 ?ÄÖÜäöü]*)(?<targetBracketsRight>[\)\]\}\/\\]*)/,
  );
  const matches = lines.map((l) => regExp.exec(l));
  const groups = matches.map((m) => m?.groups).filter((g) => g);

  const shapes: Array<shape> = [];
  const flows: Array<flow> = [];

  for (let group of groups) {
    let source: shape, target: shape;
    if (group!.sourceLabel) {
      source = {
        metaInfo: getMetaInfo(group!.sourceBracketsLeft),
        id: group!.source,
        label: group!.source + ': ' + group!.sourceLabel,
        pos: { x: 0, y: 0 },
        incoming: [],
        outgoing: [],
      };
      shapes.push(source);
    } else {
      source = shapes.find((e) => e.id == group!.source)!;
    }
    if (group!.targetLabel) {
      const metaInfo = getMetaInfo(group!.targetBracketsLeft);
      target = {
        metaInfo: metaInfo,
        id: group!.target,
        label: group!.target + ': ' + group!.targetLabel,
        pos: getPos(source, metaInfo),
        incoming: [],
        outgoing: [],
      };
      shapes.push(target);
    } else {
      target = shapes.find((e) => e.id == group!.target)!;
    }
    const flow: flow = {
      id: source.id + '_' + target.id,
      sourceRef: source.id,
      targetRef: target.id,
      waypoints: [getMid(source), getMid(target)],
    };
    if (group!.edgeLabel) {
      flow.name = group!.edgeLabel;
      flow.namePoint = getMid(source, target);
      flow.nameWidth = 20;
      flow.nameHeight = 15;
    }
    flows.push(flow);
    source.outgoing.push(flow.id);
    target.incoming.push(flow.id);
  }

  let newXML = xml.slice(0, xml.indexOf('</documentation>') + 16); //XML Preamble including <documentation>...</documentation>
  //adding element definitions inside <process>...</process>
  for (let shape of shapes) {
    newXML += '<' + shape.metaInfo.xmlTag + ' id="' + shape.id + '" name="' + shape.label + '">';
    for (let inFlow of shape.incoming) {
      newXML += '<incoming>' + inFlow + '</incoming>';
    }
    for (let outFlow of shape.outgoing) {
      newXML += '<outgoing>' + outFlow + '</outgoing>';
    }
    newXML += '</' + shape.metaInfo.xmlTag + '>';
  }
  for (let flow of flows) {
    newXML +=
      '<sequenceFlow id="' +
      flow.id +
      '" sourceRef="' +
      flow.sourceRef +
      '" targetRef="' +
      flow.targetRef +
      '" ';
    if (flow.name) {
      newXML += 'name="' + flow.name + '" ';
    }
    newXML += '/>';
  }
  newXML += xml.slice(
    xml.indexOf('</process>'),
    xml.indexOf('>', xml.indexOf('<bpmndi:BPMNPlane')) + 1,
  );
  if (newXML.endsWith('/>')) {
    newXML = newXML.slice(0, -2) + '>';
  }
  for (let shape of shapes) {
    newXML += '<bpmndi:BPMNShape id="' + shape.id + '_di" bpmnElement="' + shape.id + '">';
    newXML +=
      '<dc:Bounds x="' +
      shape.pos.x +
      '" y="' +
      shape.pos.y +
      '" width="' +
      shape.metaInfo.width +
      '" height="' +
      shape.metaInfo.height +
      '" /><bpmndi:BPMNLabel/>';
    newXML += '</bpmndi:BPMNShape>';
  }
  for (let flow of flows) {
    newXML += '<bpmndi:BPMNEdge id="' + flow.id + '_di" bpmnElement="' + flow.id + '">';
    for (let waypoint of flow.waypoints) {
      newXML += '<di:waypoint x="' + waypoint.x + '" y="' + waypoint.y + '" />';
    }
    if (flow.name) {
      newXML +=
        '<bpmndi:BPMNLabel><dc:Bounds x="' +
        flow.namePoint!.x +
        '" y="' +
        flow.namePoint!.y +
        '" width="' +
        flow.nameWidth +
        '" height="' +
        flow.nameHeight +
        '" /></bpmndi:BPMNLabel>';
    }
    newXML += '</bpmndi:BPMNEdge>';
  }
  newXML += '</bpmndi:BPMNPlane></bpmndi:BPMNDiagram></definitions>';
  console.log(newXML);

  return newXML;
}

function getMid(shape: shape, shape2?: shape): point {
  if (shape2) {
    const p1 = getMid(shape);
    const p2 = getMid(shape2);
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    };
  }
  return {
    x: shape.pos.x + shape.metaInfo.width / 2,
    y: shape.pos.y + shape.metaInfo.height / 2,
  };
}

function getMetaInfo(bracketsLeft: string): MetaInfo {
  if (bracketsLeft == '[') {
    return {
      xmlTag: 'startEvent',
      width: 36,
      height: 36,
    };
  }
  if (bracketsLeft == '(') {
    return {
      xmlTag: 'task',
      width: 100,
      height: 80,
    };
  }
  if (bracketsLeft == '{') {
    return {
      xmlTag: 'exclusiveGateway',
      width: 50,
      height: 50,
    };
  }
  return {
    xmlTag: 'endEvent',
    width: 36,
    height: 36,
  };
}

function getPos(predecessor: shape, current: MetaInfo): point {
  return {
    x: predecessor.pos.x + predecessor.metaInfo.width + 60,
    y: predecessor.pos.y + (predecessor.metaInfo.height - current.height) / 2,
  };
}
