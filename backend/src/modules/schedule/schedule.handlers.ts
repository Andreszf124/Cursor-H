import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  createScheduleSchema,
  listSchedulesQuerySchema,
  updateScheduleSchema,
  uuidParamSchema,
} from './schedule.schemas.js';
import { scheduleService } from './schedule.service.js';

/** Identidad SIEMPRE desde request.user (JWT verificado) — nunca del body (SECURITY.md R1) */

export async function listSchedulesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { week, course_id } = listSchedulesQuerySchema.parse(request.query ?? {});

  // Con ?week= se devuelve la parrilla expandida por día; sin él, la lista cruda
  if (week) {
    const result = await scheduleService.getWeek(request.user.token, request.user.id, week);
    await reply.status(200).send(result);
    return;
  }

  const schedules = await scheduleService.listSchedules(request.user.token, request.user.id, {
    courseId: course_id,
  });
  await reply.status(200).send({ schedules });
}

export async function getUpcomingHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const upcoming = await scheduleService.getUpcoming(request.user.token, request.user.id);
  await reply.status(200).send({ upcoming });
}

export async function getScheduleHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id } = uuidParamSchema.parse(request.params);
  const schedule = await scheduleService.getSchedule(request.user.token, request.user.id, id);
  await reply.status(200).send(schedule);
}

export async function createScheduleHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const input = createScheduleSchema.parse(request.body);
  const schedule = await scheduleService.createSchedule(
    request.user.token,
    request.user.id,
    input,
  );
  await reply.status(201).send(schedule);
}

export async function updateScheduleHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id } = uuidParamSchema.parse(request.params);
  const input = updateScheduleSchema.parse(request.body);
  const schedule = await scheduleService.updateSchedule(
    request.user.token,
    request.user.id,
    id,
    input,
  );
  await reply.status(200).send(schedule);
}

export async function deleteScheduleHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { id } = uuidParamSchema.parse(request.params);
  await scheduleService.deleteSchedule(request.user.token, request.user.id, id);
  await reply.status(204).send();
}
