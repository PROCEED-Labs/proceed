import db from '@/lib/data/db';
import { z } from 'zod';

const pairingCodeSchema = z.object({
  userId: z.string(),
  codeHash: z.string(),
  expires: z.date(),
  environmentId: z.string(),
});
type PairingCode = z.infer<typeof pairingCodeSchema>;

export async function addPairingCode(codeInput: PairingCode) {
  const code = pairingCodeSchema.parse(codeInput);

  await db.mcpPairingCode.create({ data: code });
}

export async function getPairingCodeInfo(codeHash: string) {
  const info = await db.mcpPairingCode.findUnique({
    where: { codeHash },
    omit: { codeHash: true },
  });

  return info;
}

export async function revokePairingCodes(userId: string, environmentId?: string) {
  await db.mcpPairingCode.deleteMany({
    where: { userId, environmentId },
  });
}
