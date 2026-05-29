import { existsSync } from 'fs';
import { homedir } from 'os';
import { dirname, join } from 'path';

const MAC_CURSOR_BIN = '/Applications/Cursor.app/Contents/Resources/app/bin';
const MAC_CURSOR_RG =
  '/Applications/Cursor.app/Contents/Resources/app/node_modules/@vscode/ripgrep/bin';
const LOCAL_AGENT_BIN = join(homedir(), '.local', 'bin');

export function ensureCliPathsOnPath(): void {
  ensureCursorCliOnPath();
  ensureGhCliOnPath();
}

export function ensureCursorCliOnPath(): void {
  const extra: string[] = [];

  if (process.env.CURSOR_CLI_PATH?.trim()) {
    extra.push(process.env.CURSOR_CLI_PATH.trim());
  } else {
    if (existsSync(MAC_CURSOR_RG)) {
      extra.push(MAC_CURSOR_RG);
    }
    if (existsSync(MAC_CURSOR_BIN)) {
      extra.push(MAC_CURSOR_BIN);
    }
    if (existsSync(LOCAL_AGENT_BIN)) {
      extra.push(LOCAL_AGENT_BIN);
    }
  }

  prependPathDirs(extra);
}

function ensureGhCliOnPath(): void {
  const extra: string[] = [];
  if (process.env.GH_CLI_PATH?.trim()) {
    extra.push(dirname(process.env.GH_CLI_PATH.trim()));
  } else {
    for (const dir of ['/opt/homebrew/bin', '/usr/local/bin']) {
      if (existsSync(dir)) {
        extra.push(dir);
      }
    }
  }
  prependPathDirs(extra);
}

function prependPathDirs(extra: string[]): void {
  if (!extra.length) {
    return;
  }
  const current = process.env.PATH ?? '';
  const toPrepend = extra.filter((dir) => !current.split(':').includes(dir));
  if (toPrepend.length) {
    process.env.PATH = [...toPrepend, current].join(':');
  }
}
