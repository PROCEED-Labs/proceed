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
  externalQualitficationNeeded: boolean;
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
    externalQualitficationNeeded: boolean;
    renewalTimeInterval: number | null;
  };
};
