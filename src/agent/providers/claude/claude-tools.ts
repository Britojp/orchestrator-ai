import Anthropic from '@anthropic-ai/sdk';
import { Logger } from '@nestjs/common';
import { execa } from 'execa';
import * as fs from 'fs/promises';
import * as path from 'path';

export const CLAUDE_TOOLS: Anthropic.Tool[] = [
  {
    name: 'read_file',
    description: 'Read the contents of a file in the repository.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'File path relative to repository root' },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Write or overwrite a file in the repository. Creates parent directories if needed.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'File path relative to repository root' },
        content: { type: 'string', description: 'Full file content' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'list_directory',
    description: 'List files and directories at a given path.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'Directory path relative to repository root (defaults to root if omitted)',
        },
      },
    },
  },
  {
    name: 'run_bash',
    description:
      'Run a bash command in the repository root directory (cwd=REPO_PATH). Use for git status, tests, lint, etc. Output is truncated at 10000 chars.',
    input_schema: {
      type: 'object' as const,
      properties: {
        command: { type: 'string', description: 'Bash command to execute' },
      },
      required: ['command'],
    },
  },
];

function resolveSafePath(repoPath: string, relPath: string): string {
  const resolved = path.resolve(repoPath, relPath);
  if (!resolved.startsWith(path.resolve(repoPath) + path.sep) && resolved !== path.resolve(repoPath)) {
    throw new Error(`Path traversal not allowed: ${relPath}`);
  }
  return resolved;
}

const READ_FILE_LIMIT = 15_000;

async function readFile(repoPath: string, relPath: string): Promise<string> {
  const fullPath = resolveSafePath(repoPath, relPath);
  const content = await fs.readFile(fullPath, 'utf-8');
  if (content.length > READ_FILE_LIMIT) {
    return (
      content.slice(0, READ_FILE_LIMIT) +
      `\n[...truncated — file has ${content.length} chars total. Read a smaller range or use run_bash with sed/grep.]`
    );
  }
  return content;
}

async function writeFile(repoPath: string, relPath: string, content: string): Promise<string> {
  const fullPath = resolveSafePath(repoPath, relPath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, 'utf-8');
  return `Written: ${relPath}`;
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.next', 'build', 'coverage', '__pycache__', '.venv']);

async function listDirectory(repoPath: string, relPath = '.'): Promise<string> {
  const fullPath = resolveSafePath(repoPath, relPath);
  const entries = await fs.readdir(fullPath, { withFileTypes: true });
  const filtered = entries.filter((e) => !SKIP_DIRS.has(e.name));
  const lines = filtered.slice(0, 200).map((e) => `${e.isDirectory() ? 'd' : 'f'} ${e.name}`);
  if (filtered.length > 200) lines.push(`[...${filtered.length - 200} more entries omitted]`);
  return lines.join('\n');
}

async function runBash(repoPath: string, command: string, logger: Logger): Promise<string> {
  logger.log(`run_bash: ${command.slice(0, 200)}`);
  try {
    const { stdout, stderr } = await execa('bash', ['-c', command], {
      cwd: repoPath,
      timeout: 120_000,
      reject: false,
    });
    const output = [stdout, stderr].filter(Boolean).join('\n');
    if (output.length > 8_000) {
      // Keep head + tail: critical for test output where failures appear at the end
      return (
        output.slice(0, 3_500) +
        '\n[...truncated...]\n' +
        output.slice(-3_500)
      );
    }
    return output || '(no output)';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error: ${message}`;
  }
}

export async function executeToolCall(
  name: string,
  input: Record<string, string>,
  repoPath: string,
  logger: Logger,
): Promise<string> {
  try {
    switch (name) {
      case 'read_file':
        return await readFile(repoPath, input.path);
      case 'write_file':
        return await writeFile(repoPath, input.path, input.content);
      case 'list_directory':
        return await listDirectory(repoPath, input.path);
      case 'run_bash':
        return await runBash(repoPath, input.command, logger);
      default:
        return `Unknown tool: ${name}`;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Tool error: ${message}`;
  }
}
