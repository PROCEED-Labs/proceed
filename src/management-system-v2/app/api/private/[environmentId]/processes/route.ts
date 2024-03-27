import { NextResponse } from 'next/server';
import processes from './temp.json';

export type Processes = typeof processes;

export async function GET() {
  return NextResponse.json(processes);
}

export const revalidate = 60;
