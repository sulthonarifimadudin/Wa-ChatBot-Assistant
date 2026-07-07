import type { FastifyInstance } from 'fastify';

/**
 * Health check route.
 * Used by Docker health checks and monitoring tools.
 */
export async function healthRoute(app: FastifyInstance): Promise<void> {
  app.get('/health', async (_request, reply) => {
    return reply.status(200).send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
    });
  });

  app.get('/', async (_request, reply) => {
    return reply.status(200).send({
      name: 'WA AI Assistant',
      version: '1.0.0',
      description: 'AI Personal Assistant for WhatsApp',
      health: '/health',
    });
  });
}
