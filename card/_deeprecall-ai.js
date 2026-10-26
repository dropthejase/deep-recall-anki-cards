// Shared AI code for the DeepRecall card. Both sides of the card load this one file, so the
// providers, saved keys and settings are the same on the question and the answer. It is stored in
// Anki's media folder; the leading underscore stops "Check Media" from removing it.
(function () {
  var CONFIG_KEY = 'dr:ai';
  var PUTER_TOKEN_KEY = 'puterToken';
  var CONTEXT = 'deeprecall-key:v1';
  var ITERATIONS = 600000;

  // The models offered for each provider. "image" is false only where a model is known to be text only.
  var PROVIDERS = {
    puter: {
      label: 'Puter',
      needsKey: true,
      secret: true,
      keyLabel: 'Puter token',
      keyUrl: 'https://puter.com/dashboard#account',
      defaultModel: 'gpt-6-luna',
      custom: false,
      timeout: 30000,
      models: [
        {
          id: 'gpt-6-luna',
          label: 'GPT-6 Luna (recommended)',
          note: 'Cheap and fast. Tested on handwriting.',
          options: { reasoning_effort: 'none' },
        },
        {
          id: 'infron:anthropic/claude-haiku-5.5',
          label: 'Claude Haiku 5.5',
          note: 'More careful, about three times the cost of Luna. Tested on handwriting.',
        },
        {
          id: 'claude-sonnet-5-5',
          label: 'Claude Sonnet 5.5',
          note: 'Most careful, and the most expensive. Reads images; not tested on handwriting.',
        },
        {
          id: 'gemini-3.8-flash',
          label: 'Gemini 3.8 Flash',
          note: 'Read simple handwriting in a test. Not tested further.',
        },
        {
          id: 'qwen3.8-flash',
          label: 'Qwen3.8 Flash',
          note: 'Read simple handwriting in a test. Not tested further.',
        },
      ],
    },
    claude: {
      label: 'Claude',
      needsKey: true,
      secret: true,
      keyLabel: 'Anthropic API key',
      keyUrl: 'https://console.anthropic.com/settings/keys',
      defaultModel: 'claude-haiku-5-5',
      custom: true,
      timeout: 45000,
      models: [
        { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', note: 'Fast and cheap.' },
        { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', note: 'More careful.' },
        { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', note: 'Most careful, most expensive.' },
      ],
    },
    openai: {
      label: 'OpenAI',
      needsKey: true,
      secret: true,
      keyLabel: 'OpenAI API key',
      keyUrl: 'https://platform.openai.com/api-keys',
      defaultModel: 'gpt-6-luna',
      custom: true,
      timeout: 45000,
      models: [
        { id: 'gpt-6-luna', label: 'GPT-6 Luna (recommended)', note: 'Cheap and fast.' },
        { id: 'gpt-6.1-sol', label: 'GPT Sol 6.1', note: 'More careful.' },
        { id: 'gpt-5.5', label: 'GPT-5.5', note: 'Careful. Not tested on handwriting.' },
        { id: 'gpt-5-mini', label: 'GPT-5 mini', note: 'Cheap. Tested on handwriting.' },
      ],
    },
    ollama: {
      label: 'Ollama',
      menuLabel: 'Ollama (works on desktop only)',
      needsKey: false,
      secret: false,
      defaultModel: '',
      custom: false,
      local: true,
      urlKey: 'ollamaUrl',
      defaultUrl: 'http://localhost:11434',
      timeout: 120000,
      models: [],
    },
    lmstudio: {
      label: 'LM Studio',
      menuLabel: 'LM Studio (works on desktop only)',
      needsKey: false,
      secret: false,
      defaultModel: '',
      custom: false,
      local: true,
      urlKey: 'lmstudioUrl',
      defaultUrl: 'http://localhost:1234',
      timeout: 120000,
      models: [],
    },
  };
  var ORDER = ['puter', 'claude', 'openai', 'ollama', 'lmstudio'];

  // ── Storage ──
  // Everything is kept in the card's own local storage. Desktop Anki forgets that when it closes, so
  // when the DeepRecall add-on is installed, settings and encrypted keys are also handed to it (through
  // Anki's pycmd channel) and read back when a card opens. Without the add-on nothing changes.
  var PERSIST = ['dr:', 'ai:', 'writeMode:', 'puterToken'];
  var addonSeen = false;
  var loaded = false;
  var started = false;
  var waiting = [];

  function persisted(k) {
    for (var i = 0; i < PERSIST.length; i++) if (k.indexOf(PERSIST[i]) === 0) return true;
    return false;
  }
  function toAddon(action, payload) {
    if (!addonSeen) return;
    try {
      window.pycmd('deeprecall:' + action + ':' + JSON.stringify(payload), function () {});
    } catch (e) {}
  }
  function ls(k) {
    try {
      return localStorage.getItem(k) || '';
    } catch (e) {
      return '';
    }
  }
  function lsSet(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch (e) {}
    if (persisted(k)) toAddon('set', { k: k, v: String(v) });
  }
  function lsDel(k) {
    try {
      localStorage.removeItem(k);
    } catch (e) {}
    if (persisted(k)) toAddon('del', { k: k });
  }

  function finishLoading() {
    if (loaded) return;
    loaded = true;
    var list = waiting;
    waiting = [];
    list.forEach(function (cb) {
      try {
        cb();
      } catch (e) {}
    });
  }
  function merge(reply) {
    var data = null;
    try {
      data = typeof reply === 'string' ? JSON.parse(reply) : null;
    } catch (e) {}
    if (!data || typeof data !== 'object') return;
    addonSeen = true;
    Object.keys(data).forEach(function (k) {
      if (persisted(k) && typeof data[k] === 'string') {
        try {
          localStorage.setItem(k, data[k]);
        } catch (e) {}
      }
    });
    // Anything saved on this device before the add-on was installed is handed over too.
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && persisted(k) && !(k in data)) toAddon('set', { k: k, v: localStorage.getItem(k) });
      }
    } catch (e) {}
  }
  // Runs the callback once the add-on (if there is one) has handed back what it kept.
  function whenLoaded(cb) {
    if (loaded) return cb();
    waiting.push(cb);
    if (started) return;
    started = true;
    if (typeof window.pycmd !== 'function') return finishLoading();
    var timer = setTimeout(finishLoading, 2000);
    try {
      window.pycmd('deeprecall:get:', function (reply) {
        clearTimeout(timer);
        merge(reply);
        finishLoading();
      });
    } catch (e) {
      clearTimeout(timer);
      finishLoading();
    }
  }
  function ss(k) {
    try {
      return sessionStorage.getItem(k) || '';
    } catch (e) {
      return '';
    }
  }
  function ssSet(k, v) {
    try {
      sessionStorage.setItem(k, v);
    } catch (e) {}
  }
  function ssDel(k) {
    try {
      sessionStorage.removeItem(k);
    } catch (e) {}
  }

  // ── Settings: which provider, which model for each, and the addresses of the local servers ──
  function getConfig() {
    var c = {};
    try {
      c = JSON.parse(ls(CONFIG_KEY) || '{}') || {};
    } catch (e) {}
    return {
      provider: PROVIDERS[c.provider] ? c.provider : 'puter',
      models: c.models && typeof c.models === 'object' ? c.models : {},
      ollamaUrl:
        typeof c.ollamaUrl === 'string' && c.ollamaUrl ? c.ollamaUrl : PROVIDERS.ollama.defaultUrl,
      lmstudioUrl:
        typeof c.lmstudioUrl === 'string' && c.lmstudioUrl
          ? c.lmstudioUrl
          : PROVIDERS.lmstudio.defaultUrl,
    };
  }
  function setConfig(patch) {
    var c = getConfig();
    for (var k in patch) c[k] = patch[k];
    lsSet(CONFIG_KEY, JSON.stringify(c));
    return c;
  }
  function modelFor(provider) {
    var c = getConfig();
    return c.models[provider] || PROVIDERS[provider].defaultModel;
  }
  function setModel(provider, model) {
    var c = getConfig();
    c.models[provider] = model;
    setConfig({ models: c.models });
  }
  function findModel(provider, id) {
    var list = PROVIDERS[provider].models;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  // ── Keys ──
  // The Puter token is kept as it is. Claude and OpenAI keys are kept encrypted with a passphrase,
  // and the unlocked key lives only in this session.
  function b64(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function unb64(text) {
    var s = atob(text);
    var out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  function canEncrypt() {
    return !!(window.crypto && crypto.subtle && crypto.getRandomValues);
  }
  function deriveKey(passphrase, salt, iterations) {
    return crypto.subtle
      .importKey('raw', new TextEncoder().encode(passphrase.normalize('NFKC')), 'PBKDF2', false, [
        'deriveKey',
      ])
      .then(function (material) {
        return crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' },
          material,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt'],
        );
      });
  }
  function encrypt(secret, passphrase) {
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    return deriveKey(passphrase, salt, ITERATIONS).then(function (key) {
      return crypto.subtle
        .encrypt(
          { name: 'AES-GCM', iv: iv, additionalData: new TextEncoder().encode(CONTEXT) },
          key,
          new TextEncoder().encode(secret),
        )
        .then(function (cipher) {
          return {
            v: 1,
            iterations: ITERATIONS,
            salt: b64(salt),
            iv: b64(iv),
            ciphertext: b64(new Uint8Array(cipher)),
          };
        });
    });
  }
  function decrypt(record, passphrase) {
    if (
      !record ||
      record.v !== 1 ||
      !(record.iterations >= 100000 && record.iterations <= 5000000)
    ) {
      return Promise.reject(fail('keydamaged', 'The saved key is damaged.'));
    }
    var salt, iv, cipher;
    try {
      salt = unb64(record.salt);
      iv = unb64(record.iv);
      cipher = unb64(record.ciphertext);
    } catch (e) {
      return Promise.reject(fail('keydamaged', 'The saved key is damaged.'));
    }
    return deriveKey(passphrase, salt, record.iterations).then(function (key) {
      return crypto.subtle
        .decrypt(
          { name: 'AES-GCM', iv: iv, additionalData: new TextEncoder().encode(CONTEXT) },
          key,
          cipher,
        )
        .then(
          function (plain) {
            return new TextDecoder().decode(plain);
          },
          function () {
            throw fail('passphrase', 'Wrong passphrase.');
          },
        );
    });
  }

  // A Puter token saved before passphrases existed (or on a device that cannot encrypt) is kept as it is.
  function isPlainPuter(provider) {
    return provider === 'puter' && !!ls(PUTER_TOKEN_KEY) && !ls('dr:key:puter');
  }

  // "none": nothing saved. "locked": saved, but the passphrase has not been entered this session.
  // "ready": usable now.
  function keyState(provider) {
    var def = PROVIDERS[provider];
    if (!def.needsKey) return 'ready';
    if (!ls('dr:key:' + provider)) return isPlainPuter(provider) ? 'ready' : 'none';
    return ss('dr:open:' + provider) ? 'ready' : 'locked';
  }
  function getKey(provider) {
    var def = PROVIDERS[provider];
    if (!def.needsKey) return '';
    return ss('dr:open:' + provider) || (isPlainPuter(provider) ? ls(PUTER_TOKEN_KEY) : '');
  }
  function saveKey(provider, key, passphrase) {
    var def = PROVIDERS[provider];
    if (provider === 'puter' && !canEncrypt()) {
      lsSet(PUTER_TOKEN_KEY, key);
      return Promise.resolve();
    }
    if (!canEncrypt())
      return Promise.reject(
        fail(
          'nocrypto',
          'This device cannot encrypt keys, so ' + def.label + ' is not available here.',
        ),
      );
    if (!passphrase)
      return Promise.reject(fail('passphrase', 'Choose a passphrase to protect the key.'));
    return encrypt(key, passphrase).then(function (record) {
      lsSet('dr:key:' + provider, JSON.stringify(record));
      ssSet('dr:open:' + provider, key);
      if (provider === 'puter') lsDel(PUTER_TOKEN_KEY);
    });
  }
  function unlock(provider, passphrase) {
    var record = null;
    try {
      record = JSON.parse(ls('dr:key:' + provider));
    } catch (e) {}
    return decrypt(record, passphrase).then(function (key) {
      ssSet('dr:open:' + provider, key);
    });
  }
  // Works without the passphrase, so a forgotten passphrase never locks anyone out.
  function removeKey(provider) {
    if (provider === 'puter') lsDel(PUTER_TOKEN_KEY);
    lsDel('dr:key:' + provider);
    ssDel('dr:open:' + provider);
  }

  // ── Errors ──
  function fail(kind, message, extra) {
    var e = new Error(message);
    e.kind = kind;
    if (extra) for (var k in extra) e[k] = extra[k];
    return e;
  }
  function describe(error) {
    var raw = error || {};
    var inner = raw.error && typeof raw.error === 'object' ? raw.error : {};
    var code = String(raw.code || inner.code || '');
    var message = String(
      raw.detail ||
        raw.message ||
        inner.message ||
        (typeof raw.error === 'string' ? raw.error : ''),
    );
    if (message === 'timeout' || message === 'load') message = '';
    return [code, message].filter(Boolean).join(': ').slice(0, 200);
  }
  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {
        reject(new Error('timeout'));
      }, ms);
      promise.then(
        function (value) {
          clearTimeout(timer);
          resolve(value);
        },
        function (error) {
          clearTimeout(timer);
          reject(error);
        },
      );
    });
  }

  // One plain sentence for the AI box. The provider's own words are added in brackets.
  function explain(error, provider) {
    var def = PROVIDERS[provider] || PROVIDERS.puter;
    var kind = (error && error.kind) || '';
    var said = error && error.message ? String(error.message) : '';
    var text;
    if (kind === 'nokey' || kind === 'locked') text = error.message;
    else if (kind === 'nomodel') text = error.message;
    else if (kind === 'novision') text = error.message;
    else if (kind === 'offline')
      text =
        'You seem to be offline, so there is no AI feedback this time. The answer above is unaffected.';
    else if (said === 'load') text = 'Could not load Puter. Check your connection.';
    else if (said === 'timeout' || kind === 'timeout') {
      text = def.local
        ? def.label + ' did not answer in time. The model may still be loading: try again.'
        : def.label +
          ' did not answer. ' +
          (provider === 'puter'
            ? 'Your token may have expired: replace it on the question side, or try again.'
            : 'Try again.');
    } else if (
      kind === 'network' ||
      /network|offline|failed to fetch/i.test(said + (error && error.code))
    ) {
      text = def.local
        ? 'Could not reach ' +
          def.label +
          '. Make sure it is running on this computer, its server is started and the address is right.'
        : 'Could not reach ' + def.label + '. Check your internet connection.';
    } else if (kind === 'funds' || /insufficient_funds/i.test(said + (error && error.code))) {
      text =
        provider === 'puter'
          ? 'Your Puter allowance for this month is used up.'
          : 'Your ' + def.label + ' account has no credit left.';
    } else if (
      kind === 'auth' ||
      /auth|token|unauthori[sz]ed|forbidden|401/i.test(said + (error && error.code))
    ) {
      text =
        def.label +
        ' did not accept your ' +
        (def.keyLabel ? def.keyLabel.toLowerCase() : 'key') +
        '. Replace it on the question side.';
    } else if (kind === 'rate')
      text = def.label + ' says too many requests. Wait a moment and try again.';
    else text = 'Could not get feedback.';
    var detail = describe(error);
    if (
      detail &&
      said !== 'load' &&
      said !== 'timeout' &&
      kind !== 'novision' &&
      kind !== 'nokey' &&
      kind !== 'locked' &&
      kind !== 'nomodel' &&
      kind !== 'offline'
    ) {
      text += ' (' + def.label + ' said: ' + detail + ')';
    }
    return text;
  }

  // ── Talking to each provider ──
  function loadPuter() {
    return new Promise(function (resolve, reject) {
      if (window.puter) return resolve(window.puter);
      // Started once the page has finished loading, so a slow connection can never hold the card up.
      function start() {
        var s = document.createElement('script');
        s.src = 'https://js.puter.com/v2/';
        var gaveUp = setTimeout(function () {
          reject(new Error('load'));
        }, 15000);
        s.onload = function () {
          clearTimeout(gaveUp);
          window.puter ? resolve(window.puter) : reject(new Error('load'));
        };
        s.onerror = function () {
          clearTimeout(gaveUp);
          reject(new Error('load'));
        };
        document.head.appendChild(s);
      }
      if (document.readyState === 'complete') start();
      else window.addEventListener('load', start);
    });
  }

  function stripFence(text) {
    return String(text)
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');
  }
  function parseJson(content) {
    if (content && typeof content === 'object') return content;
    if (typeof content !== 'string' || !content.trim())
      throw fail('bad', 'The model returned an empty reply.');
    try {
      return JSON.parse(stripFence(content));
    } catch (e) {
      throw fail('bad', 'The model did not return valid JSON.');
    }
  }

  // fetch with a time limit, mapping failures to errors the card can explain.
  function request(url, init, ms) {
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (controller) controller.abort();
    }, ms);
    var options = {
      method: init.method || 'GET',
      headers: init.headers || {},
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    };
    if (init.body) options.body = init.body;
    if (controller) options.signal = controller.signal;
    return fetch(url, options).then(
      function (response) {
        clearTimeout(timer);
        if (response.ok) return response.json();
        return response
          .json()
          .then(
            function (body) {
              return body;
            },
            function () {
              return null;
            },
          )
          .then(function (body) {
            var message =
              body && body.error && typeof body.error.message === 'string'
                ? body.error.message.slice(0, 200)
                : '';
            var status = response.status;
            var kind =
              status === 401 || status === 403
                ? 'auth'
                : status === 402
                  ? 'funds'
                  : status === 429
                    ? 'rate'
                    : 'http';
            throw fail(kind, 'Request failed (' + status + ')', {
              detail: message,
              status: status,
            });
          });
      },
      function (error) {
        clearTimeout(timer);
        if (error && error.name === 'AbortError') throw fail('timeout', 'timeout');
        throw fail('network', 'network');
      },
    );
  }

  function dataParts(dataUrl) {
    var m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl || '');
    return m ? { type: m[1], data: m[2] } : null;
  }

  function viaPuter(job, model) {
    var entry = findModel('puter', model) || { options: null };
    var options = {
      model: model,
      max_tokens: 900,
      outputFormat: { type: 'json_schema', name: 'submit_grade', strict: true, schema: job.schema },
    };
    if (entry.options) for (var k in entry.options) options[k] = entry.options[k];
    return loadPuter()
      .then(function (puter) {
        puter.setAuthToken(getKey('puter'));
        var call = job.image
          ? puter.ai.chat(job.system + '\n\n' + job.user, job.image, false, options)
          : puter.ai.chat(
              [
                { role: 'system', content: job.system },
                { role: 'user', content: job.user },
              ],
              false,
              options,
            );
        return withTimeout(call, PROVIDERS.puter.timeout);
      })
      .then(function (reply) {
        return parseJson(reply && reply.message ? reply.message.content : null);
      });
  }

  function viaClaude(job, model) {
    var content = [];
    var image = dataParts(job.image);
    if (image)
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: image.type, data: image.data },
      });
    content.push({ type: 'text', text: job.user });
    return request(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': getKey('claude'),
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 900,
          system: job.system,
          messages: [{ role: 'user', content: content }],
          tools: [
            {
              name: 'submit_grade',
              description: 'Submit the grade for the student answer.',
              input_schema: job.schema,
            },
          ],
          tool_choice: { type: 'tool', name: 'submit_grade' },
        }),
      },
      PROVIDERS.claude.timeout,
    ).then(function (body) {
      var blocks = (body && body.content) || [];
      for (var i = 0; i < blocks.length; i++) {
        if (blocks[i].type === 'tool_use' && blocks[i].name === 'submit_grade')
          return blocks[i].input;
      }
      throw fail('bad', 'Claude did not return a grade.');
    });
  }

  // OpenAI, and the local servers (Ollama, LM Studio), which speak the same format.
  function viaChatCompletions(job, model, base, apiKey, local) {
    var user = job.user;
    var image = dataParts(job.image);
    var content = image
      ? [
          { type: 'image_url', image_url: { url: job.image } },
          { type: 'text', text: user },
        ]
      : user;
    var body = {
      model: model,
      messages: [
        { role: 'system', content: job.system },
        { role: 'user', content: content },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'submit_grade', strict: true, schema: job.schema },
      },
    };
    body[local ? 'max_tokens' : 'max_completion_tokens'] = 900;
    // Local "thinking" models otherwise spend the whole budget on hidden reasoning.
    if (local) body.reasoning_effort = 'none';
    var headers = { 'content-type': 'application/json' };
    if (apiKey) headers.authorization = 'Bearer ' + apiKey;
    return request(
      base + '/v1/chat/completions',
      { method: 'POST', headers: headers, body: JSON.stringify(body) },
      local ? PROVIDERS.ollama.timeout : PROVIDERS.openai.timeout,
    ).then(function (reply) {
      var message = reply && reply.choices && reply.choices[0] ? reply.choices[0].message : null;
      if (!message) throw fail('bad', 'Unexpected reply from the model.');
      if (message.refusal) throw fail('bad', 'The model declined to grade this card.');
      if (!message.content) {
        throw fail(
          'bad',
          local
            ? 'The local model returned an empty reply. It may be a thinking model that ran out of room: try another model.'
            : 'The model returned an empty reply.',
        );
      }
      return parseJson(message.content);
    });
  }

  function cleanBase(raw, def) {
    def = def || PROVIDERS.ollama;
    var url;
    try {
      url = new URL(String(raw).trim());
    } catch (e) {
      throw fail('nomodel', 'That ' + def.label + ' address is not valid.');
    }
    // Only this computer is accepted. Settings can be rewritten by any card in the same Anki, so
    // an address anywhere else could send your answers to someone else's server.
    var local =
      url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
    if (!local || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
      throw fail(
        'nomodel',
        'The ' +
          def.label +
          ' address must be on this computer, for example ' +
          def.defaultUrl +
          '.',
      );
    }
    return url.origin;
  }

  // Models available on a local server, with whether each can read images (null when unknown).
  function listLocal(provider, address) {
    var def = PROVIDERS[provider];
    var base;
    try {
      base = cleanBase(address, def);
    } catch (e) {
      return Promise.reject(e);
    }
    if (provider === 'lmstudio') {
      // LM Studio's own list says which models are vision models. The standard list does not, so
      // it is only the fallback.
      return request(base + '/api/v0/models', {}, 5000).then(
        function (body) {
          var out = [];
          ((body && body.data) || []).forEach(function (m) {
            if (m.type !== 'embeddings') out.push({ id: m.id, vision: m.type === 'vlm' });
          });
          return out;
        },
        function () {
          return request(base + '/v1/models', {}, 5000).then(function (body) {
            var out = [];
            ((body && body.data) || []).forEach(function (m) {
              if (!/embed/i.test(m.id)) out.push({ id: m.id, vision: null });
            });
            return out;
          });
        },
      );
    }
    return request(base + '/api/tags', {}, 5000).then(function (body) {
      var out = [];
      ((body && body.models) || []).forEach(function (m) {
        var caps = m.capabilities;
        out.push({
          id: m.name,
          vision: Array.isArray(caps) ? caps.indexOf('vision') !== -1 : null,
        });
      });
      return out;
    });
  }
  function listOllama(address) {
    return listLocal('ollama', address);
  }

  // job: { system, user, schema, image (a data URL, or empty) }
  function grade(job) {
    var cfg = getConfig();
    var provider = cfg.provider;
    var def = PROVIDERS[provider];
    if (navigator.onLine === false && !def.local) return Promise.reject(fail('offline', 'offline'));
    var state = keyState(provider);
    if (state === 'none')
      return Promise.reject(
        fail(
          'nokey',
          'To get AI feedback, add your ' +
            def.keyLabel +
            ' on the question side (tick AI feedback there).',
        ),
      );
    if (state === 'locked')
      return Promise.reject(
        fail(
          'locked',
          'Your ' +
            def.label +
            ' key is locked. Enter your passphrase on the question side (tick AI feedback there).',
        ),
      );
    var model = modelFor(provider);
    if (!model)
      return Promise.reject(
        fail('nomodel', 'Choose a model on the question side (tick AI feedback there).'),
      );

    if (provider === 'puter') return viaPuter(job, model);
    if (provider === 'claude') return viaClaude(job, model);
    if (provider === 'openai')
      return viaChatCompletions(job, model, 'https://api.openai.com', getKey('openai'), false);
    var base;
    try {
      base = cleanBase(cfg[def.urlKey], def);
    } catch (e) {
      return Promise.reject(e);
    }
    if (!job.image) return viaChatCompletions(job, model, base, '', true);
    // Ask the server first, so a text-only model is caught before sending a picture.
    return listLocal(provider, base)
      .then(
        function (models) {
          for (var i = 0; i < models.length; i++) {
            if (models[i].id === model && models[i].vision === false) {
              throw fail(
                'novision',
                model +
                  ' cannot read images. Type your answer, or pick a model that can see images on the question side.',
              );
            }
          }
        },
        function () {
          /* the call below reports a connection problem */
        },
      )
      .then(function () {
        return viaChatCompletions(job, model, base, '', true);
      });
  }

  // Checks a key without spending anything: both Claude and OpenAI list models for free.
  function verifyKey(provider, key) {
    if (provider === 'puter') {
      return loadPuter().then(function (puter) {
        puter.setAuthToken(key);
        return withTimeout(puter.auth.getUser(), 12000);
      });
    }
    // A key limited to the chat call cannot list models (403), but a key that is refused outright
    // (401) is wrong. Only the second is turned away here.
    function lenient(promise) {
      return promise.catch(function (error) {
        if (error && error.status === 403) return {};
        throw error;
      });
    }
    if (provider === 'claude') {
      return lenient(
        request(
          'https://api.anthropic.com/v1/models',
          {
            headers: {
              'x-api-key': key,
              'anthropic-version': '2023-06-01',
              'anthropic-dangerous-direct-browser-access': 'true',
            },
          },
          12000,
        ),
      );
    }
    return lenient(
      request(
        'https://api.openai.com/v1/models',
        { headers: { authorization: 'Bearer ' + key } },
        12000,
      ),
    );
  }

  window.DRAI = {
    PROVIDERS: PROVIDERS,
    ORDER: ORDER,
    getConfig: getConfig,
    setConfig: setConfig,
    modelFor: modelFor,
    setModel: setModel,
    findModel: findModel,
    keyState: keyState,
    isPlainPuter: isPlainPuter,
    getKey: getKey,
    saveKey: saveKey,
    unlock: unlock,
    removeKey: removeKey,
    canEncrypt: canEncrypt,
    verifyKey: verifyKey,
    listLocal: listLocal,
    listOllama: listOllama,
    grade: grade,
    explain: explain,
    describe: describe,
    loadPuter: loadPuter,
    withTimeout: withTimeout,
    whenLoaded: whenLoaded,
    store: { set: lsSet, del: lsDel },
  };
})();
