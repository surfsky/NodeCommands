const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawn, execFile } = require('child_process');
const express = require('express');

// App/bootstrap constants.
const app = express();
const PORT = process.env.PORT || 5600;
const ROOT_DIR = path.resolve(__dirname, '..');
const WEB_ROOT = path.join(ROOT_DIR, 'wwwroot');

// Tool script paths. Keep centralized so future modules are easy to add.
const SCRIPTS = {
  listfiles: path.join(ROOT_DIR, 'listfiles.js'),
  topdf: path.join(ROOT_DIR, 'toPdf.js'),
  search: path.join(ROOT_DIR, 'search.js'),
  mergetopdf: path.join(ROOT_DIR, 'mergeToPdf.js')
};

app.use(express.json({ limit: '1mb' }));
app.use(express.static(WEB_ROOT));

function sanitizeStringArray(input) {
  if (!Array.isArray(input)) return [];
  return input
    .filter((v) => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean);
}

function normalizePathInput(inputPath) {
  if (typeof inputPath !== 'string') return '';

  let p = inputPath.trim();
  if (!p) return '';

  // Remove wrapping quotes if user pasted with quotes.
  p = p.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');

  // Expand home shortcut.
  if (p.startsWith('~/')) {
    p = path.join(os.homedir(), p.slice(2));
  }

  return path.normalize(p);
}

function resolveInputPath(inputPath) {
  const normalized = normalizePathInput(inputPath);
  if (!normalized) return '';

  if (path.isAbsolute(normalized)) {
    return normalized;
  }

  return path.resolve(ROOT_DIR, normalized);
}

function resolveInputPaths(inputPaths) {
  return sanitizeStringArray(inputPaths)
    .map((p) => resolveInputPath(p))
    .filter(Boolean);
}

function runAppleScript(script, callback) {
  execFile('osascript', ['-e', script], (error, stdout, stderr) => {
    if (error) {
      const message = (stderr || error.message || '').trim();
      if (message.toLowerCase().includes('user canceled') || message.includes('-128')) {
        return callback(null, { ok: false, canceled: true });
      }
      return callback(new Error(message || '选择失败'));
    }

    const text = (stdout || '').trim();
    if (!text) {
      return callback(null, { ok: false, canceled: true });
    }

    return callback(null, { ok: true, text });
  });
}

// Stream child process stdout/stderr to HTTP response in real time.
// This lets frontend console update continuously while the script is running.
function streamScriptOutput(res, scriptPath, scriptArgs) {
  const child = spawn(process.execPath, [scriptPath, ...scriptArgs], {
    cwd: ROOT_DIR,
    env: process.env
  });

  child.stdout.on('data', (chunk) => {
    res.write(chunk.toString());
  });

  child.stderr.on('data', (chunk) => {
    res.write(chunk.toString());
  });

  child.on('error', (error) => {
    res.write(`\n[runner-error] ${error.message}\n`);
    res.end();
  });

  child.on('close', (code) => {
    res.write(`\n[exit-code] ${code}\n`);
    res.end();
  });
}

function writeStreamingHeaders(res) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    cwd: ROOT_DIR,
    scripts: Object.keys(SCRIPTS),
    port: PORT
  });
});

// macOS native folder picker so frontend can receive a real absolute path.
app.post('/api/pick-directory', (_req, res) => {
  if (process.platform !== 'darwin') {
    return res.status(400).json({ ok: false, error: '当前仅支持 macOS 原生目录选择。' });
  }

  const script = 'set selectedFolder to choose folder with prompt "请选择目录"\nPOSIX path of selectedFolder';
  runAppleScript(script, (err, result) => {
    if (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
    if (!result.ok) {
      return res.status(200).json(result);
    }
    return res.json({ ok: true, path: result.text });
  });
});

app.post('/api/pick-file', (_req, res) => {
  if (process.platform !== 'darwin') {
    return res.status(400).json({ ok: false, error: '当前仅支持 macOS 原生文件选择。' });
  }

  const script = 'set selectedFile to choose file with prompt "请选择文件"\nPOSIX path of selectedFile';
  runAppleScript(script, (err, result) => {
    if (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
    if (!result.ok) {
      return res.status(200).json(result);
    }
    return res.json({ ok: true, path: result.text });
  });
});

app.post('/api/pick-files', (_req, res) => {
  if (process.platform !== 'darwin') {
    return res.status(400).json({ ok: false, error: '当前仅支持 macOS 原生多文件选择。' });
  }

  const script = 'set selectedFiles to choose file with prompt "请选择一个或多个文件" with multiple selections allowed\nset outputText to ""\nrepeat with oneFile in selectedFiles\nset outputText to outputText & POSIX path of oneFile & linefeed\nend repeat\noutputText';
  runAppleScript(script, (err, result) => {
    if (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
    if (!result.ok) {
      return res.status(200).json(result);
    }
    const paths = result.text.split(/\r?\n/).map((v) => v.trim()).filter(Boolean);
    return res.json({ ok: true, paths });
  });
});

app.post('/api/pick-save-file', (_req, res) => {
  if (process.platform !== 'darwin') {
    return res.status(400).json({ ok: false, error: '当前仅支持 macOS 原生保存路径选择。' });
  }

  const script = 'set outputFile to choose file name with prompt "请选择保存文件路径" default name "merged.pdf"\nPOSIX path of outputFile';
  runAppleScript(script, (err, result) => {
    if (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
    if (!result.ok) {
      return res.status(200).json(result);
    }
    return res.json({ ok: true, path: result.text });
  });
});

app.post('/api/topdf/stream', (req, res) => {
  const body = req.body || {};
  const inputs = resolveInputPaths(body.inputs);
  const outdir = typeof body.outdir === 'string' ? resolveInputPath(body.outdir) : '';
  const libreoffice = typeof body.libreoffice === 'string' ? resolveInputPath(body.libreoffice) : '';

  if (inputs.length === 0) {
    return res.status(400).json({ ok: false, error: '至少需要一个输入路径（文件或目录）' });
  }

  const args = [...inputs];
  if (outdir) args.push(`--outdir=${outdir}`);
  if (libreoffice) args.push(`--libreoffice=${libreoffice}`);

  writeStreamingHeaders(res);
  streamScriptOutput(res, SCRIPTS.topdf, args);
});

app.post('/api/listfiles/stream', (req, res) => {
  const body = req.body || {};
  const dir = resolveInputPath(typeof body.dir === 'string' && body.dir.trim() ? body.dir.trim() : '.');
  const depth = Number.isInteger(body.depth)
    ? body.depth
    : (typeof body.depth === 'number' && Number.isFinite(body.depth) ? Math.trunc(body.depth) : null);

  if (!dir || !fs.existsSync(dir)) {
    return res.status(400).json({ ok: false, error: `目录不存在: ${body.dir || ''}` });
  }

  const args = [dir];
  if (typeof depth === 'number' && depth > 0) {
    args.push(`--depth=${depth}`);
  }

  writeStreamingHeaders(res);
  streamScriptOutput(res, SCRIPTS.listfiles, args);
});

app.post('/api/search/stream', (req, res) => {
  const body = req.body || {};
  const dir = resolveInputPath(typeof body.dir === 'string' && body.dir.trim() ? body.dir.trim() : '.');
  const queries = sanitizeStringArray(body.queries);

  if (queries.length === 0) {
    return res.status(400).json({ ok: false, error: '至少需要一个查询词' });
  }

  if (!dir || !fs.existsSync(dir)) {
    return res.status(400).json({ ok: false, error: `目录不存在: ${body.dir || ''}` });
  }

  const args = [dir, ...queries.map((q) => `--query=${q}`)];
  writeStreamingHeaders(res);
  streamScriptOutput(res, SCRIPTS.search, args);
});

app.post('/api/mergetopdf/stream', (req, res) => {
  const body = req.body || {};
  const inputs = resolveInputPaths(body.inputs);
  const outfile = typeof body.outfile === 'string' ? resolveInputPath(body.outfile) : '';
  const libreoffice = typeof body.libreoffice === 'string' ? resolveInputPath(body.libreoffice) : '';
  const cleartemp = Boolean(body.cleartemp);

  if (inputs.length === 0) {
    return res.status(400).json({ ok: false, error: '至少需要一个输入路径（文件或目录）' });
  }

  const args = [...inputs];
  if (outfile) args.push(`--outfile=${outfile}`);
  if (libreoffice) args.push(`--libreoffice=${libreoffice}`);
  if (cleartemp) args.push('--cleartemp');

  writeStreamingHeaders(res);
  streamScriptOutput(res, SCRIPTS.mergetopdf, args);
});

// SPA fallback: let frontend router/iframe shell load for non-API paths.
app.use((_req, res) => {
  res.sendFile(path.join(WEB_ROOT, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Web app is running at http://127.0.0.1:${PORT}`);
});
