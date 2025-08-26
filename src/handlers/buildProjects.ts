/**
 * handlers/buildProjects.ts
 * - Tek config: config/build-config.json (configName verilirse config/build-config-<ad>.json)
 * - Git: yalnız FF pull, dirty ise atla; merge state -> abort; manuel ihtiyaçları işaretle
 * - TFS: pending varsa atla; get conflict -> undo ve manuel ihtiyaç olarak işaretle
 * - MSBuild: /clp:ErrorsOnly;Summary -> warning'leri bastır, sadece hatalar görünür
 * - LOG: yalnız hatalar + manuel müdahale gerekenler; süre bilgisi eklenir
 * - Çıktı: logs/build-<timestamp>.md (markdown)
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const execAsync = promisify(exec);

// ---------------- Types ----------------
type VcsType = 'git' | 'tfs';

interface VersionControlPath {
  path: string;
  type: VcsType;
}

interface ProjectItem {
  path: string;             // absolute .sln or .csproj
  name?: string;            // display name
  dependencies?: string[];  // optional build order hints (names)
}

interface BuildProjectsRequest {
  useConfig?: boolean;        // default true
  configName?: string;        // e.g., "prod" -> config/build-config-prod.json
  versionControlPaths?: VersionControlPath[];
  projects?: ProjectItem[];
  msbuildPath?: string;       // optional override
}

interface BuildResult {
  project: string;
  success: boolean;
  durationSec: number;
  error?: string;
}

interface VcsConflictItem {
  type: VcsType;
  path: string;
  message: string;
}

// ---------------- Utils ----------------
const isWin = process.platform === 'win32';

function stamp() {
  const d = new Date();
  const iso = new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString();
  return iso.replace(/[:.]/g, '-');
}

async function writeLogFile(markdown: string) {
  const logsDir = path.join(process.cwd(), 'logs');
  await fs.mkdir(logsDir, { recursive: true });
  const file = path.join(logsDir, `build-${stamp()}.md`);
  await fs.writeFile(file, markdown, 'utf8');
  return file;
}

async function fileExists(p: string) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function resolveMsbuildPath(userProvided?: string) {
  if (userProvided && await fileExists(userProvided)) return userProvided;
  const candidates = [
    'C:\\\\Program Files\\\\Microsoft Visual Studio\\\\2022\\\\Community\\\\MSBuild\\\\Current\\\\Bin\\\\MSBuild.exe',
    'C:\\\\Program Files\\\\Microsoft Visual Studio\\\\2022\\\\Professional\\\\MSBuild\\\\Current\\\\Bin\\\\MSBuild.exe',
    'C:\\\\Program Files\\\\Microsoft Visual Studio\\\\2022\\\\Enterprise\\\\MSBuild\\\\Current\\\\Bin\\\\MSBuild.exe',
    'C:\\\\Program Files (x86)\\\\Microsoft Visual Studio\\\\2019\\\\BuildTools\\\\MSBuild\\\\Current\\\\Bin\\\\MSBuild.exe',
  ];
  for (const p of candidates) {
    if (await fileExists(p)) return p;
  }
  return 'MSBuild.exe';
}

async function resolveTfPath() {
  if (!isWin) return 'tf';
  const candidates = [
    'C:\\\\Program Files\\\\Microsoft Visual Studio\\\\2022\\\\Community\\\\Common7\\\\IDE\\\\CommonExtensions\\\\Microsoft\\\\TeamFoundation\\\\Team Explorer\\\\TF.exe',
    'C:\\\\Program Files\\\\Microsoft Visual Studio\\\\2022\\\\Professional\\\\Common7\\\\IDE\\\\CommonExtensions\\\\Microsoft\\\\TeamFoundation\\\\Team Explorer\\\\TF.exe',
    'C:\\\\Program Files\\\\Microsoft Visual Studio\\\\2022\\\\Enterprise\\\\Common7\\\\IDE\\\\CommonExtensions\\\\Microsoft\\\\TeamFoundation\\\\Team Explorer\\\\TF.exe',
    'C:\\\\Program Files (x86)\\\\Microsoft Visual Studio\\\\2019\\\\Community\\\\Common7\\\\IDE\\\\CommonExtensions\\\\Microsoft\\\\TeamFoundation\\\\Team Explorer\\\\TF.exe',
  ];
  for (const p of candidates) {
    if (await fileExists(p)) return `"${p}"`;
  }
  return 'tf';
}

// Komut çalıştırıcı — ENOENT riskini azaltmak için shell'i açık kullan
async function run(cmd: string, cwd?: string) {
  const { stdout, stderr } = await execAsync(cmd, {
    cwd,
    maxBuffer: 20 * 1024 * 1024,
    windowsHide: true,
    shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
    encoding: 'utf8'
  });
  return (stdout || '') + (stderr || '');
}

// ---------------- Config ----------------
async function loadConfig(
  input: BuildProjectsRequest
): Promise<Required<Pick<BuildProjectsRequest, 'versionControlPaths' | 'projects'>> & { msbuildPath?: string }> {
  const useConfig = input.useConfig !== false; // default: true
  let loaded: any = {};

  if (useConfig) {
    const baseDir = path.resolve(process.cwd(), 'config');
    const file = input.configName
      ? path.join(baseDir, `build-config-${input.configName}.json`)
      : path.join(baseDir, 'build-config.json');

    if (!(await fileExists(file))) {
      throw new Error(
        input.configName
          ? `Config bulunamadı: ${file} (configName="${input.configName}")`
          : `Config bulunamadı: ${file}`
      );
    }

    const content = await fs.readFile(file, 'utf8');
    try {
      loaded = JSON.parse(content);
    } catch {
      throw new Error(`Config JSON parse hatası: ${file}`);
    }
  }

  const versionControlPaths = input.versionControlPaths ?? loaded.versionControlPaths ?? [];
  const projects = input.projects ?? loaded.projects ?? [];
  const msbuildPath = input.msbuildPath ?? loaded.msbuildPath;

  if (!projects.length) {
    throw new Error('Config içindeki `projects` boş. Argümansız kullanım için `config/build-config.json` dolu olmalı.');
  }

  return { versionControlPaths, projects, msbuildPath };
}

// ---------------- VCS (güvenli update) ----------------
async function updateGit(repoPath: string) {
  const lines: string[] = [];
  let conflict: VcsConflictItem | null = null;

  lines.push(`### 🔁 Git Update: \`${repoPath}\``);
  try {
    const status = await run('git status --porcelain', repoPath);
    if (status.trim()) {
      lines.push('- Yerel değişiklikler var → **güncelleme atlandı**.');
      return { lines, conflict };
    }
    const before = (await run('git rev-parse --short HEAD', repoPath)).trim();
    await run('git fetch --all --prune', repoPath);
    try {
      await run('git pull --ff-only', repoPath);
      const after = (await run('git rev-parse --short HEAD', repoPath)).trim();
      lines.push(`- ${before !== after ? `Güncellendi (${before} → ${after})` : 'Zaten güncel'}`);
    } catch {
      try {
        const mergeHeadPath = path.join(repoPath, '.git', 'MERGE_HEAD');
        if (await fileExists(mergeHeadPath)) await run('git merge --abort', repoPath);
      } catch {}
      lines.push('- ⚠️ FF mümkün değil veya pull çatıştı → manuel rebase/pull gerekli.');
      conflict = { type: 'git', path: repoPath, message: 'FF değil veya merge çatışması' };
    }
  } catch (e: any) {
    lines.push(`- Hata: ${e?.message || e}`);
  }
  return { lines, conflict };
}

async function updateTfs(workspacePath: string, tfPath: string) {
  const lines: string[] = [];
  let conflict: VcsConflictItem | null = null;

  lines.push(`### 🔁 TFS Get Latest: \`${workspacePath}\``);
  try {
    const stat = await run(`${tfPath} status /recursive /format:brief`, workspacePath);
    if (stat && stat.trim() && !/^There are no pending changes/i.test(stat.trim())) {
      lines.push('- Pending changes tespit edildi → **güncelleme atlandı**.');
      return { lines, conflict };
    }

    const out = await run(`${tfPath} get /recursive /noprompt`, workspacePath);
    const lowered = out.toLowerCase();
    if (lowered.includes('conflict')) {
      try { await run(`${tfPath} undo /recursive`, workspacePath); } catch {}
      lines.push('- ⚠️ Get sırasında **conflict** oluştu → otomatik **undo** yapıldı. Lütfen manuel çözün.');
      conflict = { type: 'tfs', path: workspacePath, message: 'TFS get conflict' };
    } else {
      lines.push('- Güncellendi');
    }
  } catch (e: any) {
    lines.push(`- Hata: ${e?.message || e}`);
  }
  return { lines, conflict };
}

async function updateVersionControl(versionControlPaths: VersionControlPath[]) {
  const tfPath = await resolveTfPath();
  const sections: string[] = [];
  const conflictItems: VcsConflictItem[] = [];

  for (const vc of versionControlPaths) {
    if (vc.type === 'git') {
      const { lines, conflict } = await updateGit(vc.path);
      sections.push(lines.join('\n'));
      if (conflict) conflictItems.push(conflict);
    } else if (vc.type === 'tfs') {
      const { lines, conflict } = await updateTfs(vc.path, tfPath);
      sections.push(lines.join('\n'));
      if (conflict) conflictItems.push(conflict);
    } else {
      sections.push(`### ❓ Bilinmeyen VCS tipi: ${vc.type} (${vc.path})`);
    }
  }

  return { text: sections.join('\n\n'), conflicts: conflictItems };
}

// ---------------- Build ----------------
async function buildProject(project: ProjectItem, msbuildExe: string): Promise<BuildResult> {
  const name = project.name || path.basename(project.path);
  const started = Date.now();
  try {
    // Warning'leri gizle, sadece hataları ve özeti göster
    const cmd = `"${msbuildExe}" "${project.path}" /t:Build /p:Configuration=Debug /p:Platform=AnyCPU /m /nologo /clp:ErrorsOnly;Summary /v:m`;
    await run(cmd, path.dirname(project.path));
    const took = Math.round((Date.now() - started) / 1000);
    return { project: name, success: true, durationSec: took };
  } catch (e: any) {
    const took = Math.round((Date.now() - started) / 1000);
    const message = e?.stdout || e?.stderr || e?.message || 'Derleme hatası';
    return { project: name, success: false, durationSec: took, error: message };
  }
}

function orderByDependencies(projects: ProjectItem[]) {
  const nameToProj = new Map<string, ProjectItem>();
  for (const p of projects) if (p.name) nameToProj.set(p.name, p);
  const visited = new Set<ProjectItem>();
  const stack = new Set<ProjectItem>();
  const result: ProjectItem[] = [];

  function visit(p: ProjectItem) {
    if (visited.has(p)) return;
    if (stack.has(p)) { result.push(p); visited.add(p); return; } // cycle
    stack.add(p);
    for (const d of (p.dependencies || [])) {
      const dp = nameToProj.get(d);
      if (dp) visit(dp);
    }
    stack.delete(p);
    visited.add(p);
    result.push(p);
  }

  for (const p of projects) visit(p);
  const seen = new Set<ProjectItem>();
  return result.filter(p => { if (seen.has(p)) return false; seen.add(p); return true; });
}

// ---------------- Markdown compose ----------------
function header(title: string) {
  return `# ${title}\n\n`;
}
function fenced(code: string) {
  const truncated = code.length > 4000 ? code.slice(0, 4000) + '\n... (çıktı kısaltıldı)' : code;
  return `\n<details><summary>Hata Çıktısı</summary>\n\n\`\`\`\n${truncated}\n\`\`\`\n</details>\n`;
}

// ---------------- Handler ----------------
export async function buildProjectsHandler(request: any) {
  // Asla interaktif isteme yok; argüman yoksa config'e bakar.
  const argsRaw =
    (request?.params?.arguments && (request.params.arguments[0] || request.params.arguments)) ||
    (request?.arguments) || request || {};
  const args: BuildProjectsRequest = typeof argsRaw === 'object' ? argsRaw : {};

  const md: string[] = [];
  md.push(header('🏗️ Toplu Derleme (build_all_projects)'));
  md.push(`- Başlangıç: **${new Date().toLocaleString()}**`);
  md.push(`- Çalışma dizini: \`${process.cwd()}\``);

  try {
    // Config yükle
    const { versionControlPaths, projects, msbuildPath } = await loadConfig(args);
    const msbuildExe = await resolveMsbuildPath(msbuildPath);

    // 1) VCS
    md.push('\n## 1) Version Control Güncellemesi\n');
    if (versionControlPaths.length) {
      const vcsRes = await updateVersionControl(versionControlPaths);
      md.push(vcsRes.text);
      if (vcsRes.conflicts.length) {
        md.push('\n### 🔧 Manuel Müdahale Gerekli (VCS)\n');
        for (const c of vcsRes.conflicts) {
          md.push(`- **${c.type.toUpperCase()}**: \`${c.path}\` — ${c.message}`);
        }
      }
    } else {
      md.push('- VCS yolları tanımlı değil → atlandı.');
    }

    // 2) Build
    const ordered = orderByDependencies(projects);
    md.push('\n## 2) Derleme\n');
    md.push(`Toplam proje: **${projects.length}** (sıralı: **${ordered.length}**)`);
    md.push(`\nMSBuild: \`${msbuildExe}\``);

    const results: BuildResult[] = [];
    for (const p of ordered) {
      const r = await buildProject(p, msbuildExe);
      results.push(r);
      if (r.success) {
        md.push(`- ✅ ${r.project} — Süre: ${r.durationSec}s`);
      } else {
        md.push(`- ❌ ${r.project} — Süre: ${r.durationSec}s`);
        if (r.error) md.push(fenced(r.error));
      }
    }

    // 3) Özet
    const okCount = results.filter(r => r.success).length;
    const fail = results.filter(r => !r.success);

    md.push('\n## 3) Özet\n');
    md.push(`- ✅ Başarılı: **${okCount}**`);
    md.push(`- ❌ Hatalı: **${fail.length}**`);
    if (fail.length) {
      md.push('\n### Manuel Müdahale Gerekli (Build Hataları)');
      for (const r of fail) md.push(`- ${r.project}`);
    }

    const final = md.join('\n');
    const logFile = await writeLogFile(final);
    const out = `${final}\n\n🗂️ **Log dosyası**: ${logFile}\n`;
    return { content: [{ type: 'text', text: out }] };
  } catch (e: any) {
    const errorText = `❌ **Çalıştırma Hatası**\n\n- ${e?.message || e}\n`;
    const finalOut = md.concat('\n', errorText).join('\n');
    try { const f = await writeLogFile(finalOut); md.push(`\n🗂️ **Log dosyası**: ${f}`); } catch {}
    return { content: [{ type: 'text', text: finalOut }] };
  }
}

export default buildProjectsHandler;
