# How to add a new capability?

In order to add a new capability to PROCEED you should use the capabilityValidator. The following example below shows you a valid capability example with "PhotographAction".

```json
{
  "@context": {
    "schema": "https://schema.org/",
    "fno": "https://w3id.org/function/ontology#",
    "xsd": "http://www.w3.org/2001/XMLSchema#",
    "dbpedia-owl": "http://dbpedia.org/ontology/",
    "fnom": "https://w3id.org/function/vocabulary/mapping#",
    "dcterms": "http://purl.org/dc/elements/1.1/",
    "doap": "http://usefulinc.com/ns/doap#",
    "fnoi": "https://w3id.org/function/vocabulary/implementation",
    "iotschema": "http://iotschema.org/",
    "saref": "https://w3id.org/saref#",
    "odpa": "http://www.ontologydesignpatterns.org/ont/dul/DUL.owl#",
    "terms": "http://purl.org/dc/terms/"
  },
  "@graph": [
    {
      "@id": "_:capability",
      "schema:potentialAction": {
        "@id": "_:PhotographActionDefinition",
        "@type": ["schema:PhotographAction", "fno:Function"]
      }
    },
    {
      "@id": "_:PhotographActionDefinition",
      "fno:expects": {
        "@list": [
          { "@id": "_:heightParameter" },
          { "@id": "_:widthParameter" },
          { "@id": "_:dpiParameter" },
          { "@id": "_:optionsParameter" }
        ]
      },
      "fno:returns": {
        "@list": [{ "@id": "_:imageParameter" }]
      }
    },
    {
      "@id": "_:heightParameter",
      "fno:predicate": [{ "@type": "schema:height" }],
      "@type": ["fno:Parameter", "schema:Integer"],
      "schema:unitText": "px",
      "fno:required": true
    },
    {
      "@id": "_:widthParameter",
      "@type": ["fno:Parameter", "schema:Integer", "schema:width"],
      "schema:unitText": "px",
      "schema:maxValue": 20,
      "fno:required": true
    },
    {
      "@id": "_:dpiParameter",
      "fno:predicate": [{ "@type": "dpi" }],
      "@type": ["fno:Parameter", "schema:Integer"],
      "schema:description": "required Dots Per Inch value, resolution",
      "fno:required": false
    },
    {
      "@id": "_:optionsParameter",
      "fno:predicate": [{ "@type": "options" }],
      "@type": ["fno:Parameter"],
      "terms:hasPart": {
        "@list": [
          {
            "@id": "_:blackWhiteParameter",
            "@type": ["fno:Parameter", "schema:Boolean", "blackWhite"],
            "fno:required": false,
            "schema:defaultValue": false
          },
          {
            "@id": "_:rotationParameter",
            "fno:predicate": [{ "@type": "rotation" }],
            "@type": ["fno:Parameter", "schema:Integer"],
            "schema:minValue": 0,
            "schema:maxValue": 359,
            "schema:defaultValue": 0,
            "fno:required": false
          }
        ]
      },
      "fno:required": false
    },
    {
      "@id": "_:imageParameter",
      "fno:predicate": [{ "@type": "schema:ImageObject" }],
      "@type": "fno:Output",
      "terms:hasPart": {
        "@list": [
          {
            "@id": "_:geoCoordinatesParameter",
            "fno:predicate": [{ "@type": "schema:GeoCoordinates" }],
            "@type": "fno:Output",
            "terms:hasPart": {
              "@list": [
                {
                  "@id": "_:latiduteParameter",
                  "@type": ["fno:Output", "schema:Float", "schema:latidute"]
                },
                {
                  "@id": "_:longitudeParameter",
                  "fno:predicate": [{ "@type": "schema:longitude" }],
                  "@type": ["fno:Output", "schema:Float"]
                }
              ]
            }
          },
          {
            "@id": "_:photographParameter",
            "fno:predicate": [{ "@type": "schema:Photograph" }],
            "@type": "fno:Output",
            "schema:encodingFormat": "image/png",
            "encoding": "base64"
          }
        ]
      }
    },
    {
      "@id": "_:PhotograhActionImplementation",
      "@type": "fnoi:JavaScriptFunction",
      "dbpedia-owl:filename": "index.js"
    },
    {
      "@id": "_:PhotograhActionMapping",
      "@type": "fno:Mapping",
      "fno:function": "_:PhotographActionDefinition",
      "fno:implementation": "_:PhotograhActionImplementation",
      "fno:parameterMapping": [
        {
          "@type": "fnom:PropertyParameterMapping",
          "fnom:functionParameter": "_:heightParameter",
          "fnom:implementationProperty": "h"
        },
        {
          "@type": "fnom:PropertyParameterMapping",
          "fnom:functionParameter": "_:widthParameter",
          "fnom:implementationProperty": "w"
        },
        {
          "@type": "fnom:PropertyParameterMapping",
          "fnom:functionParameter": "_:dpiParameter",
          "fnom:implementationProperty": "dpi"
        },
        {
          "@type": "fnom:PropertyParameterMapping",
          "fnom:functionParameter": "_:optionsParameter",
          "fnom:implementationProperty": "options"
        },
        {
          "@type": "fnom:PropertyParameterMapping",
          "fnom:functionParameter": [
            "_:optionsParameter",
            "_:blackWhiteParameter"
          ],
          "fnom:implementationProperty": "options/blackWhite"
        },
        {
          "@type": "fnom:PropertyParameterMapping",
          "fnom:functionParameter": [
            "_:optionsParameter",
            "_:rotationParameter"
          ],
          "fnom:implementationProperty": "options/rotation"
        }
      ],
      "fno:returnMapping": [
        {
          "@type": "fnom:DefaultReturnMapping",
          "fnom:functionParameter": "_:imageParameter",
          "fnom:implementationProperty": "img"
        },
        {
          "@type": "fnom:DefaultReturnMapping",
          "fnom:functionParameter": [
            "_:imageParameter",
            "_:geoCoordinatesParameter"
          ],
          "fnom:implementationProperty": "img/gps"
        },
        {
          "@type": "fnom:DefaultReturnMapping",
          "fnom:functionParameter": [
            "_:imageParameter",
            "_:geoCoordinatesParameter",
            "_:latiduteParameter"
          ],
          "fnom:implementationProperty": "img/gps/lat"
        },
        {
          "@type": "fnom:DefaultReturnMapping",
          "fnom:functionParameter": [
            "_:imageParameter",
            "_:geoCoordinatesParameter",
            "_:longitudeParameter"
          ],
          "fnom:implementationProperty": "img/gps/long"
        },
        {
          "@type": "fnom:DefaultReturnMapping",
          "fnom:functionParameter": [
            "_:imageParameter",
            "_:photographParameter"
          ],
          "fnom:implementationProperty": "img/photo"
        }
      ]
    }
  ]
}
```

## Function Definition

Each capability description consists of function definition, function implementation and function mapping used with a JSON-LD context and a graph. The first node of the graph explains the function definition and you should always include a potential action.

**You should always include "@context" and "@graph", so that the file is valid JSONLD. "@context" is used to construct the JSON-LD file with URIS. "@graph" is used in order to use duplicated keys in the semantic description.**

Please have a look to [Schema.org Hierarchy List](https://schema.org/docs/full.html) possible potential action keyword. You can also use the [Actions on iotschema.org Hierarchy List](http://iotschema.org/docs/full.html). Here is another example for the first node of the capability.

```json
({
  "@id": "_:capability",
  "odpa:sameSettingAs": "saref:LightingDevice",
  "schema:potentialAction": {
    "@type": ["iotschema:TurnOn", "fno:Function"],
    "@id": "_:TurnOnDefinition"
  }
},
{
  "@id": "_:TurnOnDefinition",
  "fno:expects": {
    "@list": [{ "@id": "_:colourParameter" }]
  },
  "fno:returns": {
    "@list": []
  }
})
```

As you can see you need to put the definition as a blank node with an `@id`, [Funtion Ontology expects Keyword](https://fno.io/ontology/index-en.html#expects) (eg: `fno:expects`) and [Funtion Ontology returns Keyword](https://fno.io/ontology/index-en.html#returns) (eg: `fno:returns`) for the expected and return parameters. If the function doesn't return anything, you can leave as an empty array.

## Parameter Definition

Afterwards you should have a semantic description for each parameter otherwise the validator will throw an error.

You should include

- [Function Ontology Required Keyword](https://w3id.org/function/ontology#required) to indicate if the parameter is required or not.

- the [Function Ontology Predicate Keyword](https://w3id.org/function/ontology#predicate) (eg: `fno:predicate`), which is the semantic description for the parameter
- **`PREDICATE` should always be used with '@type' as in the example, so that it can be parsed to an URI with the JSONLD library.**

**OR**

- **`@type` for indicating the type of the parameter.**

If there are multiple constraints for a parameter such as minimum Value or encoding format, you should include here as well. Here are two examples for two possible descriptions:

eg:

```json
{
  "@id": "_:widthParameter",
  "fno:predicate": [{ "@type": "schema:width" }],
  "@type": ["fno:Parameter", "schema:Integer"],
  "schema:unitText": "px",
  "schema:maxValue": 20,
  "fno:required": true
}
```

OR

```json
{
  "@id": "_:widthParameter",
  "@type": ["fno:Parameter", "schema:Integer", "schema:width"],
  "schema:unitText": "px",
  "schema:maxValue": 20,
  "fno:required": true
}
```

## Function Implementation

You should always include the function implementation in order to describe the function and where the function is located. It consists of one node and here is an example for it.

```json
{
  "@id": "_:TurnOnImplementation",
  "@type": "fnoi:JavaScriptFunction",
  "dbpedia-owl:filename": "index.js"
}
```

## Function Mapping

Function Mapping is the most cruial part of the semantic description. You should include the function definition and implementation to the node so that the semantic description is complete.

Have a look to following example:

```json
{
  "@id": "_:turnOnMapping",
  "@type": "fno:Mapping",
  "fno:function": "_:TurnOnDefinition",
  "fno:implementation": "_:TurnOnImplementation",
  "fno:parameterMapping": [
    {
      "@type": "fnom:PropertyParameterMapping",
      "fnom:functionParameter": "_:colourParameter",
      "fnom:implementationProperty": "col"
    }
  ]
}
```

As you can see, with using [Function Ontology Function keyword](https://w3id.org/function/ontology#function) (eg: `fno:function`) and [Function Ontology Implementation Keyword](https://w3id.org/function/ontology#implementation) (eg: `fno:implementation`) you can link the function definition and the implementation to the mapping. The mapping node should always include "@type": [Function Ontology Mapping Keyword](https://w3id.org/function/ontology#Mapping) (eg: `"fno:Mapping"`) and if there are expected parameters the [Function Ontology Parameter Mapping Keyword](https://w3id.org/function/ontology#parameterMapping) (eg : `fno:parameterMapping`) should be included and should be used with [Function Ontology Function Parameter Keyword](https://w3id.org/function/vocabulary/mapping#functionParameter)(eg: `fnom:functionParameter`) which maps to the semantic description of the parameter and [Function Ontology Implementation Parameter Keyword](https://w3id.org/function/vocabulary/mapping#implementationProperty) (eg :`fnom:implementationProperty`) which is the parameter name in the native function call.

If there are other parameters, it should be included as an array element to the [Function Ontology Parameter Mapping Keyword](https://w3id.org/function/ontology#parameterMapping) (eg : `fno:parameterMapping`) array.

## Objects

While describing objects, you should consider some constraints.

```json
{
  "@id": "_:imageParameter",
  "fno:predicate": "schema:ImageObject",
  "@type": "fno:Output",
  "terms:hasPart": {
    "@list": [
      {
        "@id": "_:geoCoordinatesParameter",
        "fno:predicate": [{ "@type": "schema:GeoCoordinates" }],
        "@type": "fno:Output",
        "terms:hasPart": {
          "@list": [
            {
              "@id": "_:latiduteParameter",
              "fno:predicate": [{ "@type": "schema:latidute" }],
              "@type": ["fno:Output", "schema:Float"]
            },
            {
              "@id": "_:longitudeParameter",
              "fno:predicate": [{ "@type": "schema:longitude" }],
              "@type": ["fno:Output", "schema:Float"]
            }
          ]
        }
      },
      {
        "@id": "_:photographParameter",
        "fno:predicate": [{ "@type": "schema:Photograph" }],
        "@type": "fno:Output",
        "schema:encodingFormat": "image/png",
        "encoding": "base64"
      }
    ]
  }
}
```

Here is a node of image parameter, which is an Output of the PhotographAction and it is an object. In order to indicate that YOU SHOULD ALWAYS USE [Terms Has Part Keyword](http://purl.org/dc/terms/hasPart') (eg: `"terms:hasPart"`) and the keys of **the object should be described with `@list` keyword**.

While describing the parameter mapping of an object, you should use the following format.

```json
"fno:returnMapping": [
  {
    "@type": "fnom:DefaultReturnMapping",
    "fnom:functionParameter": "_:imageParameter",
    "fnom:implementationProperty": "img"
  },
  {
    "@type": "fnom:DefaultReturnMapping",
    "fnom:functionParameter": [
      "_:imageParameter",
      "_:geoCoordinatesParameter"
    ],
    "fnom:implementationProperty": "img/gps"
  },
  {
    "@type": "fnom:DefaultReturnMapping",
    "fnom:functionParameter": [
      "_:imageParameter",
      "_:geoCoordinatesParameter",
      "_:latiduteParameter"
    ],
    "fnom:implementationProperty": "img/gps/lat"
  },
  {
    "@type": "fnom:DefaultReturnMapping",
    "fnom:functionParameter": [
      "_:imageParameter",
      "_:geoCoordinatesParameter",
      "_:longitudeParameter"
    ],
    "fnom:implementationProperty": "img/gps/long"
  },
  {
    "@type": "fnom:DefaultReturnMapping",
    "fnom:functionParameter": [
      "_:imageParameter",
      "_:photographParameter"
    ],
    "fnom:implementationProperty": "img/photo"
  }
]
```

This return object has the following native implementation:

```json
{
    photo: <base64coding>,
    gps: { lat: -50, long: 100}
}

```

So the whole object has the name img and the child keys should always be seperated with "/" and the [Function Ontology Function Parameter Keyword](https://w3id.org/function/vocabulary/mapping#functionParameter)(eg: `fnom:functionParameter`) should include the paraent and the key as an array.
