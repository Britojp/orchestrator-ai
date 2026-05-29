require('dotenv').config();
const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const QUEUE_NAME = 'task-execution';

async function forceUnlockJob(connection, jobId) {
  const prefix = `bull:${QUEUE_NAME}`;
  await connection.del(`${prefix}:${jobId}:lock`);
  await connection.lrem(`${prefix}:active`, 0, jobId);
}

async function main() {
  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  const queue = new Queue(QUEUE_NAME, { connection: { url: redisUrl } });
  const active = await queue.getJobs(['active']);

  if (!active.length) {
    console.log('Nenhum job ativo na fila.');
    await queue.close();
    connection.disconnect();
    return;
  }

  console.log(
    'Pare o orquestrador (Ctrl+C) antes de liberar, se o comando falhar por lock.',
  );

  for (const job of active) {
    const taskId = job.data?.taskId ?? job.id;
    try {
      if (job.token) {
        await job.moveToFailed(
          new Error('Liberado manualmente via npm run queue:unstuck'),
          job.token,
        );
      } else {
        await job.remove();
      }
      console.log(`Job liberado: ${taskId}`);
    } catch {
      await forceUnlockJob(connection, String(job.id));
      await job.remove();
      console.log(`Job liberado (forçado via Redis): ${taskId}`);
    }
  }

  console.log('');
  console.log('No Supabase, libere tarefas presas em in_progress:');
  console.log(
    "UPDATE tasks SET status = 'pending', claimed_by = null, claimed_at = null WHERE status = 'in_progress';",
  );

  await queue.close();
  connection.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
