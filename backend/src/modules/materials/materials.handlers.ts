import type { FastifyReply, FastifyRequest } from 'fastify';
import { ValidationError } from '../../shared/errors/app-error.js';
import { recordAudit } from '../../shared/utils/audit.js';
import {
  listMaterialsSchema,
  searchMaterialsSchema,
  updateMaterialSchema,
  uploadMaterialSchema,
  uuidParamSchema,
} from './materials.schemas.js';
import { materialsService } from './materials.service.js';

export async function uploadMaterialHandler(req: FastifyRequest, reply: FastifyReply) {
  let buffer: Buffer | undefined;
  let filename = 'material';
  const fields: Record<string, string> = {};

  // Recorrer todas las partes: el navegador suele mandar el archivo antes que course_id.
  for await (const part of req.parts()) {
    if (part.type === 'file') {
      if (buffer === undefined) {
        filename = part.filename || 'material';
        buffer = await part.toBuffer();
      } else {
        await part.toBuffer();
      }
    } else {
      const value = String(part.value ?? '').trim();
      if (value) fields[part.fieldname] = value;
    }
  }

  if (!buffer) throw new ValidationError('Se requiere un archivo');

  const meta = uploadMaterialSchema.parse({
    title: fields.title,
    course_id: fields.course_id,
    category: fields.category ?? 'other',
  });

  const material = await materialsService.upload(
    req.user.token,
    req.user.id,
    buffer,
    filename,
    meta,
  );
  await recordAudit({
    studentId: req.user.id,
    action: 'material.upload',
    entityType: 'material',
    entityId: material.id as string,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  await reply.status(201).send(material);
}

export async function listMaterialsHandler(req: FastifyRequest, reply: FastifyReply) {
  const params = listMaterialsSchema.parse(req.query ?? {});
  const materials = await materialsService.list(req.user.token, req.user.id, params);
  await reply.status(200).send({ materials });
}

export async function searchMaterialsHandler(req: FastifyRequest, reply: FastifyReply) {
  const params = searchMaterialsSchema.parse(req.query ?? {});
  const materials = await materialsService.search(req.user.token, req.user.id, params);
  await reply.status(200).send({ materials });
}

export async function getMaterialHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = uuidParamSchema.parse(req.params);
  const material = await materialsService.get(req.user.token, req.user.id, id);
  await reply.status(200).send(material);
}

export async function materialUrlHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = uuidParamSchema.parse(req.params);
  const result = await materialsService.signedUrl(req.user.token, req.user.id, id);
  await reply.status(200).send(result);
}

export async function updateMaterialHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = uuidParamSchema.parse(req.params);
  const input = updateMaterialSchema.parse(req.body);
  const material = await materialsService.update(req.user.token, req.user.id, id, input);
  await reply.status(200).send(material);
}

export async function deleteMaterialHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = uuidParamSchema.parse(req.params);
  await materialsService.remove(req.user.token, req.user.id, id);
  await recordAudit({
    studentId: req.user.id,
    action: 'material.delete',
    entityType: 'material',
    entityId: id,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  await reply.status(204).send();
}
