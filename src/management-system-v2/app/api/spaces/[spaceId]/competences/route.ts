import { NextRequest, NextResponse } from 'next/server';
import { getAllSpaceCompetences, getAllCompetencesOfUser } from '@/lib/data/db/competence';
import { getCurrentUser } from '@/components/auth';
import { getMSConfig } from '@/lib/ms-config/ms-config';

export async function GET(request: NextRequest, { params }: { params: { spaceId: string } }) {
  try {
    const msConfig = await getMSConfig();
    
    // Check if competence matching is enabled
    if (!msConfig.PROCEED_PUBLIC_COMPETENCE_MATCHING_ACTIVE) {
      return NextResponse.json({ error: 'Competence matching is not enabled' }, { status: 404 });
    }

    const { userId } = await getCurrentUser();

    // Get all space competences
    const spaceCompetences = await getAllSpaceCompetences(params.spaceId);

    // Get user's claimed competences
    const userCompetences = await getAllCompetencesOfUser(userId);

    // Mark which competences are already claimed
    const competencesWithClaimStatus = spaceCompetences.map((comp) => ({
      ...comp,
      isClaimed: userCompetences.some((uc) => uc.competenceId === comp.id),
    }));

    return NextResponse.json(competencesWithClaimStatus);
  } catch (error) {
    console.error('Failed to fetch space competences:', error);
    return NextResponse.json({ error: 'Failed to fetch competences' }, { status: 500 });
  }
}
