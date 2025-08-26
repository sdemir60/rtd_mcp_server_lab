/**
 * handlers/buildProjects.ts
 * Güvenli, log’lu ve varsayılan config’li "build_all_projects" handler’ı
 * - Varsayılan config: config/build-config.json
 * - Optional configName: config/build-config-<name>.json
 * - Git: yalnız fast-forward pull, dirty ise atla, merge state => abort
 * - TFS: pending varsa atla, get sırasında conflict olursa undo (rollback)
 * - Derleme: MSBuild ile /m /v:m; süre ve özet log
 * - Çıktı: Konsol + logs/build-<timestamp>.md (markdown)
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
  path: string;             // absolute .sln or .csproj path
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
  warnings?: string[];
  error?: string;
}

// ---------------- Utils ----------------
const isWin = process.platform === 'win32';

function stamp() {
  const d = new Date();
  const iso = new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString(); // local-ish
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
  // Son çare: PATH'te MSBuild varsayalım
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

// küçük helper: komutu çalıştır, shell’i açık kullan (spawn ENOENT riskini azaltır)
async function run(cmd: string, cwd?: string) {
  const { stdout, stderr } = await execAsync(cmd, {
    cwd,
    maxBuffer: 20 * 1024 * 1024,
    windowsHide: true,
    shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh', // <-- string olmalı
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
    // YALNIZCA tek bir dosya: configName varsa build-config-<ad>.json; yoksa build-config.json
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
    throw new Error(
      'Config içindeki `projects` boş. Argümansız çalışmak için `config/build-config.json` (veya seçtiğin config) içinde `projects` dolu olmalı.'
    );
  }

  return { versionControlPaths, projects, msbuildPath };
}


// ---------------- VCS: güvenli güncelleme ----------------
async function updateGit(repoPath: string) {
  const lines: string[] = [];
  lines.push(`### 🔁 Git Update: \`${repoPath}\``);
  try {
    const status = await run('git status --porcelain', repoPath);
    if (status.trim()) {
      lines.push('- Yerel değişiklikler var → **güncelleme atlandı**.');
      return { lines, conflict: false };
    }
    const before = (await run('git rev-parse --short HEAD', repoPath)).trim();
    await run('git fetch --all --prune', repoPath);
    try {
      await run('git pull --ff-only', repoPath);
      const after = (await run('git rev-parse --short HEAD', repoPath)).trim();
      const changed = before !== after ? `Güncellendi (${before} → ${after})` : 'Zaten güncel';
      lines.push(`- ${changed}`);
    } catch {
      // FF mümkün değil → pull yok. Olası merge state'i abort etmeyi deneyelim.
      try {
        const mergeHeadPath = path.join(repoPath, '.git', 'MERGE_HEAD');
        if (await fileExists(mergeHeadPath)) await run('git merge --abort', repoPath);
      } catch {}
      lines.push('- ⚠️ Fast-forward **mümkün değil** veya pull çatıştı → **manuel rebase/pull** gerekli.');
      return { lines, conflict: true };
    }
  } catch (e: any) {
    lines.push(`- Hata: ${e?.message || e}`);
  }
  return { lines, conflict: false };
}

async function updateTfs(workspacePath: string, tfPath: string) {
  const lines: string[] = [];
  lines.push(`### 🔁 TFS Get Latest: \`${workspacePath}\``);
  try {
    // Pending changes kontrolü
    const stat = await run(`${tfPath} status /recursive /format:brief`, workspacePath);
    if (stat && stat.trim() && !/^There are no pending changes/i.test(stat.trim())) {
      lines.push('- Pending changes tespit edildi → **güncelleme atlandı**.');
      return { lines, conflict: false };
    }

    const out = await run(`${tfPath} get /recursive /noprompt`, workspacePath);
    const lowered = out.toLowerCase();
    if (lowered.includes('conflict')) {
      try { await run(`${tfPath} undo /recursive`, workspacePath); } catch {}
      lines.push('- ⚠️ Get sırasında **conflict** oluştu → otomatik **undo** yapıldı. Lütfen manuel çözün.');
      return { lines, conflict: true };
    }
    lines.push('- Güncellendi');
  } catch (e: any) {
    lines.push(`- Hata: ${e?.message || e}`);
  }
  return { lines, conflict: false };
}

async function updateVersionControl(versionControlPaths: VersionControlPath[]) {
  const tfPath = await resolveTfPath();
  const sections: string[] = [];
  let hasAnyConflict = false;

  for (const vc of versionControlPaths) {
    if (vc.type === 'git') {
      const { lines, conflict } = await updateGit(vc.path);
      sections.push(lines.join('\n'));
      hasAnyConflict ||= conflict;
    } else if (vc.type === 'tfs') {
      const { lines, conflict } = await updateTfs(vc.path, tfPath);
      sections.push(lines.join('\n'));
      hasAnyConflict ||= conflict;
    } else {
      sections.push(`### ❓ Bilinmeyen VCS tipi: ${vc.type} (${vc.path})`);
    }
  }

  return { text: sections.join('\n\n'), hasConflict: hasAnyConflict };
}

// ---------------- Build ----------------
async function buildProject(project: ProjectItem, msbuildExe: string): Promise<BuildResult> {
  const name = project.name || path.basename(project.path);
  const started = Date.now();
  let output = '';
  try {
    const cmd = `"${msbuildExe}" "${project.path}" /t:Build /p:Configuration=Debug /p:Platform=AnyCPU /m /v:m /nologo`;
    output = await run(cmd, path.dirname(project.path));
    // Başarı sezgisi: "Build succeeded" veya "0 Error(s)"
    const ok = /Build succeeded/i.test(output) || /\b0\s+Error\(s\)/i.test(output);
    const warnMatch = output.match(/(\d+)\s+Warning\(s\)/i);
    const took = Math.round((Date.now() - started) / 1000);
    return {
      project: name,
      success: ok,
      warnings: [
        ...(warnMatch && parseInt(warnMatch[1]) > 0 ? [`${warnMatch[1]} warning`] : []),
        `Süre: ${took}s`
      ],
      error: ok ? undefined : output
    };
  } catch (e: any) {
    const took = Math.round((Date.now() - started) / 1000);
    return {
      project: name,
      success: false,
      warnings: [`Süre: ${took}s`],
      error: e?.code === 'ETIMEDOUT' ? 'Derleme timeout (varsayılan ~5 dk)' : (e?.message || 'Derleme hatası')
    };
  }
}

function orderByDependencies(projects: ProjectItem[]) {
  // Basit topo-sort; name olmayanları olduğu gibi bırakır
  const nameToProj = new Map<string, ProjectItem>();
  for (const p of projects) if (p.name) nameToProj.set(p.name, p);
  const visited = new Set<ProjectItem>();
  const stack = new Set<ProjectItem>();
  const result: ProjectItem[] = [];

  function visit(p: ProjectItem) {
    if (visited.has(p)) return;
    if (stack.has(p)) { // cycle
      result.push(p); visited.add(p); return;
    }
    stack.add(p);
    const deps = p.dependencies || [];
    for (const d of deps) {
      const dp = nameToProj.get(d);
      if (dp) visit(dp);
    }
    stack.delete(p);
    visited.add(p);
    result.push(p);
  }

  for (const p of projects) visit(p);
  // unique preserve order
  const seen = new Set<ProjectItem>();
  return result.filter(p => { if (seen.has(p)) return false; seen.add(p); return true; });
}

// ---------------- Markdown compose ----------------
function header(title: string) {
  return `# ${title}\n\n`;
}

function fenced(code: string) {
  const truncated = code.length > 4000 ? code.slice(0, 4000) + '\n... (çıktı kısaltıldı)' : code;
  return `\n<details><summary>Çıktı</summary>\n\n\`\`\`\n${truncated}\n\`\`\`\n</details>\n`;
}

// ---------------- Handler ----------------
export async function buildProjectsHandler(request: any) {
  // Argümanlar verilmediyse config'ten oku. Kullanıcıdan **asla** bilgi isteme.
  const argsRaw =
    (request?.params?.arguments && (request.params.arguments[0] || request.params.arguments)) ||
    (request?.arguments) ||
    request ||
    {};
  const args: BuildProjectsRequest = typeof argsRaw === 'object' ? argsRaw : {};

  let md: string[] = [];
  md.push(header('🏗️ Toplu Derleme (build_all_projects)'));
  md.push(`- Başlangıç: **${new Date().toLocaleString()}**`);
  md.push(`- Çalışma dizini: \`${process.cwd()}\``);

  try {
    // Config yükle
    const { versionControlPaths, projects, msbuildPath } = await loadConfig(args);
    const msbuildExe = await resolveMsbuildPath(msbuildPath);

    md.push('\n## 1) Version Control Güncellemesi\n');
    if (versionControlPaths.length) {
      const vcsRes = await updateVersionControl(versionControlPaths);
      md.push(vcsRes.text);
      if (vcsRes.hasConflict) {
        md.push('\n> ⚠️ Bazı depolarda otomatik çözülemeyen durumlar var. Derleme devam ediyor; ilgili depo(lar) için manuel işlem gerekebilir.');
      }
    } else {
      md.push('- VCS yolları tanımlı değil → bu adım atlandı.');
    }

    // Build order
    const ordered = orderByDependencies(projects);

    md.push('\n## 2) Derleme\n');
    md.push(`Toplam proje: **${projects.length}** (sıralı: **${ordered.length}**)`);
    md.push(`\nMSBuild: \`${msbuildExe}\``);

    const results: BuildResult[] = [];
    for (const p of ordered) {
      md.push(`\n### 🔨 ${p.name || path.basename(p.path)}\n`);
      const r = await buildProject(p, msbuildExe);
      results.push(r);
      if (r.success) {
        md.push(`- ✅ Başarılı ${r.warnings?.length ? `(${r.warnings?.join(', ')})` : ''}`);
      } else {
        md.push(`- ❌ Hata`);
        if (r.error) md.push(fenced(r.error));
      }
    }

    // Özet
    const okCount = results.filter(r => r.success).length;
    const failCount = results.length - okCount;

    md.push('\n## 3) Özet\n');
    md.push(`- ✅ Başarılı: **${okCount}**`);
    md.push(`- ❌ Hatalı: **${failCount}**`);
    if (failCount > 0) {
      md.push('\n### Hatalı Projeler');
      for (const r of results.filter(r => !r.success)) {
        md.push(`- ${r.project}`);
      }
    }

    const allText = md.join('\n');
    const logFile = await writeLogFile(allText);
    const finalOut = `${allText}\n\n🗂️ **Log dosyası**: ${logFile}\n`;

    return { content: [{ type: 'text', text: finalOut }] };
  } catch (e: any) {
    const errorText = `❌ **Çalıştırma Hatası**\n\n- ${e?.message || e}\n`;
    const finalOut = md.concat('\n', errorText).join('\n');
    try { const f = await writeLogFile(finalOut); md.push(`\n🗂️ **Log dosyası**: ${f}`); } catch {}
    return { content: [{ type: 'text', text: finalOut }] };
  }
}

export default buildProjectsHandler;
