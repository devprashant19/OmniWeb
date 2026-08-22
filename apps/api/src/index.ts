import Fastify from 'fastify';
import cors from '@fastify/cors';
import { initSocket } from './socket.js';
import routes from './routes.js';
import 'dotenv/config';

const fastify = Fastify({ logger: true });

async function start() {
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN ?? '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  await fastify.register(routes, { prefix: '/api' });

  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    initSocket(fastify.server);
    console.log('API Server running on port 3001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
