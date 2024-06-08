// @bun
// node_modules/hono/dist/utils/cookie.js
var _serialize = (name, value, opt = {}) => {
  let cookie = `${name}=${value}`;
  if (name.startsWith("__Secure-") && !opt.secure) {
    throw new Error("__Secure- Cookie must have Secure attributes");
  }
  if (name.startsWith("__Host-")) {
    if (!opt.secure) {
      throw new Error("__Host- Cookie must have Secure attributes");
    }
    if (opt.path !== "/") {
      throw new Error('__Host- Cookie must have Path attributes with "/"');
    }
    if (opt.domain) {
      throw new Error("__Host- Cookie must not have Domain attributes");
    }
  }
  if (opt && typeof opt.maxAge === "number" && opt.maxAge >= 0) {
    if (opt.maxAge > 34560000) {
      throw new Error("Cookies Max-Age SHOULD NOT be greater than 400 days (34560000 seconds) in duration.");
    }
    cookie += `; Max-Age=${Math.floor(opt.maxAge)}`;
  }
  if (opt.domain && opt.prefix !== "host") {
    cookie += `; Domain=${opt.domain}`;
  }
  if (opt.path) {
    cookie += `; Path=${opt.path}`;
  }
  if (opt.expires) {
    if (opt.expires.getTime() - Date.now() > 34560000000) {
      throw new Error("Cookies Expires SHOULD NOT be greater than 400 days (34560000 seconds) in the future.");
    }
    cookie += `; Expires=${opt.expires.toUTCString()}`;
  }
  if (opt.httpOnly) {
    cookie += "; HttpOnly";
  }
  if (opt.secure) {
    cookie += "; Secure";
  }
  if (opt.sameSite) {
    cookie += `; SameSite=${opt.sameSite.charAt(0).toUpperCase() + opt.sameSite.slice(1)}`;
  }
  if (opt.partitioned) {
    if (!opt.secure) {
      throw new Error("Partitioned Cookie must have Secure attributes");
    }
    cookie += "; Partitioned";
  }
  return cookie;
};
var serialize = (name, value, opt) => {
  value = encodeURIComponent(value);
  return _serialize(name, value, opt);
};

// node_modules/hono/dist/client/utils.js
var isObject = function(item) {
  return typeof item === "object" && item !== null && !Array.isArray(item);
};
var deepMerge = function(target, source) {
  if (!isObject(target) && !isObject(source)) {
    return source;
  }
  const merged = { ...target };
  for (const key in source) {
    const value = source[key];
    if (isObject(merged[key]) && isObject(value)) {
      merged[key] = deepMerge(merged[key], value);
    } else {
      merged[key] = value;
    }
  }
  return merged;
};
var mergePath = (base, path) => {
  base = base.replace(/\/+$/, "");
  base = base + "/";
  path = path.replace(/^\/+/, "");
  return base + path;
};
var replaceUrlParam = (urlString, params) => {
  for (const [k, v] of Object.entries(params)) {
    const reg = new RegExp("/:" + k + "(?:{[^/]+})?");
    urlString = urlString.replace(reg, `/${v}`);
  }
  return urlString;
};
var replaceUrlProtocol = (urlString, protocol) => {
  switch (protocol) {
    case "ws":
      return urlString.replace(/^http/, "ws");
    case "http":
      return urlString.replace(/^ws/, "http");
  }
};
var removeIndexString = (urlSting) => {
  if (/^https?:\/\/[^\/]+?\/index$/.test(urlSting)) {
    return urlSting.replace(/\/index$/, "/");
  }
  return urlSting.replace(/\/index$/, "");
};

// node_modules/hono/dist/client/client.js
var createProxy = (callback, path) => {
  const proxy = new Proxy(() => {
  }, {
    get(_obj, key) {
      if (typeof key !== "string" || key === "then") {
        return;
      }
      return createProxy(callback, [...path, key]);
    },
    apply(_1, _2, args) {
      return callback({
        path,
        args
      });
    }
  });
  return proxy;
};
var ClientRequestImpl = class {
  url;
  method;
  queryParams = undefined;
  pathParams = {};
  rBody;
  cType = undefined;
  constructor(url2, method) {
    this.url = url2;
    this.method = method;
  }
  fetch = async (args, opt) => {
    if (args) {
      if (args.query) {
        for (const [k, v] of Object.entries(args.query)) {
          if (v === undefined) {
            continue;
          }
          this.queryParams ||= new URLSearchParams;
          if (Array.isArray(v)) {
            for (const v2 of v) {
              this.queryParams.append(k, v2);
            }
          } else {
            this.queryParams.set(k, v);
          }
        }
      }
      if (args.form) {
        const form = new FormData;
        for (const [k, v] of Object.entries(args.form)) {
          if (Array.isArray(v)) {
            for (const v2 of v) {
              form.append(k, v2);
            }
          } else {
            form.append(k, v);
          }
        }
        this.rBody = form;
      }
      if (args.json) {
        this.rBody = JSON.stringify(args.json);
        this.cType = "application/json";
      }
      if (args.param) {
        this.pathParams = args.param;
      }
    }
    let methodUpperCase = this.method.toUpperCase();
    const headerValues = {
      ...args?.header ?? {},
      ...typeof opt?.headers === "function" ? await opt.headers() : opt?.headers ? opt.headers : {}
    };
    if (args?.cookie) {
      const cookies = [];
      for (const [key, value] of Object.entries(args.cookie)) {
        cookies.push(serialize(key, value, { path: "/" }));
      }
      headerValues["Cookie"] = cookies.join(",");
    }
    if (this.cType) {
      headerValues["Content-Type"] = this.cType;
    }
    const headers = new Headers(headerValues ?? undefined);
    let url2 = this.url;
    url2 = removeIndexString(url2);
    url2 = replaceUrlParam(url2, this.pathParams);
    if (this.queryParams) {
      url2 = url2 + "?" + this.queryParams.toString();
    }
    methodUpperCase = this.method.toUpperCase();
    const setBody = !(methodUpperCase === "GET" || methodUpperCase === "HEAD");
    return (opt?.fetch || fetch)(url2, {
      body: setBody ? this.rBody : undefined,
      method: methodUpperCase,
      headers,
      ...opt?.init
    });
  };
};
var hc = (baseUrl, options) => createProxy(function proxyCallback(opts) {
  const parts = [...opts.path];
  if (parts[parts.length - 1] === "toString") {
    if (parts[parts.length - 2] === "name") {
      return parts[parts.length - 3] || "";
    }
    return proxyCallback.toString();
  }
  if (parts[parts.length - 1] === "valueOf") {
    if (parts[parts.length - 2] === "name") {
      return parts[parts.length - 3] || "";
    }
    return proxyCallback;
  }
  let method = "";
  if (/^\$/.test(parts[parts.length - 1])) {
    const last = parts.pop();
    if (last) {
      method = last.replace(/^\$/, "");
    }
  }
  const path = parts.join("/");
  const url2 = mergePath(baseUrl, path);
  if (method === "url") {
    if (opts.args[0] && opts.args[0].param) {
      return new URL(replaceUrlParam(url2, opts.args[0].param));
    }
    return new URL(url2);
  }
  if (method === "ws") {
    const targetUrl = replaceUrlProtocol(opts.args[0] && opts.args[0].param ? replaceUrlParam(url2, opts.args[0].param) : url2, "ws");
    return new WebSocket(targetUrl);
  }
  const req = new ClientRequestImpl(url2, method);
  if (method) {
    options ??= {};
    const args = deepMerge(options, { ...opts.args[1] ?? {} });
    return req.fetch(opts.args[0], args);
  }
  return req;
}, []);

// src/client.ts
var client3 = hc("");
var client_default = client3;
export {
  client_default as default
};
