class TerminalConsole extends HTMLElement {
  connectedCallback() {
    if (this._initialized) return;
    this._initialized = true;

    const title = this.getAttribute('title') || 'output';
    this.classList.add('block', 'flex-1', 'min-h-0');

    this.innerHTML = `
      <div class="h-full min-h-0 flex flex-col">
        <div class="flex items-center gap-2 bg-gray-800 border border-gray-700 border-b-0 rounded-t-lg px-4 py-2">
          <span class="w-3 h-3 rounded-full bg-red-500/70"></span>
          <span class="w-3 h-3 rounded-full bg-yellow-500/70"></span>
          <span class="w-3 h-3 rounded-full bg-green-500/70"></span>
          <span class="ml-2 text-xs text-gray-500 font-mono" data-role="title"></span>

          <button data-role="copy"
            class="ml-auto inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-200 border border-gray-600 hover:border-gray-400 rounded px-2 py-0.5 transition-colors">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
            复制
          </button>
        </div>

        <div class="relative flex-1 min-h-0">
          <pre data-role="output"
            class="h-full min-h-0 bg-gray-950 border border-gray-700 rounded-b-lg font-mono text-sm text-green-300 p-4 overflow-auto whitespace-pre leading-relaxed"
          ><span class="text-gray-600">// 请先选择文件夹，然后点击「执行」</span></pre>

          <div data-role="loading"
            class="hidden pointer-events-none absolute top-3 right-3 rounded-full border border-indigo-500/40 bg-gray-900/80 px-3 py-1.5">
            <div class="flex items-center gap-2 text-indigo-300">
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <span class="text-xs font-mono">运行中...</span>
            </div>
          </div>
        </div>

        <div data-role="stats" class="hidden mt-2 flex gap-4 text-xs text-gray-500 font-mono px-1">
          <span data-role="dirs">📁 0 目录</span>
          <span data-role="files">📄 0 文件</span>
          <span data-role="time">⏱ 0ms</span>
        </div>
      </div>
    `;

    this._title = this.querySelector('[data-role="title"]');
    this._copy = this.querySelector('[data-role="copy"]');
    this._output = this.querySelector('[data-role="output"]');
    this._loading = this.querySelector('[data-role="loading"]');
    this._stats = this.querySelector('[data-role="stats"]');
    this._dirs = this.querySelector('[data-role="dirs"]');
    this._files = this.querySelector('[data-role="files"]');
    this._time = this.querySelector('[data-role="time"]');

    this.setTitle(title);
    this._copy.addEventListener('click', () => this.copyToClipboard());
  }

  setTitle(text) {
    this._title.textContent = text;
  }

  clear() {
    this._output.textContent = '';
  }

  setOutput(text) {
    this._output.textContent = text;
    this._output.scrollTop = 0;
  }

  appendOutput(text) {
    this._output.textContent += text;
    this._output.scrollTop = this._output.scrollHeight;
  }

  getOutput() {
    return this._output.textContent;
  }

  setLoading(isLoading) {
    this._loading.classList.toggle('hidden', !isLoading);
  }

  showStats(dirs, files, elapsed) {
    this._dirs.textContent = `📁 ${dirs} 目录`;
    this._files.textContent = `📄 ${files} 文件`;
    this._time.textContent = `⏱ ${elapsed}ms`;
    this._stats.classList.remove('hidden');
  }

  hideStats() {
    this._stats.classList.add('hidden');
  }

  async copyToClipboard() {
    try {
      await navigator.clipboard.writeText(this.getOutput());
      const oldText = this._copy.innerHTML;
      this._copy.innerHTML = '<svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> 已复制';
      this._copy.classList.add('text-emerald-400', 'border-emerald-500');
      setTimeout(() => {
        this._copy.innerHTML = oldText;
        this._copy.classList.remove('text-emerald-400', 'border-emerald-500');
      }, 1200);
    } catch (_error) {
      alert('复制失败，请手动选择文本。');
    }
  }
}

customElements.define('terminal-console', TerminalConsole);
