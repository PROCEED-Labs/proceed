import { z } from 'zod';

export const CompetenceTypes = z.enum(['USER', 'SPACE']);
export type CompetenceType = z.infer<typeof CompetenceTypes>;

export type SpaceCompetence = {
  type: CompetenceType;
  name: string;
  id: string;
  description: string;
  spaceId: string | null;
  creatorUserId: string | null;
  externalQualificationNeeded: boolean;
  renewalTimeInterval: number | null;
  claimedBy: {
    userId: string;
    competenceId: string;
    proficiency: string | null;
    qualificationDate: Date | null;
    lastUsage: Date | null;
  }[];
};

export type UserCompetence = {
  userId: string;
  competenceId: string;
  proficiency: string | null;
  qualificationDate: Date | null;
  lastUsage: Date | null;
  competence: {
    type: CompetenceType;
    name: string;
    id: string;
    description: string;
    spaceId: string | null;
    creatorUserId: string | null;
    externalQualificationNeeded: boolean;
    renewalTimeInterval: number | null;
  };
};

export type User = {
  userId: string;
  competenceId: string;
  proficiency: string | null | undefined;
  qualificationDate: Date | null | undefined;
  lastUsage: Date | null | undefined;
};

export type Competence = {
  type: CompetenceType;
  name: string;
  id: string;
  description: string;
  spaceId: string | null | undefined;
  creatorUserId: string | null | undefined;
  externalQualificationNeeded: boolean | undefined;
  renewalTimeInterval: number | null | undefined;
};
