import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import process from "node:process";

const commands = [
  ["CareConnect API", "node_modules/next/dist/bin/next", ["dev", "-p", "3001"]],
  ["CareConnect Vite UI", "node_modules/vite/bin/vite.js", ["--host", "127.0.0.1", "--port", "5173", "--strictPort"]],
];

for (const [, executable] of commands) {
  if (!existsSync(executable)) {
    console.error(`Missing ${executable}. Run npm install first.`);
    process.exit(1);
  }
}

const children = commands.map(([name, executable, args]) => {
  console.log(`Starting ${name}…`);
  const child = spawn(process.execPath, [executable, ...args], { stdio: "inherit" });
  child.on("error", (error) => {
    console.error(`${name} failed to start:`, error);
    shutdown(1);
  });
  child.on("exit", (code) => {
    if (!stopping) shutdown(code ?? 1);
  });
  return child;
});

let stopping = false;
function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null) child.kill();
  }
  process.exitCode = code;
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
