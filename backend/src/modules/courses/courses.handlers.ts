import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  createClassroomSchema,
  createCourseSchema,
  createProfessorSchema,
  listCoursesQuerySchema,
  updateClassroomSchema,
  updateCourseSchema,
  updateProfessorSchema,
  uuidParamSchema,
} from './courses.schemas.js';
import { coursesService } from './courses.service.js';

/** Identidad SIEMPRE desde request.user (JWT verificado) — nunca del body (SECURITY.md R1) */

export async function listCoursesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { academic_period_id } = listCoursesQuerySchema.parse(request.query ?? {});
  const courses = await coursesService.listCourses(
    request.user.token,
    request.user.id,
    academic_period_id,
  );
  await reply.status(200).send({ courses });
}

export async function getCourseHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id } = uuidParamSchema.parse(request.params);
  const course = await coursesService.getCourse(request.user.token, request.user.id, id);
  await reply.status(200).send(course);
}

export async function createCourseHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const input = createCourseSchema.parse(request.body);
  const course = await coursesService.createCourse(request.user.token, request.user.id, input);
  await reply.status(201).send(course);
}

export async function updateCourseHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id } = uuidParamSchema.parse(request.params);
  const input = updateCourseSchema.parse(request.body);
  const course = await coursesService.updateCourse(
    request.user.token,
    request.user.id,
    id,
    input,
  );
  await reply.status(200).send(course);
}

export async function deleteCourseHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id } = uuidParamSchema.parse(request.params);
  await coursesService.deleteCourse(request.user.token, request.user.id, id);
  await reply.status(204).send();
}

export async function listProfessorsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const professors = await coursesService.listProfessors(request.user.token, request.user.id);
  await reply.status(200).send({ professors });
}

export async function createProfessorHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const input = createProfessorSchema.parse(request.body);
  const professor = await coursesService.createProfessor(
    request.user.token,
    request.user.id,
    input,
  );
  await reply.status(201).send(professor);
}

export async function updateProfessorHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id } = uuidParamSchema.parse(request.params);
  const input = updateProfessorSchema.parse(request.body);
  const professor = await coursesService.updateProfessor(
    request.user.token,
    request.user.id,
    id,
    input,
  );
  await reply.status(200).send(professor);
}

export async function deleteProfessorHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id } = uuidParamSchema.parse(request.params);
  await coursesService.deleteProfessor(request.user.token, request.user.id, id);
  await reply.status(204).send();
}

export async function listClassroomsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const classrooms = await coursesService.listClassrooms(request.user.token, request.user.id);
  await reply.status(200).send({ classrooms });
}

export async function createClassroomHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const input = createClassroomSchema.parse(request.body);
  const classroom = await coursesService.createClassroom(
    request.user.token,
    request.user.id,
    input,
  );
  await reply.status(201).send(classroom);
}

export async function updateClassroomHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id } = uuidParamSchema.parse(request.params);
  const input = updateClassroomSchema.parse(request.body);
  const classroom = await coursesService.updateClassroom(
    request.user.token,
    request.user.id,
    id,
    input,
  );
  await reply.status(200).send(classroom);
}

export async function deleteClassroomHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id } = uuidParamSchema.parse(request.params);
  await coursesService.deleteClassroom(request.user.token, request.user.id, id);
  await reply.status(204).send();
}
