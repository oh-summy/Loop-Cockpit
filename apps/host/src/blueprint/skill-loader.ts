// apps/host/src/blueprint/skill-loader.ts
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getDataDir } from '../db/connection';

interface SkillManifest {
  name: string;
  version?: string;
  description?: string;
  command?: string;
  args?: string[];
  mcp?: { command: string; args?: string[]; env?: Record<string, string> };
  agent?: 'claude-code' | 'opencode' | 'codex';
}

/** Scan a single skills directory and return manifests */
function scanDir(dir: string): SkillManifest[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results: SkillManifest[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const pkgPath = path.join(dir, entry.name, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;
    try {
      const manifest = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as SkillManifest;
      results.push(manifest);
    } catch {
      // skip invalid package.json
    }
  }
  return results;
}

/**
 * Scan all skill directories for a blueprint.
 * Returns flat list of unique skill names.
 */
export function loadSkills(projectPath: string): string[] {
  const dirs = [
    path.join(os.homedir(), '.claude', 'skills'),
    path.join(projectPath, '.claude', 'skills'),
    path.join(projectPath, 'skills'),
  ];
  const seen = new Set<string>();
  for (const dir of dirs) {
    for (const skill of scanDir(dir)) {
      if (skill.name) seen.add(skill.name);
    }
  }
  return [...seen];
}

/**
 * Generate skills-bundle directory for a blueprint.
 * Creates mcp.json, agents.json, plugin.json.
 * Returns bundle path.
 */
export function generateSkillsBundle(
  blueprintId: string,
  projectPath: string,
  toolLayer: { mcpServers: { name: string; command: string }[]; subagents: { name: string; prompt: string }[] },
): string {
  const loopDir = path.join(getDataDir(), 'loops', blueprintId, 'skills-bundle');
  fs.mkdirSync(loopDir, { recursive: true });

  // mcp.json
  const mcpConfig = {
    mcpServers: toolLayer.mcpServers.map((s) => ({
      name: s.name,
      command: s.command,
    })),
  };
  fs.writeFileSync(path.join(loopDir, 'mcp.json'), JSON.stringify(mcpConfig, null, 2));

  // agents.json
  const agentsConfig = {
    agents: toolLayer.subagents.map((s) => ({
      name: s.name,
      prompt: s.prompt,
    })),
  };
  fs.writeFileSync(path.join(loopDir, 'agents.json'), JSON.stringify(agentsConfig, null, 2));

  // plugin.json
  const pluginConfig = {
    pluginDir: loopDir,
    skills: loadSkills(projectPath),
  };
  fs.writeFileSync(path.join(loopDir, 'plugin.json'), JSON.stringify(pluginConfig, null, 2));

  return loopDir;
}
