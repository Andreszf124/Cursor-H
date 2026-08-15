import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../shared/middleware/auth.middleware.js';
import {
  createClassroomHandler,
  createCourseHandler,
  createProfessorHandler,
  deleteClassroomHandler,
  deleteCourseHandler,
  deleteProfessorHandler,
  getCourseHandler,
  listClassroomsHandler,
  listCoursesHandler,
  listProfessorsHandler,
  updateClassroomHandler,
  updateCourseHandler,
  updateProfessorHandler,
} from './courses.handlers.js';

export async function coursesRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.get('/courses', listCoursesHandler);
  app.post('/courses', createCourseHandler);
  app.get('/courses/:id', getCourseHandler);
  app.patch('/courses/:id', updateCourseHandler);
  app.delete('/courses/:id', deleteCourseHandler);

  app.get('/professors', listProfessorsHandler);
  app.post('/professors', createProfessorHandler);
  app.patch('/professors/:id', updateProfessorHandler);
  app.delete('/professors/:id', deleteProfessorHandler);

  app.get('/classrooms', listClassroomsHandler);
  app.post('/classrooms', createClassroomHandler);
  app.patch('/classrooms/:id', updateClassroomHandler);
  app.delete('/classrooms/:id', deleteClassroomHandler);
}
