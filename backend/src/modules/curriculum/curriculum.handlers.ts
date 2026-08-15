import type { FastifyReply, FastifyRequest } from 'fastify';
import { ValidationError } from '../../shared/errors/app-error.js';
import {
  importCurriculumSchema,
  listSubjectsQuerySchema,
  updateImportSchema,
  uuidParamSchema,
} from './curriculum.schemas.js';
import { curriculumService } from './curriculum.service.js';

/** Identidad SIEMPRE desde request.user (JWT verificado) — nunca del body (SECURITY.md R1) */

export async function importCurriculumHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  let buffer: Buffer | undefined;
  let careerId: unknown;

  // Se recorren las partes para aceptar el campo career_id antes o después del archivo
  for await (const part of request.parts()) {
    if (part.type === 'file') {
      if (part.fieldname === 'file' && buffer === undefined) {
        buffer = await part.toBuffer();
      } else {
        await part.toBuffer(); // drenar partes inesperadas
      }
    } else if (part.fieldname === 'career_id') {
      careerId = part.value;
    }
  }

  if (!buffer) {
    throw new ValidationError('Se requiere un archivo PDF en el campo "file"');
  }

  const input = importCurriculumSchema.parse({ career_id: careerId });
  const result = await curriculumService.importCurriculum(
    request.user.token,
    request.user.id,
    input.career_id,
    buffer,
  );
  await reply.status(201).send(result);
}

export async function listImportsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const imports = await curriculumService.listImports(request.user.token, request.user.id);
  await reply.status(200).send({ imports });
}

export async function getImportHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id } = uuidParamSchema.parse(request.params);
  const result = await curriculumService.getImport(request.user.token, request.user.id, id);
  await reply.status(200).send(result);
}

export async function updateImportHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id } = uuidParamSchema.parse(request.params);
  const input = updateImportSchema.parse(request.body);
  const result = await curriculumService.updateImport(
    request.user.token,
    request.user.id,
    id,
    input,
  );
  await reply.status(200).send(result);
}

export async function confirmImportHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id } = uuidParamSchema.parse(request.params);
  const result = await curriculumService.confirmImport(request.user.token, request.user.id, id);
  await reply.status(201).send(result);
}

export async function getInconsistenciesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id } = uuidParamSchema.parse(request.params);
  const inconsistencies = await curriculumService.getInconsistencies(
    request.user.token,
    request.user.id,
    id,
  );
  await reply.status(200).send({ inconsistencies });
}

export async function listSubjectsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { career_id } = listSubjectsQuerySchema.parse(request.query ?? {});
  const subjects = await curriculumService.listSubjects(
    request.user.token,
    request.user.id,
    career_id,
  );
  await reply.status(200).send({ subjects });
}

export async function getPrerequisitesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id } = uuidParamSchema.parse(request.params);
  const prerequisites = await curriculumService.getPrerequisites(
    request.user.token,
    request.user.id,
    id,
  );
  await reply.status(200).send({ prerequisites });
}
