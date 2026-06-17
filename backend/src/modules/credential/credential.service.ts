import { AppError } from "../../lib/AppError.js";
import { recordAudit } from "../../lib/audit.js";
import { decryptSecret, encryptSecret } from "../../lib/crypto.js";
import { prisma } from "../../lib/prisma.js";

interface CreateCredentialInput {
  equipmentId: string;
  label: string;
  username?: string;
  secret: string;
}

export const credentialService = {
  // Lista as credenciais de um equipamento SEM os campos do segredo.
  // O segredo só sai pelo endpoint de "revelar".
  async listByEquipment(equipmentId: string) {
    return prisma.deviceCredential.findMany({
      where: { equipmentId },
      orderBy: { createdAt: "desc" },
      select: { id: true, label: true, username: true, createdAt: true },
    });
  },

  // Cria uma credencial cifrando o segredo antes de salvar.
  async create(
    { equipmentId, label, username, secret }: CreateCredentialInput,
    performedById: string
  ) {
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
    });
    if (!equipment) {
      throw new AppError("Equipamento não encontrado", 404);
    }

    const { secretEncrypted, iv, authTag } = encryptSecret(secret);
    const credential = await prisma.deviceCredential.create({
      data: { equipmentId, label, username, secretEncrypted, iv, authTag },
      select: { id: true, label: true, username: true, createdAt: true },
    });

    await recordAudit({
      action: "CREDENTIAL_CREATED",
      entity: "DeviceCredential",
      entityId: credential.id,
      equipmentId,
      performedById,
      metadata: { equipmentId, label },
    });
    return credential;
  },

  // Revela (decifra) o segredo. CADA revelação é auditada — é o ponto de
  // compliance: fica registrado quem viu qual senha e quando.
  async reveal(id: string, performedById: string) {
    const credential = await prisma.deviceCredential.findUnique({
      where: { id },
    });
    if (!credential) {
      throw new AppError("Credencial não encontrada", 404);
    }

    const secret = decryptSecret({
      secretEncrypted: credential.secretEncrypted,
      iv: credential.iv,
      authTag: credential.authTag,
    });

    await recordAudit({
      action: "CREDENTIAL_REVEALED",
      entity: "DeviceCredential",
      entityId: id,
      equipmentId: credential.equipmentId,
      performedById,
      metadata: { equipmentId: credential.equipmentId, label: credential.label },
    });

    return { id: credential.id, label: credential.label, secret };
  },

  // Remove uma credencial.
  async remove(id: string, performedById: string) {
    const credential = await prisma.deviceCredential.findUnique({
      where: { id },
    });
    if (!credential) {
      throw new AppError("Credencial não encontrada", 404);
    }
    await prisma.deviceCredential.delete({ where: { id } });
    await recordAudit({
      action: "CREDENTIAL_DELETED",
      entity: "DeviceCredential",
      entityId: id,
      equipmentId: credential.equipmentId,
      performedById,
    });
  },
};
