// query we use to fetch alls plans of a specific type to show inside a selection
export const minimalPlansQuery = `
query getInspectionPlans($type: entityType, $sort: String, $limit: Int) {
  getInspectionPlans(type: $type, sort: $sort, limit: $limit) {
    inspectionPlans {
      _id
      jobName
      customer
      customerOrderNo
      templateId
      createdBy {
        createdAt
      }
      title {
        value
      }
      status
    }
  }
}
`;

// query we use to fetch a plan to display its information in the frontend
export const minimalPlanQuery = `
query test($id: ID!, $type: entityType){
  getInspectionPlan(_id: $id, type: $type) {
    inspectionPlan {
      _id
      jobName
      customer
      customerOrderNo
      templateId
      title
      {
        value
      }
      status
      assemblyGroup {
        _id
        assemblyGroupName {
          value
        }
        assemblyGroupNumber {
          value
        }
        manufacturingStep {
          _id
          manufacturingStepName {
            value
          }
          manufacturingStepCode {
            value
          }
          inspectionOrders {
            _id
            inspectionDescriptionShort {
              value
            }
            inspectionDescriptionLong {
              value
            }
            inspectionCode {
              value
            }
          }
        }
      }
    }
  }
}
`;

// query that is used in 5i Web App to fetch the template information when creating a plan from a template
export const planCreationTemplateQuery = `
query getInspectionPlan($id: ID!, $type: entityType) {
  getInspectionPlan(_id: $id, type: $type) {
    inspectionPlan {
      title {
        language
        value
      }
      inspectionPlanComment {
        language
        value
      }
      numberOfConflicts
      progress {
        total
        completed
      }
      technicalReference
      legalOwnerLogo {
        imageName
      }
      documentType
      businessType
      materials {
        materialNumber
        materialName
        serialNumber
      }
      materialType {
        name
      }
      serviceNotificationNumber
      originalCustomerOrderNumber
      productUsedIn {
        language
        value
      }
      numberOfProducts
      approvedBy {
        approverID
        approvedAt
      }
      responsibleDepartment
      legalOwner
      inspectors {
        _id
        name
      }
      follower
      responsible {
        _id
        responsibleID
        assignedAt
      }
      assemblyGroup {
        assemblyGroupNumber {
          language
          value
        }
        assemblyGroupName {
          language
          value
        }
        procurementCode
        manufacturingStep {
          progress {
            total
            completed
          }
          manufacturingStepName {
            language
            value
          }
          manufacturingStepCode {
            language
            value
          }
          inspectionOrders {
            reportProgress {
              total
              completed
            }
            inspectionCode {
              language
              value
            }
            inspectionDescriptionShort {
              language
              value
            }
            inspectionDescriptionLong {
              language
              value
            }
            protocolTemplateId
            inspectionRegulations {
              name
              link
              filename
            }
            internationalInspectionNorms {
              name
              link
              filename
            }
            acceptanceCriteria {
              language
              value
            }
            numberOfInspectionLots {
              language
              value
            }
            inspectionLotSize {
              language
              value
            }
            customerRelevance {
              language
              value
            }
            inspectionApprovers {
              _id
              inspectionApproverID
              approvalType {
                language
                value
              }
            }
            customerInspectionPossible
            customerDocumentationRelevant
            customerSpecification {
              language
              value
            }
            certificationType {
              language
              value
            }
            inspectionLocation {
              language
              value
            }
            numberOfApprovals
            numberOfInspectionLots {
              language
              value
            }
            approvalAssemblyGroup {
              language
              value
            }
            supplierCertificationType {
              language
              value
            }
            languageOfCustomerDocumentation {
              language
              value
            }
            revisionStatusPosition
            inspectionSeverity
            drawings {
              name
              link
              filename
            }
          }
        }
      }
      revisionHistory {
        editor {
          accountID
        }
        revisionNumber
        revisionDate
        revisionComment
      }
      status
      workStatus
      createdBy {
        userID
        createdAt
      }
      modifiedBy {
        modifierID
        modifiedAt
      }
    }
  }
}
`;

// query that is used to create a new plan in the 5thIndustry Web App
export const inspectionPlanCreationMutation = `
mutation createInspectionPlan($plan: CreateInpsectionPlanInput!, $type: entityType) {
  createInspectionPlan(plan: $plan, type: $type) {
    code
    success
    message
    inspectionPlan {
      _id
      title {
        language
        value
        __typename
      }
      inspectionPlanComment {
        language
        value
        __typename
      }
      customer
      revisionNumber
      customerOrderNo
      jobName
      numberOfConflicts
      technicalReference
      legalOwnerLogo {
        imageName
        __typename
      }
      documentType
      businessType
      materials {
        materialNumber
        materialName
        serialNumber
        __typename
      }
      materialType {
        name
        __typename
      }
      serviceNotificationNumber
      originalCustomerOrderNumber
      productUsedIn {
        language
        value
        __typename
      }
      numberOfProducts
      approvedBy {
        approverID
        approvedAt
        __typename
      }
      responsibleDepartment
      legalOwner
      inspectors {
        _id
        name
        __typename
      }
      follower
      responsible {
        _id
        responsibleID
        assignedAt
        __typename
      }
      assemblyGroup {
        _id
        assemblyGroupNumber {
          language
          value
          __typename
        }
        assemblyGroupName {
          language
          value
          __typename
        }
        procurementCode
        manufacturingStep {
          _id
          manufacturingStepName {
            language
            value
            __typename
          }
          manufacturingStepCode {
            language
            value
            __typename
          }
          inspectionOrders {
            _id
            inspectionCode {
              language
              value
              __typename
            }
            inspectionDescriptionShort {
              language
              value
              __typename
            }
            inspectionDescriptionLong {
              language
              value
              __typename
            }
            protocolTemplateId
            inspectionReportID
            inspectionRegulations {
              name
              link
              filename
              __typename
            }
            internationalInspectionNorms {
              name
              link
              filename
              __typename
            }
            acceptanceCriteria {
              language
              value
              __typename
            }
            numberOfInspectionLots {
              language
              value
              __typename
            }
            inspectionLotSize {
              language
              value
              __typename
            }
            customerRelevance {
              language
              value
              __typename
            }
            inspectionApprovers {
              _id
              inspectionApproverID
              approvalType {
                language
                value
                __typename
              }
              __typename
            }
            customerInspectionPossible
            customerDocumentationRelevant
            customerSpecification {
              language
              value
              __typename
            }
            certificationType {
              language
              value
              __typename
            }
            inspectionLocation {
              language
              value
              __typename
            }
            numberOfApprovals
            numberOfInspectionLots {
              language
              value
              __typename
            }
            approvalAssemblyGroup {
              language
              value
              __typename
            }
            supplierCertificationType {
              language
              value
              __typename
            }
            languageOfCustomerDocumentation {
              language
              value
              __typename
            }
            revisionStatusPosition
            inspectionSeverity
            drawings {
              name
              link
              filename
              __typename
            }
            __typename
          }
          __typename
        }
        __typename
      }
      revisionHistory {
        editor {
          accountID
          __typename
        }
        revisionNumber
        revisionDate
        revisionComment
        __typename
      }
      status
      createdBy {
        userID
        createdAt
        __typename
      }
      modifiedBy {
        modifierID
        modifiedAt
        __typename
      }
      __typename
    }
    __typename
  }
}
`;

// query that allows to update attributes of an existing plan in the 5thIndustry Web App
export const atomicInspectionPlanMutation = `
mutation atomicInspectionPlan($atomics: [inspectionPlanAtomic!]!, $type: entityType) {
  atomicInspectionPlan(atomics: $atomics, type: $type) {
  code
  success
  message
  __typename
  }
 }
`;

export const userQuery = `
query getCurrentUserbySubID($a: Boolean) {
  getUsers(user: {validated: $a}) {
    _id
  }
}
`;
