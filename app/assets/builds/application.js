 (() => new EventSource("http://localhost:8082").onmessage = () => location.reload())();
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __publicField = (obj, key, value) => {
    __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
    return value;
  };

  // ../../node_modules/@rails/actioncable/src/adapters.js
  var adapters_default;
  var init_adapters = __esm({
    "../../node_modules/@rails/actioncable/src/adapters.js"() {
      adapters_default = {
        logger: self.console,
        WebSocket: self.WebSocket
      };
    }
  });

  // ../../node_modules/@rails/actioncable/src/logger.js
  var logger_default;
  var init_logger = __esm({
    "../../node_modules/@rails/actioncable/src/logger.js"() {
      init_adapters();
      logger_default = {
        log(...messages) {
          if (this.enabled) {
            messages.push(Date.now());
            adapters_default.logger.log("[ActionCable]", ...messages);
          }
        }
      };
    }
  });

  // ../../node_modules/@rails/actioncable/src/connection_monitor.js
  var now, secondsSince, ConnectionMonitor, connection_monitor_default;
  var init_connection_monitor = __esm({
    "../../node_modules/@rails/actioncable/src/connection_monitor.js"() {
      init_logger();
      now = () => new Date().getTime();
      secondsSince = (time) => (now() - time) / 1e3;
      ConnectionMonitor = class {
        constructor(connection) {
          this.visibilityDidChange = this.visibilityDidChange.bind(this);
          this.connection = connection;
          this.reconnectAttempts = 0;
        }
        start() {
          if (!this.isRunning()) {
            this.startedAt = now();
            delete this.stoppedAt;
            this.startPolling();
            addEventListener("visibilitychange", this.visibilityDidChange);
            logger_default.log(`ConnectionMonitor started. stale threshold = ${this.constructor.staleThreshold} s`);
          }
        }
        stop() {
          if (this.isRunning()) {
            this.stoppedAt = now();
            this.stopPolling();
            removeEventListener("visibilitychange", this.visibilityDidChange);
            logger_default.log("ConnectionMonitor stopped");
          }
        }
        isRunning() {
          return this.startedAt && !this.stoppedAt;
        }
        recordPing() {
          this.pingedAt = now();
        }
        recordConnect() {
          this.reconnectAttempts = 0;
          this.recordPing();
          delete this.disconnectedAt;
          logger_default.log("ConnectionMonitor recorded connect");
        }
        recordDisconnect() {
          this.disconnectedAt = now();
          logger_default.log("ConnectionMonitor recorded disconnect");
        }
        startPolling() {
          this.stopPolling();
          this.poll();
        }
        stopPolling() {
          clearTimeout(this.pollTimeout);
        }
        poll() {
          this.pollTimeout = setTimeout(
            () => {
              this.reconnectIfStale();
              this.poll();
            },
            this.getPollInterval()
          );
        }
        getPollInterval() {
          const { staleThreshold, reconnectionBackoffRate } = this.constructor;
          const backoff = Math.pow(1 + reconnectionBackoffRate, Math.min(this.reconnectAttempts, 10));
          const jitterMax = this.reconnectAttempts === 0 ? 1 : reconnectionBackoffRate;
          const jitter = jitterMax * Math.random();
          return staleThreshold * 1e3 * backoff * (1 + jitter);
        }
        reconnectIfStale() {
          if (this.connectionIsStale()) {
            logger_default.log(`ConnectionMonitor detected stale connection. reconnectAttempts = ${this.reconnectAttempts}, time stale = ${secondsSince(this.refreshedAt)} s, stale threshold = ${this.constructor.staleThreshold} s`);
            this.reconnectAttempts++;
            if (this.disconnectedRecently()) {
              logger_default.log(`ConnectionMonitor skipping reopening recent disconnect. time disconnected = ${secondsSince(this.disconnectedAt)} s`);
            } else {
              logger_default.log("ConnectionMonitor reopening");
              this.connection.reopen();
            }
          }
        }
        get refreshedAt() {
          return this.pingedAt ? this.pingedAt : this.startedAt;
        }
        connectionIsStale() {
          return secondsSince(this.refreshedAt) > this.constructor.staleThreshold;
        }
        disconnectedRecently() {
          return this.disconnectedAt && secondsSince(this.disconnectedAt) < this.constructor.staleThreshold;
        }
        visibilityDidChange() {
          if (document.visibilityState === "visible") {
            setTimeout(
              () => {
                if (this.connectionIsStale() || !this.connection.isOpen()) {
                  logger_default.log(`ConnectionMonitor reopening stale connection on visibilitychange. visibilityState = ${document.visibilityState}`);
                  this.connection.reopen();
                }
              },
              200
            );
          }
        }
      };
      ConnectionMonitor.staleThreshold = 6;
      ConnectionMonitor.reconnectionBackoffRate = 0.15;
      connection_monitor_default = ConnectionMonitor;
    }
  });

  // ../../node_modules/@rails/actioncable/src/internal.js
  var internal_default;
  var init_internal = __esm({
    "../../node_modules/@rails/actioncable/src/internal.js"() {
      internal_default = {
        "message_types": {
          "welcome": "welcome",
          "disconnect": "disconnect",
          "ping": "ping",
          "confirmation": "confirm_subscription",
          "rejection": "reject_subscription"
        },
        "disconnect_reasons": {
          "unauthorized": "unauthorized",
          "invalid_request": "invalid_request",
          "server_restart": "server_restart"
        },
        "default_mount_path": "/cable",
        "protocols": [
          "actioncable-v1-json",
          "actioncable-unsupported"
        ]
      };
    }
  });

  // ../../node_modules/@rails/actioncable/src/connection.js
  var message_types, protocols, supportedProtocols, indexOf, Connection, connection_default;
  var init_connection = __esm({
    "../../node_modules/@rails/actioncable/src/connection.js"() {
      init_adapters();
      init_connection_monitor();
      init_internal();
      init_logger();
      ({ message_types, protocols } = internal_default);
      supportedProtocols = protocols.slice(0, protocols.length - 1);
      indexOf = [].indexOf;
      Connection = class {
        constructor(consumer5) {
          this.open = this.open.bind(this);
          this.consumer = consumer5;
          this.subscriptions = this.consumer.subscriptions;
          this.monitor = new connection_monitor_default(this);
          this.disconnected = true;
        }
        send(data2) {
          if (this.isOpen()) {
            this.webSocket.send(JSON.stringify(data2));
            return true;
          } else {
            return false;
          }
        }
        open() {
          if (this.isActive()) {
            logger_default.log(`Attempted to open WebSocket, but existing socket is ${this.getState()}`);
            return false;
          } else {
            logger_default.log(`Opening WebSocket, current state is ${this.getState()}, subprotocols: ${protocols}`);
            if (this.webSocket) {
              this.uninstallEventHandlers();
            }
            this.webSocket = new adapters_default.WebSocket(this.consumer.url, protocols);
            this.installEventHandlers();
            this.monitor.start();
            return true;
          }
        }
        close({ allowReconnect } = { allowReconnect: true }) {
          if (!allowReconnect) {
            this.monitor.stop();
          }
          if (this.isOpen()) {
            return this.webSocket.close();
          }
        }
        reopen() {
          logger_default.log(`Reopening WebSocket, current state is ${this.getState()}`);
          if (this.isActive()) {
            try {
              return this.close();
            } catch (error4) {
              logger_default.log("Failed to reopen WebSocket", error4);
            } finally {
              logger_default.log(`Reopening WebSocket in ${this.constructor.reopenDelay}ms`);
              setTimeout(this.open, this.constructor.reopenDelay);
            }
          } else {
            return this.open();
          }
        }
        getProtocol() {
          if (this.webSocket) {
            return this.webSocket.protocol;
          }
        }
        isOpen() {
          return this.isState("open");
        }
        isActive() {
          return this.isState("open", "connecting");
        }
        isProtocolSupported() {
          return indexOf.call(supportedProtocols, this.getProtocol()) >= 0;
        }
        isState(...states) {
          return indexOf.call(states, this.getState()) >= 0;
        }
        getState() {
          if (this.webSocket) {
            for (let state in adapters_default.WebSocket) {
              if (adapters_default.WebSocket[state] === this.webSocket.readyState) {
                return state.toLowerCase();
              }
            }
          }
          return null;
        }
        installEventHandlers() {
          for (let eventName in this.events) {
            const handler = this.events[eventName].bind(this);
            this.webSocket[`on${eventName}`] = handler;
          }
        }
        uninstallEventHandlers() {
          for (let eventName in this.events) {
            this.webSocket[`on${eventName}`] = function() {
            };
          }
        }
      };
      Connection.reopenDelay = 500;
      Connection.prototype.events = {
        message(event) {
          if (!this.isProtocolSupported()) {
            return;
          }
          const { identifier, message, reason, reconnect, type } = JSON.parse(event.data);
          switch (type) {
            case message_types.welcome:
              this.monitor.recordConnect();
              return this.subscriptions.reload();
            case message_types.disconnect:
              logger_default.log(`Disconnecting. Reason: ${reason}`);
              return this.close({ allowReconnect: reconnect });
            case message_types.ping:
              return this.monitor.recordPing();
            case message_types.confirmation:
              this.subscriptions.confirmSubscription(identifier);
              return this.subscriptions.notify(identifier, "connected");
            case message_types.rejection:
              return this.subscriptions.reject(identifier);
            default:
              return this.subscriptions.notify(identifier, "received", message);
          }
        },
        open() {
          logger_default.log(`WebSocket onopen event, using '${this.getProtocol()}' subprotocol`);
          this.disconnected = false;
          if (!this.isProtocolSupported()) {
            logger_default.log("Protocol is unsupported. Stopping monitor and disconnecting.");
            return this.close({ allowReconnect: false });
          }
        },
        close(event) {
          logger_default.log("WebSocket onclose event");
          if (this.disconnected) {
            return;
          }
          this.disconnected = true;
          this.monitor.recordDisconnect();
          return this.subscriptions.notifyAll("disconnected", { willAttemptReconnect: this.monitor.isRunning() });
        },
        error() {
          logger_default.log("WebSocket onerror event");
        }
      };
      connection_default = Connection;
    }
  });

  // ../../node_modules/@rails/actioncable/src/subscription.js
  var extend, Subscription;
  var init_subscription = __esm({
    "../../node_modules/@rails/actioncable/src/subscription.js"() {
      extend = function(object, properties) {
        if (properties != null) {
          for (let key in properties) {
            const value = properties[key];
            object[key] = value;
          }
        }
        return object;
      };
      Subscription = class {
        constructor(consumer5, params2 = {}, mixin) {
          this.consumer = consumer5;
          this.identifier = JSON.stringify(params2);
          extend(this, mixin);
        }
        perform(action, data2 = {}) {
          data2.action = action;
          return this.send(data2);
        }
        send(data2) {
          return this.consumer.send({ command: "message", identifier: this.identifier, data: JSON.stringify(data2) });
        }
        unsubscribe() {
          return this.consumer.subscriptions.remove(this);
        }
      };
    }
  });

  // ../../node_modules/@rails/actioncable/src/subscription_guarantor.js
  var SubscriptionGuarantor, subscription_guarantor_default;
  var init_subscription_guarantor = __esm({
    "../../node_modules/@rails/actioncable/src/subscription_guarantor.js"() {
      init_logger();
      SubscriptionGuarantor = class {
        constructor(subscriptions) {
          this.subscriptions = subscriptions;
          this.pendingSubscriptions = [];
        }
        guarantee(subscription) {
          if (this.pendingSubscriptions.indexOf(subscription) == -1) {
            logger_default.log(`SubscriptionGuarantor guaranteeing ${subscription.identifier}`);
            this.pendingSubscriptions.push(subscription);
          } else {
            logger_default.log(`SubscriptionGuarantor already guaranteeing ${subscription.identifier}`);
          }
          this.startGuaranteeing();
        }
        forget(subscription) {
          logger_default.log(`SubscriptionGuarantor forgetting ${subscription.identifier}`);
          this.pendingSubscriptions = this.pendingSubscriptions.filter((s) => s !== subscription);
        }
        startGuaranteeing() {
          this.stopGuaranteeing();
          this.retrySubscribing();
        }
        stopGuaranteeing() {
          clearTimeout(this.retryTimeout);
        }
        retrySubscribing() {
          this.retryTimeout = setTimeout(
            () => {
              if (this.subscriptions && typeof this.subscriptions.subscribe === "function") {
                this.pendingSubscriptions.map((subscription) => {
                  logger_default.log(`SubscriptionGuarantor resubscribing ${subscription.identifier}`);
                  this.subscriptions.subscribe(subscription);
                });
              }
            },
            500
          );
        }
      };
      subscription_guarantor_default = SubscriptionGuarantor;
    }
  });

  // ../../node_modules/@rails/actioncable/src/subscriptions.js
  var Subscriptions;
  var init_subscriptions = __esm({
    "../../node_modules/@rails/actioncable/src/subscriptions.js"() {
      init_subscription();
      init_subscription_guarantor();
      init_logger();
      Subscriptions = class {
        constructor(consumer5) {
          this.consumer = consumer5;
          this.guarantor = new subscription_guarantor_default(this);
          this.subscriptions = [];
        }
        create(channelName, mixin) {
          const channel = channelName;
          const params2 = typeof channel === "object" ? channel : { channel };
          const subscription = new Subscription(this.consumer, params2, mixin);
          return this.add(subscription);
        }
        add(subscription) {
          this.subscriptions.push(subscription);
          this.consumer.ensureActiveConnection();
          this.notify(subscription, "initialized");
          this.subscribe(subscription);
          return subscription;
        }
        remove(subscription) {
          this.forget(subscription);
          if (!this.findAll(subscription.identifier).length) {
            this.sendCommand(subscription, "unsubscribe");
          }
          return subscription;
        }
        reject(identifier) {
          return this.findAll(identifier).map((subscription) => {
            this.forget(subscription);
            this.notify(subscription, "rejected");
            return subscription;
          });
        }
        forget(subscription) {
          this.guarantor.forget(subscription);
          this.subscriptions = this.subscriptions.filter((s) => s !== subscription);
          return subscription;
        }
        findAll(identifier) {
          return this.subscriptions.filter((s) => s.identifier === identifier);
        }
        reload() {
          return this.subscriptions.map((subscription) => this.subscribe(subscription));
        }
        notifyAll(callbackName, ...args) {
          return this.subscriptions.map((subscription) => this.notify(subscription, callbackName, ...args));
        }
        notify(subscription, callbackName, ...args) {
          let subscriptions;
          if (typeof subscription === "string") {
            subscriptions = this.findAll(subscription);
          } else {
            subscriptions = [subscription];
          }
          return subscriptions.map((subscription2) => typeof subscription2[callbackName] === "function" ? subscription2[callbackName](...args) : void 0);
        }
        subscribe(subscription) {
          if (this.sendCommand(subscription, "subscribe")) {
            this.guarantor.guarantee(subscription);
          }
        }
        confirmSubscription(identifier) {
          logger_default.log(`Subscription confirmed ${identifier}`);
          this.findAll(identifier).map((subscription) => this.guarantor.forget(subscription));
        }
        sendCommand(subscription, command) {
          const { identifier } = subscription;
          return this.consumer.send({ command, identifier });
        }
      };
    }
  });

  // ../../node_modules/@rails/actioncable/src/consumer.js
  function createWebSocketURL(url2) {
    if (typeof url2 === "function") {
      url2 = url2();
    }
    if (url2 && !/^wss?:/i.test(url2)) {
      const a = document.createElement("a");
      a.href = url2;
      a.href = a.href;
      a.protocol = a.protocol.replace("http", "ws");
      return a.href;
    } else {
      return url2;
    }
  }
  var Consumer;
  var init_consumer = __esm({
    "../../node_modules/@rails/actioncable/src/consumer.js"() {
      init_connection();
      init_subscriptions();
      Consumer = class {
        constructor(url2) {
          this._url = url2;
          this.subscriptions = new Subscriptions(this);
          this.connection = new connection_default(this);
        }
        get url() {
          return createWebSocketURL(this._url);
        }
        send(data2) {
          return this.connection.send(data2);
        }
        connect() {
          return this.connection.open();
        }
        disconnect() {
          return this.connection.close({ allowReconnect: false });
        }
        ensureActiveConnection() {
          if (!this.connection.isActive()) {
            return this.connection.open();
          }
        }
      };
    }
  });

  // ../../node_modules/@rails/actioncable/src/index.js
  var src_exports = {};
  __export(src_exports, {
    Connection: () => connection_default,
    ConnectionMonitor: () => connection_monitor_default,
    Consumer: () => Consumer,
    INTERNAL: () => internal_default,
    Subscription: () => Subscription,
    SubscriptionGuarantor: () => subscription_guarantor_default,
    Subscriptions: () => Subscriptions,
    adapters: () => adapters_default,
    createConsumer: () => createConsumer,
    createWebSocketURL: () => createWebSocketURL,
    getConfig: () => getConfig,
    logger: () => logger_default
  });
  function createConsumer(url2 = getConfig("url") || internal_default.default_mount_path) {
    return new Consumer(url2);
  }
  function getConfig(name) {
    const element = document.head.querySelector(`meta[name='action-cable-${name}']`);
    if (element) {
      return element.getAttribute("content");
    }
  }
  var init_src = __esm({
    "../../node_modules/@rails/actioncable/src/index.js"() {
      init_connection();
      init_connection_monitor();
      init_consumer();
      init_internal();
      init_subscription();
      init_subscriptions();
      init_subscription_guarantor();
      init_adapters();
      init_logger();
    }
  });

  // ../../node_modules/@hotwired/turbo/dist/turbo.es2017-esm.js
  (function() {
    if (window.Reflect === void 0 || window.customElements === void 0 || window.customElements.polyfillWrapFlushCallback) {
      return;
    }
    const BuiltInHTMLElement = HTMLElement;
    const wrapperForTheName = {
      HTMLElement: function HTMLElement2() {
        return Reflect.construct(BuiltInHTMLElement, [], this.constructor);
      }
    };
    window.HTMLElement = wrapperForTheName["HTMLElement"];
    HTMLElement.prototype = BuiltInHTMLElement.prototype;
    HTMLElement.prototype.constructor = HTMLElement;
    Object.setPrototypeOf(HTMLElement, BuiltInHTMLElement);
  })();
  (function(prototype) {
    if (typeof prototype.requestSubmit == "function")
      return;
    prototype.requestSubmit = function(submitter) {
      if (submitter) {
        validateSubmitter(submitter, this);
        submitter.click();
      } else {
        submitter = document.createElement("input");
        submitter.type = "submit";
        submitter.hidden = true;
        this.appendChild(submitter);
        submitter.click();
        this.removeChild(submitter);
      }
    };
    function validateSubmitter(submitter, form2) {
      submitter instanceof HTMLElement || raise(TypeError, "parameter 1 is not of type 'HTMLElement'");
      submitter.type == "submit" || raise(TypeError, "The specified element is not a submit button");
      submitter.form == form2 || raise(DOMException, "The specified element is not owned by this form element", "NotFoundError");
    }
    function raise(errorConstructor, message, name) {
      throw new errorConstructor("Failed to execute 'requestSubmit' on 'HTMLFormElement': " + message + ".", name);
    }
  })(HTMLFormElement.prototype);
  var submittersByForm = /* @__PURE__ */ new WeakMap();
  function findSubmitterFromClickTarget(target) {
    const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
    const candidate = element ? element.closest("input, button") : null;
    return (candidate === null || candidate === void 0 ? void 0 : candidate.type) == "submit" ? candidate : null;
  }
  function clickCaptured(event) {
    const submitter = findSubmitterFromClickTarget(event.target);
    if (submitter && submitter.form) {
      submittersByForm.set(submitter.form, submitter);
    }
  }
  (function() {
    if ("submitter" in Event.prototype)
      return;
    let prototype;
    if ("SubmitEvent" in window && /Apple Computer/.test(navigator.vendor)) {
      prototype = window.SubmitEvent.prototype;
    } else if ("SubmitEvent" in window) {
      return;
    } else {
      prototype = window.Event.prototype;
    }
    addEventListener("click", clickCaptured, true);
    Object.defineProperty(prototype, "submitter", {
      get() {
        if (this.type == "submit" && this.target instanceof HTMLFormElement) {
          return submittersByForm.get(this.target);
        }
      }
    });
  })();
  var FrameLoadingStyle;
  (function(FrameLoadingStyle2) {
    FrameLoadingStyle2["eager"] = "eager";
    FrameLoadingStyle2["lazy"] = "lazy";
  })(FrameLoadingStyle || (FrameLoadingStyle = {}));
  var FrameElement = class extends HTMLElement {
    constructor() {
      super();
      this.loaded = Promise.resolve();
      this.delegate = new FrameElement.delegateConstructor(this);
    }
    static get observedAttributes() {
      return ["disabled", "complete", "loading", "src"];
    }
    connectedCallback() {
      this.delegate.connect();
    }
    disconnectedCallback() {
      this.delegate.disconnect();
    }
    reload() {
      return this.delegate.sourceURLReloaded();
    }
    attributeChangedCallback(name) {
      if (name == "loading") {
        this.delegate.loadingStyleChanged();
      } else if (name == "complete") {
        this.delegate.completeChanged();
      } else if (name == "src") {
        this.delegate.sourceURLChanged();
      } else {
        this.delegate.disabledChanged();
      }
    }
    get src() {
      return this.getAttribute("src");
    }
    set src(value) {
      if (value) {
        this.setAttribute("src", value);
      } else {
        this.removeAttribute("src");
      }
    }
    get loading() {
      return frameLoadingStyleFromString(this.getAttribute("loading") || "");
    }
    set loading(value) {
      if (value) {
        this.setAttribute("loading", value);
      } else {
        this.removeAttribute("loading");
      }
    }
    get disabled() {
      return this.hasAttribute("disabled");
    }
    set disabled(value) {
      if (value) {
        this.setAttribute("disabled", "");
      } else {
        this.removeAttribute("disabled");
      }
    }
    get autoscroll() {
      return this.hasAttribute("autoscroll");
    }
    set autoscroll(value) {
      if (value) {
        this.setAttribute("autoscroll", "");
      } else {
        this.removeAttribute("autoscroll");
      }
    }
    get complete() {
      return !this.delegate.isLoading;
    }
    get isActive() {
      return this.ownerDocument === document && !this.isPreview;
    }
    get isPreview() {
      var _a2, _b;
      return (_b = (_a2 = this.ownerDocument) === null || _a2 === void 0 ? void 0 : _a2.documentElement) === null || _b === void 0 ? void 0 : _b.hasAttribute("data-turbo-preview");
    }
  };
  function frameLoadingStyleFromString(style) {
    switch (style.toLowerCase()) {
      case "lazy":
        return FrameLoadingStyle.lazy;
      default:
        return FrameLoadingStyle.eager;
    }
  }
  function expandURL(locatable) {
    return new URL(locatable.toString(), document.baseURI);
  }
  function getAnchor(url2) {
    let anchorMatch;
    if (url2.hash) {
      return url2.hash.slice(1);
    } else if (anchorMatch = url2.href.match(/#(.*)$/)) {
      return anchorMatch[1];
    }
  }
  function getAction(form2, submitter) {
    const action = (submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("formaction")) || form2.getAttribute("action") || form2.action;
    return expandURL(action);
  }
  function getExtension(url2) {
    return (getLastPathComponent(url2).match(/\.[^.]*$/) || [])[0] || "";
  }
  function isHTML(url2) {
    return !!getExtension(url2).match(/^(?:|\.(?:htm|html|xhtml|php))$/);
  }
  function isPrefixedBy(baseURL, url2) {
    const prefix2 = getPrefix(url2);
    return baseURL.href === expandURL(prefix2).href || baseURL.href.startsWith(prefix2);
  }
  function locationIsVisitable(location2, rootLocation) {
    return isPrefixedBy(location2, rootLocation) && isHTML(location2);
  }
  function getRequestURL(url2) {
    const anchor = getAnchor(url2);
    return anchor != null ? url2.href.slice(0, -(anchor.length + 1)) : url2.href;
  }
  function toCacheKey(url2) {
    return getRequestURL(url2);
  }
  function urlsAreEqual(left, right) {
    return expandURL(left).href == expandURL(right).href;
  }
  function getPathComponents(url2) {
    return url2.pathname.split("/").slice(1);
  }
  function getLastPathComponent(url2) {
    return getPathComponents(url2).slice(-1)[0];
  }
  function getPrefix(url2) {
    return addTrailingSlash(url2.origin + url2.pathname);
  }
  function addTrailingSlash(value) {
    return value.endsWith("/") ? value : value + "/";
  }
  var FetchResponse = class {
    constructor(response) {
      this.response = response;
    }
    get succeeded() {
      return this.response.ok;
    }
    get failed() {
      return !this.succeeded;
    }
    get clientError() {
      return this.statusCode >= 400 && this.statusCode <= 499;
    }
    get serverError() {
      return this.statusCode >= 500 && this.statusCode <= 599;
    }
    get redirected() {
      return this.response.redirected;
    }
    get location() {
      return expandURL(this.response.url);
    }
    get isHTML() {
      return this.contentType && this.contentType.match(/^(?:text\/([^\s;,]+\b)?html|application\/xhtml\+xml)\b/);
    }
    get statusCode() {
      return this.response.status;
    }
    get contentType() {
      return this.header("Content-Type");
    }
    get responseText() {
      return this.response.clone().text();
    }
    get responseHTML() {
      if (this.isHTML) {
        return this.response.clone().text();
      } else {
        return Promise.resolve(void 0);
      }
    }
    header(name) {
      return this.response.headers.get(name);
    }
  };
  function isAction(action) {
    return action == "advance" || action == "replace" || action == "restore";
  }
  function activateScriptElement(element) {
    if (element.getAttribute("data-turbo-eval") == "false") {
      return element;
    } else {
      const createdScriptElement = document.createElement("script");
      const cspNonce2 = getMetaContent("csp-nonce");
      if (cspNonce2) {
        createdScriptElement.nonce = cspNonce2;
      }
      createdScriptElement.textContent = element.textContent;
      createdScriptElement.async = false;
      copyElementAttributes(createdScriptElement, element);
      return createdScriptElement;
    }
  }
  function copyElementAttributes(destinationElement, sourceElement) {
    for (const { name, value } of sourceElement.attributes) {
      destinationElement.setAttribute(name, value);
    }
  }
  function createDocumentFragment(html) {
    const template2 = document.createElement("template");
    template2.innerHTML = html;
    return template2.content;
  }
  function dispatch(eventName, { target, cancelable, detail } = {}) {
    const event = new CustomEvent(eventName, {
      cancelable,
      bubbles: true,
      detail
    });
    if (target && target.isConnected) {
      target.dispatchEvent(event);
    } else {
      document.documentElement.dispatchEvent(event);
    }
    return event;
  }
  function nextAnimationFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }
  function nextEventLoopTick() {
    return new Promise((resolve) => setTimeout(() => resolve(), 0));
  }
  function nextMicrotask() {
    return Promise.resolve();
  }
  function parseHTMLDocument(html = "") {
    return new DOMParser().parseFromString(html, "text/html");
  }
  function unindent(strings, ...values) {
    const lines = interpolate(strings, values).replace(/^\n/, "").split("\n");
    const match = lines[0].match(/^\s+/);
    const indent = match ? match[0].length : 0;
    return lines.map((line) => line.slice(indent)).join("\n");
  }
  function interpolate(strings, values) {
    return strings.reduce((result, string, i) => {
      const value = values[i] == void 0 ? "" : values[i];
      return result + string + value;
    }, "");
  }
  function uuid() {
    return Array.from({ length: 36 }).map((_, i) => {
      if (i == 8 || i == 13 || i == 18 || i == 23) {
        return "-";
      } else if (i == 14) {
        return "4";
      } else if (i == 19) {
        return (Math.floor(Math.random() * 4) + 8).toString(16);
      } else {
        return Math.floor(Math.random() * 15).toString(16);
      }
    }).join("");
  }
  function getAttribute(attributeName, ...elements) {
    for (const value of elements.map((element) => element === null || element === void 0 ? void 0 : element.getAttribute(attributeName))) {
      if (typeof value == "string")
        return value;
    }
    return null;
  }
  function hasAttribute(attributeName, ...elements) {
    return elements.some((element) => element && element.hasAttribute(attributeName));
  }
  function markAsBusy(...elements) {
    for (const element of elements) {
      if (element.localName == "turbo-frame") {
        element.setAttribute("busy", "");
      }
      element.setAttribute("aria-busy", "true");
    }
  }
  function clearBusyState(...elements) {
    for (const element of elements) {
      if (element.localName == "turbo-frame") {
        element.removeAttribute("busy");
      }
      element.removeAttribute("aria-busy");
    }
  }
  function waitForLoad(element, timeoutInMilliseconds = 2e3) {
    return new Promise((resolve) => {
      const onComplete = () => {
        element.removeEventListener("error", onComplete);
        element.removeEventListener("load", onComplete);
        resolve();
      };
      element.addEventListener("load", onComplete, { once: true });
      element.addEventListener("error", onComplete, { once: true });
      setTimeout(resolve, timeoutInMilliseconds);
    });
  }
  function getHistoryMethodForAction(action) {
    switch (action) {
      case "replace":
        return history.replaceState;
      case "advance":
      case "restore":
        return history.pushState;
    }
  }
  function getVisitAction(...elements) {
    const action = getAttribute("data-turbo-action", ...elements);
    return isAction(action) ? action : null;
  }
  function getMetaElement(name) {
    return document.querySelector(`meta[name="${name}"]`);
  }
  function getMetaContent(name) {
    const element = getMetaElement(name);
    return element && element.content;
  }
  function setMetaContent(name, content) {
    let element = getMetaElement(name);
    if (!element) {
      element = document.createElement("meta");
      element.setAttribute("name", name);
      document.head.appendChild(element);
    }
    element.setAttribute("content", content);
    return element;
  }
  var FetchMethod;
  (function(FetchMethod2) {
    FetchMethod2[FetchMethod2["get"] = 0] = "get";
    FetchMethod2[FetchMethod2["post"] = 1] = "post";
    FetchMethod2[FetchMethod2["put"] = 2] = "put";
    FetchMethod2[FetchMethod2["patch"] = 3] = "patch";
    FetchMethod2[FetchMethod2["delete"] = 4] = "delete";
  })(FetchMethod || (FetchMethod = {}));
  function fetchMethodFromString(method2) {
    switch (method2.toLowerCase()) {
      case "get":
        return FetchMethod.get;
      case "post":
        return FetchMethod.post;
      case "put":
        return FetchMethod.put;
      case "patch":
        return FetchMethod.patch;
      case "delete":
        return FetchMethod.delete;
    }
  }
  var FetchRequest = class {
    constructor(delegate2, method2, location2, body = new URLSearchParams(), target = null) {
      this.abortController = new AbortController();
      this.resolveRequestPromise = (_value) => {
      };
      this.delegate = delegate2;
      this.method = method2;
      this.headers = this.defaultHeaders;
      this.body = body;
      this.url = location2;
      this.target = target;
    }
    get location() {
      return this.url;
    }
    get params() {
      return this.url.searchParams;
    }
    get entries() {
      return this.body ? Array.from(this.body.entries()) : [];
    }
    cancel() {
      this.abortController.abort();
    }
    async perform() {
      var _a2, _b;
      const { fetchOptions } = this;
      (_b = (_a2 = this.delegate).prepareHeadersForRequest) === null || _b === void 0 ? void 0 : _b.call(_a2, this.headers, this);
      await this.allowRequestToBeIntercepted(fetchOptions);
      try {
        this.delegate.requestStarted(this);
        const response = await fetch(this.url.href, fetchOptions);
        return await this.receive(response);
      } catch (error4) {
        if (error4.name !== "AbortError") {
          if (this.willDelegateErrorHandling(error4)) {
            this.delegate.requestErrored(this, error4);
          }
          throw error4;
        }
      } finally {
        this.delegate.requestFinished(this);
      }
    }
    async receive(response) {
      const fetchResponse = new FetchResponse(response);
      const event = dispatch("turbo:before-fetch-response", {
        cancelable: true,
        detail: { fetchResponse },
        target: this.target
      });
      if (event.defaultPrevented) {
        this.delegate.requestPreventedHandlingResponse(this, fetchResponse);
      } else if (fetchResponse.succeeded) {
        this.delegate.requestSucceededWithResponse(this, fetchResponse);
      } else {
        this.delegate.requestFailedWithResponse(this, fetchResponse);
      }
      return fetchResponse;
    }
    get fetchOptions() {
      var _a2;
      return {
        method: FetchMethod[this.method].toUpperCase(),
        credentials: "same-origin",
        headers: this.headers,
        redirect: "follow",
        body: this.isIdempotent ? null : this.body,
        signal: this.abortSignal,
        referrer: (_a2 = this.delegate.referrer) === null || _a2 === void 0 ? void 0 : _a2.href
      };
    }
    get defaultHeaders() {
      return {
        Accept: "text/html, application/xhtml+xml"
      };
    }
    get isIdempotent() {
      return this.method == FetchMethod.get;
    }
    get abortSignal() {
      return this.abortController.signal;
    }
    acceptResponseType(mimeType) {
      this.headers["Accept"] = [mimeType, this.headers["Accept"]].join(", ");
    }
    async allowRequestToBeIntercepted(fetchOptions) {
      const requestInterception = new Promise((resolve) => this.resolveRequestPromise = resolve);
      const event = dispatch("turbo:before-fetch-request", {
        cancelable: true,
        detail: {
          fetchOptions,
          url: this.url,
          resume: this.resolveRequestPromise
        },
        target: this.target
      });
      if (event.defaultPrevented)
        await requestInterception;
    }
    willDelegateErrorHandling(error4) {
      const event = dispatch("turbo:fetch-request-error", {
        target: this.target,
        cancelable: true,
        detail: { request: this, error: error4 }
      });
      return !event.defaultPrevented;
    }
  };
  var AppearanceObserver = class {
    constructor(delegate2, element) {
      this.started = false;
      this.intersect = (entries2) => {
        const lastEntry = entries2.slice(-1)[0];
        if (lastEntry === null || lastEntry === void 0 ? void 0 : lastEntry.isIntersecting) {
          this.delegate.elementAppearedInViewport(this.element);
        }
      };
      this.delegate = delegate2;
      this.element = element;
      this.intersectionObserver = new IntersectionObserver(this.intersect);
    }
    start() {
      if (!this.started) {
        this.started = true;
        this.intersectionObserver.observe(this.element);
      }
    }
    stop() {
      if (this.started) {
        this.started = false;
        this.intersectionObserver.unobserve(this.element);
      }
    }
  };
  var StreamMessage = class {
    constructor(fragment) {
      this.fragment = importStreamElements(fragment);
    }
    static wrap(message) {
      if (typeof message == "string") {
        return new this(createDocumentFragment(message));
      } else {
        return message;
      }
    }
  };
  StreamMessage.contentType = "text/vnd.turbo-stream.html";
  function importStreamElements(fragment) {
    for (const element of fragment.querySelectorAll("turbo-stream")) {
      const streamElement = document.importNode(element, true);
      for (const inertScriptElement of streamElement.templateElement.content.querySelectorAll("script")) {
        inertScriptElement.replaceWith(activateScriptElement(inertScriptElement));
      }
      element.replaceWith(streamElement);
    }
    return fragment;
  }
  var FormSubmissionState;
  (function(FormSubmissionState2) {
    FormSubmissionState2[FormSubmissionState2["initialized"] = 0] = "initialized";
    FormSubmissionState2[FormSubmissionState2["requesting"] = 1] = "requesting";
    FormSubmissionState2[FormSubmissionState2["waiting"] = 2] = "waiting";
    FormSubmissionState2[FormSubmissionState2["receiving"] = 3] = "receiving";
    FormSubmissionState2[FormSubmissionState2["stopping"] = 4] = "stopping";
    FormSubmissionState2[FormSubmissionState2["stopped"] = 5] = "stopped";
  })(FormSubmissionState || (FormSubmissionState = {}));
  var FormEnctype;
  (function(FormEnctype2) {
    FormEnctype2["urlEncoded"] = "application/x-www-form-urlencoded";
    FormEnctype2["multipart"] = "multipart/form-data";
    FormEnctype2["plain"] = "text/plain";
  })(FormEnctype || (FormEnctype = {}));
  function formEnctypeFromString(encoding) {
    switch (encoding.toLowerCase()) {
      case FormEnctype.multipart:
        return FormEnctype.multipart;
      case FormEnctype.plain:
        return FormEnctype.plain;
      default:
        return FormEnctype.urlEncoded;
    }
  }
  var FormSubmission = class {
    constructor(delegate2, formElement, submitter, mustRedirect = false) {
      this.state = FormSubmissionState.initialized;
      this.delegate = delegate2;
      this.formElement = formElement;
      this.submitter = submitter;
      this.formData = buildFormData(formElement, submitter);
      this.location = expandURL(this.action);
      if (this.method == FetchMethod.get) {
        mergeFormDataEntries(this.location, [...this.body.entries()]);
      }
      this.fetchRequest = new FetchRequest(this, this.method, this.location, this.body, this.formElement);
      this.mustRedirect = mustRedirect;
    }
    static confirmMethod(message, _element, _submitter) {
      return Promise.resolve(confirm(message));
    }
    get method() {
      var _a2;
      const method2 = ((_a2 = this.submitter) === null || _a2 === void 0 ? void 0 : _a2.getAttribute("formmethod")) || this.formElement.getAttribute("method") || "";
      return fetchMethodFromString(method2.toLowerCase()) || FetchMethod.get;
    }
    get action() {
      var _a2;
      const formElementAction = typeof this.formElement.action === "string" ? this.formElement.action : null;
      if ((_a2 = this.submitter) === null || _a2 === void 0 ? void 0 : _a2.hasAttribute("formaction")) {
        return this.submitter.getAttribute("formaction") || "";
      } else {
        return this.formElement.getAttribute("action") || formElementAction || "";
      }
    }
    get body() {
      if (this.enctype == FormEnctype.urlEncoded || this.method == FetchMethod.get) {
        return new URLSearchParams(this.stringFormData);
      } else {
        return this.formData;
      }
    }
    get enctype() {
      var _a2;
      return formEnctypeFromString(((_a2 = this.submitter) === null || _a2 === void 0 ? void 0 : _a2.getAttribute("formenctype")) || this.formElement.enctype);
    }
    get isIdempotent() {
      return this.fetchRequest.isIdempotent;
    }
    get stringFormData() {
      return [...this.formData].reduce((entries2, [name, value]) => {
        return entries2.concat(typeof value == "string" ? [[name, value]] : []);
      }, []);
    }
    async start() {
      const { initialized, requesting } = FormSubmissionState;
      const confirmationMessage = getAttribute("data-turbo-confirm", this.submitter, this.formElement);
      if (typeof confirmationMessage === "string") {
        const answer = await FormSubmission.confirmMethod(confirmationMessage, this.formElement, this.submitter);
        if (!answer) {
          return;
        }
      }
      if (this.state == initialized) {
        this.state = requesting;
        return this.fetchRequest.perform();
      }
    }
    stop() {
      const { stopping, stopped } = FormSubmissionState;
      if (this.state != stopping && this.state != stopped) {
        this.state = stopping;
        this.fetchRequest.cancel();
        return true;
      }
    }
    prepareHeadersForRequest(headers, request2) {
      if (!request2.isIdempotent) {
        const token = getCookieValue(getMetaContent("csrf-param")) || getMetaContent("csrf-token");
        if (token) {
          headers["X-CSRF-Token"] = token;
        }
      }
      if (this.requestAcceptsTurboStreamResponse(request2)) {
        request2.acceptResponseType(StreamMessage.contentType);
      }
    }
    requestStarted(_request) {
      var _a2;
      this.state = FormSubmissionState.waiting;
      (_a2 = this.submitter) === null || _a2 === void 0 ? void 0 : _a2.setAttribute("disabled", "");
      dispatch("turbo:submit-start", {
        target: this.formElement,
        detail: { formSubmission: this }
      });
      this.delegate.formSubmissionStarted(this);
    }
    requestPreventedHandlingResponse(request2, response) {
      this.result = { success: response.succeeded, fetchResponse: response };
    }
    requestSucceededWithResponse(request2, response) {
      if (response.clientError || response.serverError) {
        this.delegate.formSubmissionFailedWithResponse(this, response);
      } else if (this.requestMustRedirect(request2) && responseSucceededWithoutRedirect(response)) {
        const error4 = new Error("Form responses must redirect to another location");
        this.delegate.formSubmissionErrored(this, error4);
      } else {
        this.state = FormSubmissionState.receiving;
        this.result = { success: true, fetchResponse: response };
        this.delegate.formSubmissionSucceededWithResponse(this, response);
      }
    }
    requestFailedWithResponse(request2, response) {
      this.result = { success: false, fetchResponse: response };
      this.delegate.formSubmissionFailedWithResponse(this, response);
    }
    requestErrored(request2, error4) {
      this.result = { success: false, error: error4 };
      this.delegate.formSubmissionErrored(this, error4);
    }
    requestFinished(_request) {
      var _a2;
      this.state = FormSubmissionState.stopped;
      (_a2 = this.submitter) === null || _a2 === void 0 ? void 0 : _a2.removeAttribute("disabled");
      dispatch("turbo:submit-end", {
        target: this.formElement,
        detail: Object.assign({ formSubmission: this }, this.result)
      });
      this.delegate.formSubmissionFinished(this);
    }
    requestMustRedirect(request2) {
      return !request2.isIdempotent && this.mustRedirect;
    }
    requestAcceptsTurboStreamResponse(request2) {
      return !request2.isIdempotent || hasAttribute("data-turbo-stream", this.submitter, this.formElement);
    }
  };
  function buildFormData(formElement, submitter) {
    const formData = new FormData(formElement);
    const name = submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("name");
    const value = submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("value");
    if (name) {
      formData.append(name, value || "");
    }
    return formData;
  }
  function getCookieValue(cookieName) {
    if (cookieName != null) {
      const cookies = document.cookie ? document.cookie.split("; ") : [];
      const cookie = cookies.find((cookie2) => cookie2.startsWith(cookieName));
      if (cookie) {
        const value = cookie.split("=").slice(1).join("=");
        return value ? decodeURIComponent(value) : void 0;
      }
    }
  }
  function responseSucceededWithoutRedirect(response) {
    return response.statusCode == 200 && !response.redirected;
  }
  function mergeFormDataEntries(url2, entries2) {
    const searchParams = new URLSearchParams();
    for (const [name, value] of entries2) {
      if (value instanceof File)
        continue;
      searchParams.append(name, value);
    }
    url2.search = searchParams.toString();
    return url2;
  }
  var Snapshot = class {
    constructor(element) {
      this.element = element;
    }
    get activeElement() {
      return this.element.ownerDocument.activeElement;
    }
    get children() {
      return [...this.element.children];
    }
    hasAnchor(anchor) {
      return this.getElementForAnchor(anchor) != null;
    }
    getElementForAnchor(anchor) {
      return anchor ? this.element.querySelector(`[id='${anchor}'], a[name='${anchor}']`) : null;
    }
    get isConnected() {
      return this.element.isConnected;
    }
    get firstAutofocusableElement() {
      const inertDisabledOrHidden = "[inert], :disabled, [hidden], details:not([open]), dialog:not([open])";
      for (const element of this.element.querySelectorAll("[autofocus]")) {
        if (element.closest(inertDisabledOrHidden) == null)
          return element;
        else
          continue;
      }
      return null;
    }
    get permanentElements() {
      return queryPermanentElementsAll(this.element);
    }
    getPermanentElementById(id) {
      return getPermanentElementById(this.element, id);
    }
    getPermanentElementMapForSnapshot(snapshot) {
      const permanentElementMap = {};
      for (const currentPermanentElement of this.permanentElements) {
        const { id } = currentPermanentElement;
        const newPermanentElement = snapshot.getPermanentElementById(id);
        if (newPermanentElement) {
          permanentElementMap[id] = [currentPermanentElement, newPermanentElement];
        }
      }
      return permanentElementMap;
    }
  };
  function getPermanentElementById(node, id) {
    return node.querySelector(`#${id}[data-turbo-permanent]`);
  }
  function queryPermanentElementsAll(node) {
    return node.querySelectorAll("[id][data-turbo-permanent]");
  }
  var FormSubmitObserver = class {
    constructor(delegate2, eventTarget) {
      this.started = false;
      this.submitCaptured = () => {
        this.eventTarget.removeEventListener("submit", this.submitBubbled, false);
        this.eventTarget.addEventListener("submit", this.submitBubbled, false);
      };
      this.submitBubbled = (event) => {
        if (!event.defaultPrevented) {
          const form2 = event.target instanceof HTMLFormElement ? event.target : void 0;
          const submitter = event.submitter || void 0;
          if (form2 && submissionDoesNotDismissDialog(form2, submitter) && submissionDoesNotTargetIFrame(form2, submitter) && this.delegate.willSubmitForm(form2, submitter)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.delegate.formSubmitted(form2, submitter);
          }
        }
      };
      this.delegate = delegate2;
      this.eventTarget = eventTarget;
    }
    start() {
      if (!this.started) {
        this.eventTarget.addEventListener("submit", this.submitCaptured, true);
        this.started = true;
      }
    }
    stop() {
      if (this.started) {
        this.eventTarget.removeEventListener("submit", this.submitCaptured, true);
        this.started = false;
      }
    }
  };
  function submissionDoesNotDismissDialog(form2, submitter) {
    const method2 = (submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("formmethod")) || form2.getAttribute("method");
    return method2 != "dialog";
  }
  function submissionDoesNotTargetIFrame(form2, submitter) {
    const target = (submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("formtarget")) || form2.target;
    for (const element of document.getElementsByName(target)) {
      if (element instanceof HTMLIFrameElement)
        return false;
    }
    return true;
  }
  var View = class {
    constructor(delegate2, element) {
      this.resolveRenderPromise = (_value) => {
      };
      this.resolveInterceptionPromise = (_value) => {
      };
      this.delegate = delegate2;
      this.element = element;
    }
    scrollToAnchor(anchor) {
      const element = this.snapshot.getElementForAnchor(anchor);
      if (element) {
        this.scrollToElement(element);
        this.focusElement(element);
      } else {
        this.scrollToPosition({ x: 0, y: 0 });
      }
    }
    scrollToAnchorFromLocation(location2) {
      this.scrollToAnchor(getAnchor(location2));
    }
    scrollToElement(element) {
      element.scrollIntoView();
    }
    focusElement(element) {
      if (element instanceof HTMLElement) {
        if (element.hasAttribute("tabindex")) {
          element.focus();
        } else {
          element.setAttribute("tabindex", "-1");
          element.focus();
          element.removeAttribute("tabindex");
        }
      }
    }
    scrollToPosition({ x, y }) {
      this.scrollRoot.scrollTo(x, y);
    }
    scrollToTop() {
      this.scrollToPosition({ x: 0, y: 0 });
    }
    get scrollRoot() {
      return window;
    }
    async render(renderer) {
      const { isPreview, shouldRender, newSnapshot: snapshot } = renderer;
      if (shouldRender) {
        try {
          this.renderPromise = new Promise((resolve) => this.resolveRenderPromise = resolve);
          this.renderer = renderer;
          await this.prepareToRenderSnapshot(renderer);
          const renderInterception = new Promise((resolve) => this.resolveInterceptionPromise = resolve);
          const options = { resume: this.resolveInterceptionPromise, render: this.renderer.renderElement };
          const immediateRender = this.delegate.allowsImmediateRender(snapshot, options);
          if (!immediateRender)
            await renderInterception;
          await this.renderSnapshot(renderer);
          this.delegate.viewRenderedSnapshot(snapshot, isPreview);
          this.delegate.preloadOnLoadLinksForView(this.element);
          this.finishRenderingSnapshot(renderer);
        } finally {
          delete this.renderer;
          this.resolveRenderPromise(void 0);
          delete this.renderPromise;
        }
      } else {
        this.invalidate(renderer.reloadReason);
      }
    }
    invalidate(reason) {
      this.delegate.viewInvalidated(reason);
    }
    async prepareToRenderSnapshot(renderer) {
      this.markAsPreview(renderer.isPreview);
      await renderer.prepareToRender();
    }
    markAsPreview(isPreview) {
      if (isPreview) {
        this.element.setAttribute("data-turbo-preview", "");
      } else {
        this.element.removeAttribute("data-turbo-preview");
      }
    }
    async renderSnapshot(renderer) {
      await renderer.render();
    }
    finishRenderingSnapshot(renderer) {
      renderer.finishRendering();
    }
  };
  var FrameView = class extends View {
    invalidate() {
      this.element.innerHTML = "";
    }
    get snapshot() {
      return new Snapshot(this.element);
    }
  };
  var LinkInterceptor = class {
    constructor(delegate2, element) {
      this.clickBubbled = (event) => {
        if (this.respondsToEventTarget(event.target)) {
          this.clickEvent = event;
        } else {
          delete this.clickEvent;
        }
      };
      this.linkClicked = (event) => {
        if (this.clickEvent && this.respondsToEventTarget(event.target) && event.target instanceof Element) {
          if (this.delegate.shouldInterceptLinkClick(event.target, event.detail.url, event.detail.originalEvent)) {
            this.clickEvent.preventDefault();
            event.preventDefault();
            this.delegate.linkClickIntercepted(event.target, event.detail.url, event.detail.originalEvent);
          }
        }
        delete this.clickEvent;
      };
      this.willVisit = (_event) => {
        delete this.clickEvent;
      };
      this.delegate = delegate2;
      this.element = element;
    }
    start() {
      this.element.addEventListener("click", this.clickBubbled);
      document.addEventListener("turbo:click", this.linkClicked);
      document.addEventListener("turbo:before-visit", this.willVisit);
    }
    stop() {
      this.element.removeEventListener("click", this.clickBubbled);
      document.removeEventListener("turbo:click", this.linkClicked);
      document.removeEventListener("turbo:before-visit", this.willVisit);
    }
    respondsToEventTarget(target) {
      const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
      return element && element.closest("turbo-frame, html") == this.element;
    }
  };
  var LinkClickObserver = class {
    constructor(delegate2, eventTarget) {
      this.started = false;
      this.clickCaptured = () => {
        this.eventTarget.removeEventListener("click", this.clickBubbled, false);
        this.eventTarget.addEventListener("click", this.clickBubbled, false);
      };
      this.clickBubbled = (event) => {
        if (event instanceof MouseEvent && this.clickEventIsSignificant(event)) {
          const target = event.composedPath && event.composedPath()[0] || event.target;
          const link2 = this.findLinkFromClickTarget(target);
          if (link2 && doesNotTargetIFrame(link2)) {
            const location2 = this.getLocationForLink(link2);
            if (this.delegate.willFollowLinkToLocation(link2, location2, event)) {
              event.preventDefault();
              this.delegate.followedLinkToLocation(link2, location2);
            }
          }
        }
      };
      this.delegate = delegate2;
      this.eventTarget = eventTarget;
    }
    start() {
      if (!this.started) {
        this.eventTarget.addEventListener("click", this.clickCaptured, true);
        this.started = true;
      }
    }
    stop() {
      if (this.started) {
        this.eventTarget.removeEventListener("click", this.clickCaptured, true);
        this.started = false;
      }
    }
    clickEventIsSignificant(event) {
      return !(event.target && event.target.isContentEditable || event.defaultPrevented || event.which > 1 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey);
    }
    findLinkFromClickTarget(target) {
      if (target instanceof Element) {
        return target.closest("a[href]:not([target^=_]):not([download])");
      }
    }
    getLocationForLink(link2) {
      return expandURL(link2.getAttribute("href") || "");
    }
  };
  function doesNotTargetIFrame(anchor) {
    for (const element of document.getElementsByName(anchor.target)) {
      if (element instanceof HTMLIFrameElement)
        return false;
    }
    return true;
  }
  var FormLinkClickObserver = class {
    constructor(delegate2, element) {
      this.delegate = delegate2;
      this.linkInterceptor = new LinkClickObserver(this, element);
    }
    start() {
      this.linkInterceptor.start();
    }
    stop() {
      this.linkInterceptor.stop();
    }
    willFollowLinkToLocation(link2, location2, originalEvent) {
      return this.delegate.willSubmitFormLinkToLocation(link2, location2, originalEvent) && link2.hasAttribute("data-turbo-method");
    }
    followedLinkToLocation(link2, location2) {
      const action = location2.href;
      const form2 = document.createElement("form");
      form2.setAttribute("data-turbo", "true");
      form2.setAttribute("action", action);
      form2.setAttribute("hidden", "");
      const method2 = link2.getAttribute("data-turbo-method");
      if (method2)
        form2.setAttribute("method", method2);
      const turboFrame = link2.getAttribute("data-turbo-frame");
      if (turboFrame)
        form2.setAttribute("data-turbo-frame", turboFrame);
      const turboAction = link2.getAttribute("data-turbo-action");
      if (turboAction)
        form2.setAttribute("data-turbo-action", turboAction);
      const turboConfirm = link2.getAttribute("data-turbo-confirm");
      if (turboConfirm)
        form2.setAttribute("data-turbo-confirm", turboConfirm);
      const turboStream = link2.hasAttribute("data-turbo-stream");
      if (turboStream)
        form2.setAttribute("data-turbo-stream", "");
      this.delegate.submittedFormLinkToLocation(link2, location2, form2);
      document.body.appendChild(form2);
      form2.addEventListener("turbo:submit-end", () => form2.remove(), { once: true });
      requestAnimationFrame(() => form2.requestSubmit());
    }
  };
  var Bardo = class {
    constructor(delegate2, permanentElementMap) {
      this.delegate = delegate2;
      this.permanentElementMap = permanentElementMap;
    }
    static preservingPermanentElements(delegate2, permanentElementMap, callback) {
      const bardo = new this(delegate2, permanentElementMap);
      bardo.enter();
      callback();
      bardo.leave();
    }
    enter() {
      for (const id in this.permanentElementMap) {
        const [currentPermanentElement, newPermanentElement] = this.permanentElementMap[id];
        this.delegate.enteringBardo(currentPermanentElement, newPermanentElement);
        this.replaceNewPermanentElementWithPlaceholder(newPermanentElement);
      }
    }
    leave() {
      for (const id in this.permanentElementMap) {
        const [currentPermanentElement] = this.permanentElementMap[id];
        this.replaceCurrentPermanentElementWithClone(currentPermanentElement);
        this.replacePlaceholderWithPermanentElement(currentPermanentElement);
        this.delegate.leavingBardo(currentPermanentElement);
      }
    }
    replaceNewPermanentElementWithPlaceholder(permanentElement) {
      const placeholder = createPlaceholderForPermanentElement(permanentElement);
      permanentElement.replaceWith(placeholder);
    }
    replaceCurrentPermanentElementWithClone(permanentElement) {
      const clone = permanentElement.cloneNode(true);
      permanentElement.replaceWith(clone);
    }
    replacePlaceholderWithPermanentElement(permanentElement) {
      const placeholder = this.getPlaceholderById(permanentElement.id);
      placeholder === null || placeholder === void 0 ? void 0 : placeholder.replaceWith(permanentElement);
    }
    getPlaceholderById(id) {
      return this.placeholders.find((element) => element.content == id);
    }
    get placeholders() {
      return [...document.querySelectorAll("meta[name=turbo-permanent-placeholder][content]")];
    }
  };
  function createPlaceholderForPermanentElement(permanentElement) {
    const element = document.createElement("meta");
    element.setAttribute("name", "turbo-permanent-placeholder");
    element.setAttribute("content", permanentElement.id);
    return element;
  }
  var Renderer = class {
    constructor(currentSnapshot, newSnapshot, renderElement, isPreview, willRender = true) {
      this.activeElement = null;
      this.currentSnapshot = currentSnapshot;
      this.newSnapshot = newSnapshot;
      this.isPreview = isPreview;
      this.willRender = willRender;
      this.renderElement = renderElement;
      this.promise = new Promise((resolve, reject) => this.resolvingFunctions = { resolve, reject });
    }
    get shouldRender() {
      return true;
    }
    get reloadReason() {
      return;
    }
    prepareToRender() {
      return;
    }
    finishRendering() {
      if (this.resolvingFunctions) {
        this.resolvingFunctions.resolve();
        delete this.resolvingFunctions;
      }
    }
    preservingPermanentElements(callback) {
      Bardo.preservingPermanentElements(this, this.permanentElementMap, callback);
    }
    focusFirstAutofocusableElement() {
      const element = this.connectedSnapshot.firstAutofocusableElement;
      if (elementIsFocusable(element)) {
        element.focus();
      }
    }
    enteringBardo(currentPermanentElement) {
      if (this.activeElement)
        return;
      if (currentPermanentElement.contains(this.currentSnapshot.activeElement)) {
        this.activeElement = this.currentSnapshot.activeElement;
      }
    }
    leavingBardo(currentPermanentElement) {
      if (currentPermanentElement.contains(this.activeElement) && this.activeElement instanceof HTMLElement) {
        this.activeElement.focus();
        this.activeElement = null;
      }
    }
    get connectedSnapshot() {
      return this.newSnapshot.isConnected ? this.newSnapshot : this.currentSnapshot;
    }
    get currentElement() {
      return this.currentSnapshot.element;
    }
    get newElement() {
      return this.newSnapshot.element;
    }
    get permanentElementMap() {
      return this.currentSnapshot.getPermanentElementMapForSnapshot(this.newSnapshot);
    }
  };
  function elementIsFocusable(element) {
    return element && typeof element.focus == "function";
  }
  var FrameRenderer = class extends Renderer {
    constructor(delegate2, currentSnapshot, newSnapshot, renderElement, isPreview, willRender = true) {
      super(currentSnapshot, newSnapshot, renderElement, isPreview, willRender);
      this.delegate = delegate2;
    }
    static renderElement(currentElement, newElement) {
      var _a2;
      const destinationRange = document.createRange();
      destinationRange.selectNodeContents(currentElement);
      destinationRange.deleteContents();
      const frameElement = newElement;
      const sourceRange = (_a2 = frameElement.ownerDocument) === null || _a2 === void 0 ? void 0 : _a2.createRange();
      if (sourceRange) {
        sourceRange.selectNodeContents(frameElement);
        currentElement.appendChild(sourceRange.extractContents());
      }
    }
    get shouldRender() {
      return true;
    }
    async render() {
      await nextAnimationFrame();
      this.preservingPermanentElements(() => {
        this.loadFrameElement();
      });
      this.scrollFrameIntoView();
      await nextAnimationFrame();
      this.focusFirstAutofocusableElement();
      await nextAnimationFrame();
      this.activateScriptElements();
    }
    loadFrameElement() {
      this.delegate.willRenderFrame(this.currentElement, this.newElement);
      this.renderElement(this.currentElement, this.newElement);
    }
    scrollFrameIntoView() {
      if (this.currentElement.autoscroll || this.newElement.autoscroll) {
        const element = this.currentElement.firstElementChild;
        const block = readScrollLogicalPosition(this.currentElement.getAttribute("data-autoscroll-block"), "end");
        const behavior = readScrollBehavior(this.currentElement.getAttribute("data-autoscroll-behavior"), "auto");
        if (element) {
          element.scrollIntoView({ block, behavior });
          return true;
        }
      }
      return false;
    }
    activateScriptElements() {
      for (const inertScriptElement of this.newScriptElements) {
        const activatedScriptElement = activateScriptElement(inertScriptElement);
        inertScriptElement.replaceWith(activatedScriptElement);
      }
    }
    get newScriptElements() {
      return this.currentElement.querySelectorAll("script");
    }
  };
  function readScrollLogicalPosition(value, defaultValue) {
    if (value == "end" || value == "start" || value == "center" || value == "nearest") {
      return value;
    } else {
      return defaultValue;
    }
  }
  function readScrollBehavior(value, defaultValue) {
    if (value == "auto" || value == "smooth") {
      return value;
    } else {
      return defaultValue;
    }
  }
  var ProgressBar = class {
    constructor() {
      this.hiding = false;
      this.value = 0;
      this.visible = false;
      this.trickle = () => {
        this.setValue(this.value + Math.random() / 100);
      };
      this.stylesheetElement = this.createStylesheetElement();
      this.progressElement = this.createProgressElement();
      this.installStylesheetElement();
      this.setValue(0);
    }
    static get defaultCSS() {
      return unindent`
      .turbo-progress-bar {
        position: fixed;
        display: block;
        top: 0;
        left: 0;
        height: 3px;
        background: #0076ff;
        z-index: 2147483647;
        transition:
          width ${ProgressBar.animationDuration}ms ease-out,
          opacity ${ProgressBar.animationDuration / 2}ms ${ProgressBar.animationDuration / 2}ms ease-in;
        transform: translate3d(0, 0, 0);
      }
    `;
    }
    show() {
      if (!this.visible) {
        this.visible = true;
        this.installProgressElement();
        this.startTrickling();
      }
    }
    hide() {
      if (this.visible && !this.hiding) {
        this.hiding = true;
        this.fadeProgressElement(() => {
          this.uninstallProgressElement();
          this.stopTrickling();
          this.visible = false;
          this.hiding = false;
        });
      }
    }
    setValue(value) {
      this.value = value;
      this.refresh();
    }
    installStylesheetElement() {
      document.head.insertBefore(this.stylesheetElement, document.head.firstChild);
    }
    installProgressElement() {
      this.progressElement.style.width = "0";
      this.progressElement.style.opacity = "1";
      document.documentElement.insertBefore(this.progressElement, document.body);
      this.refresh();
    }
    fadeProgressElement(callback) {
      this.progressElement.style.opacity = "0";
      setTimeout(callback, ProgressBar.animationDuration * 1.5);
    }
    uninstallProgressElement() {
      if (this.progressElement.parentNode) {
        document.documentElement.removeChild(this.progressElement);
      }
    }
    startTrickling() {
      if (!this.trickleInterval) {
        this.trickleInterval = window.setInterval(this.trickle, ProgressBar.animationDuration);
      }
    }
    stopTrickling() {
      window.clearInterval(this.trickleInterval);
      delete this.trickleInterval;
    }
    refresh() {
      requestAnimationFrame(() => {
        this.progressElement.style.width = `${10 + this.value * 90}%`;
      });
    }
    createStylesheetElement() {
      const element = document.createElement("style");
      element.type = "text/css";
      element.textContent = ProgressBar.defaultCSS;
      if (this.cspNonce) {
        element.nonce = this.cspNonce;
      }
      return element;
    }
    createProgressElement() {
      const element = document.createElement("div");
      element.className = "turbo-progress-bar";
      return element;
    }
    get cspNonce() {
      return getMetaContent("csp-nonce");
    }
  };
  ProgressBar.animationDuration = 300;
  var HeadSnapshot = class extends Snapshot {
    constructor() {
      super(...arguments);
      this.detailsByOuterHTML = this.children.filter((element) => !elementIsNoscript(element)).map((element) => elementWithoutNonce(element)).reduce((result, element) => {
        const { outerHTML } = element;
        const details = outerHTML in result ? result[outerHTML] : {
          type: elementType(element),
          tracked: elementIsTracked(element),
          elements: []
        };
        return Object.assign(Object.assign({}, result), { [outerHTML]: Object.assign(Object.assign({}, details), { elements: [...details.elements, element] }) });
      }, {});
    }
    get trackedElementSignature() {
      return Object.keys(this.detailsByOuterHTML).filter((outerHTML) => this.detailsByOuterHTML[outerHTML].tracked).join("");
    }
    getScriptElementsNotInSnapshot(snapshot) {
      return this.getElementsMatchingTypeNotInSnapshot("script", snapshot);
    }
    getStylesheetElementsNotInSnapshot(snapshot) {
      return this.getElementsMatchingTypeNotInSnapshot("stylesheet", snapshot);
    }
    getElementsMatchingTypeNotInSnapshot(matchedType, snapshot) {
      return Object.keys(this.detailsByOuterHTML).filter((outerHTML) => !(outerHTML in snapshot.detailsByOuterHTML)).map((outerHTML) => this.detailsByOuterHTML[outerHTML]).filter(({ type }) => type == matchedType).map(({ elements: [element] }) => element);
    }
    get provisionalElements() {
      return Object.keys(this.detailsByOuterHTML).reduce((result, outerHTML) => {
        const { type, tracked, elements } = this.detailsByOuterHTML[outerHTML];
        if (type == null && !tracked) {
          return [...result, ...elements];
        } else if (elements.length > 1) {
          return [...result, ...elements.slice(1)];
        } else {
          return result;
        }
      }, []);
    }
    getMetaValue(name) {
      const element = this.findMetaElementByName(name);
      return element ? element.getAttribute("content") : null;
    }
    findMetaElementByName(name) {
      return Object.keys(this.detailsByOuterHTML).reduce((result, outerHTML) => {
        const { elements: [element] } = this.detailsByOuterHTML[outerHTML];
        return elementIsMetaElementWithName(element, name) ? element : result;
      }, void 0);
    }
  };
  function elementType(element) {
    if (elementIsScript(element)) {
      return "script";
    } else if (elementIsStylesheet(element)) {
      return "stylesheet";
    }
  }
  function elementIsTracked(element) {
    return element.getAttribute("data-turbo-track") == "reload";
  }
  function elementIsScript(element) {
    const tagName = element.localName;
    return tagName == "script";
  }
  function elementIsNoscript(element) {
    const tagName = element.localName;
    return tagName == "noscript";
  }
  function elementIsStylesheet(element) {
    const tagName = element.localName;
    return tagName == "style" || tagName == "link" && element.getAttribute("rel") == "stylesheet";
  }
  function elementIsMetaElementWithName(element, name) {
    const tagName = element.localName;
    return tagName == "meta" && element.getAttribute("name") == name;
  }
  function elementWithoutNonce(element) {
    if (element.hasAttribute("nonce")) {
      element.setAttribute("nonce", "");
    }
    return element;
  }
  var PageSnapshot = class extends Snapshot {
    constructor(element, headSnapshot) {
      super(element);
      this.headSnapshot = headSnapshot;
    }
    static fromHTMLString(html = "") {
      return this.fromDocument(parseHTMLDocument(html));
    }
    static fromElement(element) {
      return this.fromDocument(element.ownerDocument);
    }
    static fromDocument({ head, body }) {
      return new this(body, new HeadSnapshot(head));
    }
    clone() {
      const clonedElement = this.element.cloneNode(true);
      const selectElements = this.element.querySelectorAll("select");
      const clonedSelectElements = clonedElement.querySelectorAll("select");
      for (const [index, source] of selectElements.entries()) {
        const clone = clonedSelectElements[index];
        for (const option of clone.selectedOptions)
          option.selected = false;
        for (const option of source.selectedOptions)
          clone.options[option.index].selected = true;
      }
      for (const clonedPasswordInput of clonedElement.querySelectorAll('input[type="password"]')) {
        clonedPasswordInput.value = "";
      }
      return new PageSnapshot(clonedElement, this.headSnapshot);
    }
    get headElement() {
      return this.headSnapshot.element;
    }
    get rootLocation() {
      var _a2;
      const root = (_a2 = this.getSetting("root")) !== null && _a2 !== void 0 ? _a2 : "/";
      return expandURL(root);
    }
    get cacheControlValue() {
      return this.getSetting("cache-control");
    }
    get isPreviewable() {
      return this.cacheControlValue != "no-preview";
    }
    get isCacheable() {
      return this.cacheControlValue != "no-cache";
    }
    get isVisitable() {
      return this.getSetting("visit-control") != "reload";
    }
    getSetting(name) {
      return this.headSnapshot.getMetaValue(`turbo-${name}`);
    }
  };
  var TimingMetric;
  (function(TimingMetric2) {
    TimingMetric2["visitStart"] = "visitStart";
    TimingMetric2["requestStart"] = "requestStart";
    TimingMetric2["requestEnd"] = "requestEnd";
    TimingMetric2["visitEnd"] = "visitEnd";
  })(TimingMetric || (TimingMetric = {}));
  var VisitState;
  (function(VisitState2) {
    VisitState2["initialized"] = "initialized";
    VisitState2["started"] = "started";
    VisitState2["canceled"] = "canceled";
    VisitState2["failed"] = "failed";
    VisitState2["completed"] = "completed";
  })(VisitState || (VisitState = {}));
  var defaultOptions = {
    action: "advance",
    historyChanged: false,
    visitCachedSnapshot: () => {
    },
    willRender: true,
    updateHistory: true,
    shouldCacheSnapshot: true,
    acceptsStreamResponse: false
  };
  var SystemStatusCode;
  (function(SystemStatusCode2) {
    SystemStatusCode2[SystemStatusCode2["networkFailure"] = 0] = "networkFailure";
    SystemStatusCode2[SystemStatusCode2["timeoutFailure"] = -1] = "timeoutFailure";
    SystemStatusCode2[SystemStatusCode2["contentTypeMismatch"] = -2] = "contentTypeMismatch";
  })(SystemStatusCode || (SystemStatusCode = {}));
  var Visit = class {
    constructor(delegate2, location2, restorationIdentifier, options = {}) {
      this.identifier = uuid();
      this.timingMetrics = {};
      this.followedRedirect = false;
      this.historyChanged = false;
      this.scrolled = false;
      this.shouldCacheSnapshot = true;
      this.acceptsStreamResponse = false;
      this.snapshotCached = false;
      this.state = VisitState.initialized;
      this.delegate = delegate2;
      this.location = location2;
      this.restorationIdentifier = restorationIdentifier || uuid();
      const { action, historyChanged, referrer, snapshot, snapshotHTML, response, visitCachedSnapshot, willRender, updateHistory, shouldCacheSnapshot, acceptsStreamResponse } = Object.assign(Object.assign({}, defaultOptions), options);
      this.action = action;
      this.historyChanged = historyChanged;
      this.referrer = referrer;
      this.snapshot = snapshot;
      this.snapshotHTML = snapshotHTML;
      this.response = response;
      this.isSamePage = this.delegate.locationWithActionIsSamePage(this.location, this.action);
      this.visitCachedSnapshot = visitCachedSnapshot;
      this.willRender = willRender;
      this.updateHistory = updateHistory;
      this.scrolled = !willRender;
      this.shouldCacheSnapshot = shouldCacheSnapshot;
      this.acceptsStreamResponse = acceptsStreamResponse;
    }
    get adapter() {
      return this.delegate.adapter;
    }
    get view() {
      return this.delegate.view;
    }
    get history() {
      return this.delegate.history;
    }
    get restorationData() {
      return this.history.getRestorationDataForIdentifier(this.restorationIdentifier);
    }
    get silent() {
      return this.isSamePage;
    }
    start() {
      if (this.state == VisitState.initialized) {
        this.recordTimingMetric(TimingMetric.visitStart);
        this.state = VisitState.started;
        this.adapter.visitStarted(this);
        this.delegate.visitStarted(this);
      }
    }
    cancel() {
      if (this.state == VisitState.started) {
        if (this.request) {
          this.request.cancel();
        }
        this.cancelRender();
        this.state = VisitState.canceled;
      }
    }
    complete() {
      if (this.state == VisitState.started) {
        this.recordTimingMetric(TimingMetric.visitEnd);
        this.state = VisitState.completed;
        this.followRedirect();
        if (!this.followedRedirect) {
          this.adapter.visitCompleted(this);
          this.delegate.visitCompleted(this);
        }
      }
    }
    fail() {
      if (this.state == VisitState.started) {
        this.state = VisitState.failed;
        this.adapter.visitFailed(this);
      }
    }
    changeHistory() {
      var _a2;
      if (!this.historyChanged && this.updateHistory) {
        const actionForHistory = this.location.href === ((_a2 = this.referrer) === null || _a2 === void 0 ? void 0 : _a2.href) ? "replace" : this.action;
        const method2 = getHistoryMethodForAction(actionForHistory);
        this.history.update(method2, this.location, this.restorationIdentifier);
        this.historyChanged = true;
      }
    }
    issueRequest() {
      if (this.hasPreloadedResponse()) {
        this.simulateRequest();
      } else if (this.shouldIssueRequest() && !this.request) {
        this.request = new FetchRequest(this, FetchMethod.get, this.location);
        this.request.perform();
      }
    }
    simulateRequest() {
      if (this.response) {
        this.startRequest();
        this.recordResponse();
        this.finishRequest();
      }
    }
    startRequest() {
      this.recordTimingMetric(TimingMetric.requestStart);
      this.adapter.visitRequestStarted(this);
    }
    recordResponse(response = this.response) {
      this.response = response;
      if (response) {
        const { statusCode } = response;
        if (isSuccessful(statusCode)) {
          this.adapter.visitRequestCompleted(this);
        } else {
          this.adapter.visitRequestFailedWithStatusCode(this, statusCode);
        }
      }
    }
    finishRequest() {
      this.recordTimingMetric(TimingMetric.requestEnd);
      this.adapter.visitRequestFinished(this);
    }
    loadResponse() {
      if (this.response) {
        const { statusCode, responseHTML } = this.response;
        this.render(async () => {
          if (this.shouldCacheSnapshot)
            this.cacheSnapshot();
          if (this.view.renderPromise)
            await this.view.renderPromise;
          if (isSuccessful(statusCode) && responseHTML != null) {
            await this.view.renderPage(PageSnapshot.fromHTMLString(responseHTML), false, this.willRender, this);
            this.performScroll();
            this.adapter.visitRendered(this);
            this.complete();
          } else {
            await this.view.renderError(PageSnapshot.fromHTMLString(responseHTML), this);
            this.adapter.visitRendered(this);
            this.fail();
          }
        });
      }
    }
    getCachedSnapshot() {
      const snapshot = this.view.getCachedSnapshotForLocation(this.location) || this.getPreloadedSnapshot();
      if (snapshot && (!getAnchor(this.location) || snapshot.hasAnchor(getAnchor(this.location)))) {
        if (this.action == "restore" || snapshot.isPreviewable) {
          return snapshot;
        }
      }
    }
    getPreloadedSnapshot() {
      if (this.snapshotHTML) {
        return PageSnapshot.fromHTMLString(this.snapshotHTML);
      }
    }
    hasCachedSnapshot() {
      return this.getCachedSnapshot() != null;
    }
    loadCachedSnapshot() {
      const snapshot = this.getCachedSnapshot();
      if (snapshot) {
        const isPreview = this.shouldIssueRequest();
        this.render(async () => {
          this.cacheSnapshot();
          if (this.isSamePage) {
            this.adapter.visitRendered(this);
          } else {
            if (this.view.renderPromise)
              await this.view.renderPromise;
            await this.view.renderPage(snapshot, isPreview, this.willRender, this);
            this.performScroll();
            this.adapter.visitRendered(this);
            if (!isPreview) {
              this.complete();
            }
          }
        });
      }
    }
    followRedirect() {
      var _a2;
      if (this.redirectedToLocation && !this.followedRedirect && ((_a2 = this.response) === null || _a2 === void 0 ? void 0 : _a2.redirected)) {
        this.adapter.visitProposedToLocation(this.redirectedToLocation, {
          action: "replace",
          response: this.response
        });
        this.followedRedirect = true;
      }
    }
    goToSamePageAnchor() {
      if (this.isSamePage) {
        this.render(async () => {
          this.cacheSnapshot();
          this.performScroll();
          this.changeHistory();
          this.adapter.visitRendered(this);
        });
      }
    }
    prepareHeadersForRequest(headers, request2) {
      if (this.acceptsStreamResponse) {
        request2.acceptResponseType(StreamMessage.contentType);
      }
    }
    requestStarted() {
      this.startRequest();
    }
    requestPreventedHandlingResponse(_request, _response) {
    }
    async requestSucceededWithResponse(request2, response) {
      const responseHTML = await response.responseHTML;
      const { redirected, statusCode } = response;
      if (responseHTML == void 0) {
        this.recordResponse({
          statusCode: SystemStatusCode.contentTypeMismatch,
          redirected
        });
      } else {
        this.redirectedToLocation = response.redirected ? response.location : void 0;
        this.recordResponse({ statusCode, responseHTML, redirected });
      }
    }
    async requestFailedWithResponse(request2, response) {
      const responseHTML = await response.responseHTML;
      const { redirected, statusCode } = response;
      if (responseHTML == void 0) {
        this.recordResponse({
          statusCode: SystemStatusCode.contentTypeMismatch,
          redirected
        });
      } else {
        this.recordResponse({ statusCode, responseHTML, redirected });
      }
    }
    requestErrored(_request, _error) {
      this.recordResponse({
        statusCode: SystemStatusCode.networkFailure,
        redirected: false
      });
    }
    requestFinished() {
      this.finishRequest();
    }
    performScroll() {
      if (!this.scrolled && !this.view.forceReloaded) {
        if (this.action == "restore") {
          this.scrollToRestoredPosition() || this.scrollToAnchor() || this.view.scrollToTop();
        } else {
          this.scrollToAnchor() || this.view.scrollToTop();
        }
        if (this.isSamePage) {
          this.delegate.visitScrolledToSamePageLocation(this.view.lastRenderedLocation, this.location);
        }
        this.scrolled = true;
      }
    }
    scrollToRestoredPosition() {
      const { scrollPosition } = this.restorationData;
      if (scrollPosition) {
        this.view.scrollToPosition(scrollPosition);
        return true;
      }
    }
    scrollToAnchor() {
      const anchor = getAnchor(this.location);
      if (anchor != null) {
        this.view.scrollToAnchor(anchor);
        return true;
      }
    }
    recordTimingMetric(metric) {
      this.timingMetrics[metric] = new Date().getTime();
    }
    getTimingMetrics() {
      return Object.assign({}, this.timingMetrics);
    }
    getHistoryMethodForAction(action) {
      switch (action) {
        case "replace":
          return history.replaceState;
        case "advance":
        case "restore":
          return history.pushState;
      }
    }
    hasPreloadedResponse() {
      return typeof this.response == "object";
    }
    shouldIssueRequest() {
      if (this.isSamePage) {
        return false;
      } else if (this.action == "restore") {
        return !this.hasCachedSnapshot();
      } else {
        return this.willRender;
      }
    }
    cacheSnapshot() {
      if (!this.snapshotCached) {
        this.view.cacheSnapshot(this.snapshot).then((snapshot) => snapshot && this.visitCachedSnapshot(snapshot));
        this.snapshotCached = true;
      }
    }
    async render(callback) {
      this.cancelRender();
      await new Promise((resolve) => {
        this.frame = requestAnimationFrame(() => resolve());
      });
      await callback();
      delete this.frame;
    }
    cancelRender() {
      if (this.frame) {
        cancelAnimationFrame(this.frame);
        delete this.frame;
      }
    }
  };
  function isSuccessful(statusCode) {
    return statusCode >= 200 && statusCode < 300;
  }
  var BrowserAdapter = class {
    constructor(session2) {
      this.progressBar = new ProgressBar();
      this.showProgressBar = () => {
        this.progressBar.show();
      };
      this.session = session2;
    }
    visitProposedToLocation(location2, options) {
      this.navigator.startVisit(location2, (options === null || options === void 0 ? void 0 : options.restorationIdentifier) || uuid(), options);
    }
    visitStarted(visit2) {
      this.location = visit2.location;
      visit2.loadCachedSnapshot();
      visit2.issueRequest();
      visit2.goToSamePageAnchor();
    }
    visitRequestStarted(visit2) {
      this.progressBar.setValue(0);
      if (visit2.hasCachedSnapshot() || visit2.action != "restore") {
        this.showVisitProgressBarAfterDelay();
      } else {
        this.showProgressBar();
      }
    }
    visitRequestCompleted(visit2) {
      visit2.loadResponse();
    }
    visitRequestFailedWithStatusCode(visit2, statusCode) {
      switch (statusCode) {
        case SystemStatusCode.networkFailure:
        case SystemStatusCode.timeoutFailure:
        case SystemStatusCode.contentTypeMismatch:
          return this.reload({
            reason: "request_failed",
            context: {
              statusCode
            }
          });
        default:
          return visit2.loadResponse();
      }
    }
    visitRequestFinished(_visit) {
      this.progressBar.setValue(1);
      this.hideVisitProgressBar();
    }
    visitCompleted(_visit) {
    }
    pageInvalidated(reason) {
      this.reload(reason);
    }
    visitFailed(_visit) {
    }
    visitRendered(_visit) {
    }
    formSubmissionStarted(_formSubmission) {
      this.progressBar.setValue(0);
      this.showFormProgressBarAfterDelay();
    }
    formSubmissionFinished(_formSubmission) {
      this.progressBar.setValue(1);
      this.hideFormProgressBar();
    }
    showVisitProgressBarAfterDelay() {
      this.visitProgressBarTimeout = window.setTimeout(this.showProgressBar, this.session.progressBarDelay);
    }
    hideVisitProgressBar() {
      this.progressBar.hide();
      if (this.visitProgressBarTimeout != null) {
        window.clearTimeout(this.visitProgressBarTimeout);
        delete this.visitProgressBarTimeout;
      }
    }
    showFormProgressBarAfterDelay() {
      if (this.formProgressBarTimeout == null) {
        this.formProgressBarTimeout = window.setTimeout(this.showProgressBar, this.session.progressBarDelay);
      }
    }
    hideFormProgressBar() {
      this.progressBar.hide();
      if (this.formProgressBarTimeout != null) {
        window.clearTimeout(this.formProgressBarTimeout);
        delete this.formProgressBarTimeout;
      }
    }
    reload(reason) {
      var _a2;
      dispatch("turbo:reload", { detail: reason });
      window.location.href = ((_a2 = this.location) === null || _a2 === void 0 ? void 0 : _a2.toString()) || window.location.href;
    }
    get navigator() {
      return this.session.navigator;
    }
  };
  var CacheObserver = class {
    constructor() {
      this.started = false;
      this.removeStaleElements = (_event) => {
        const staleElements = [...document.querySelectorAll('[data-turbo-cache="false"]')];
        for (const element of staleElements) {
          element.remove();
        }
      };
    }
    start() {
      if (!this.started) {
        this.started = true;
        addEventListener("turbo:before-cache", this.removeStaleElements, false);
      }
    }
    stop() {
      if (this.started) {
        this.started = false;
        removeEventListener("turbo:before-cache", this.removeStaleElements, false);
      }
    }
  };
  var FrameRedirector = class {
    constructor(session2, element) {
      this.session = session2;
      this.element = element;
      this.linkInterceptor = new LinkInterceptor(this, element);
      this.formSubmitObserver = new FormSubmitObserver(this, element);
    }
    start() {
      this.linkInterceptor.start();
      this.formSubmitObserver.start();
    }
    stop() {
      this.linkInterceptor.stop();
      this.formSubmitObserver.stop();
    }
    shouldInterceptLinkClick(element, _location, _event) {
      return this.shouldRedirect(element);
    }
    linkClickIntercepted(element, url2, event) {
      const frame = this.findFrameElement(element);
      if (frame) {
        frame.delegate.linkClickIntercepted(element, url2, event);
      }
    }
    willSubmitForm(element, submitter) {
      return element.closest("turbo-frame") == null && this.shouldSubmit(element, submitter) && this.shouldRedirect(element, submitter);
    }
    formSubmitted(element, submitter) {
      const frame = this.findFrameElement(element, submitter);
      if (frame) {
        frame.delegate.formSubmitted(element, submitter);
      }
    }
    shouldSubmit(form2, submitter) {
      var _a2;
      const action = getAction(form2, submitter);
      const meta = this.element.ownerDocument.querySelector(`meta[name="turbo-root"]`);
      const rootLocation = expandURL((_a2 = meta === null || meta === void 0 ? void 0 : meta.content) !== null && _a2 !== void 0 ? _a2 : "/");
      return this.shouldRedirect(form2, submitter) && locationIsVisitable(action, rootLocation);
    }
    shouldRedirect(element, submitter) {
      const isNavigatable = element instanceof HTMLFormElement ? this.session.submissionIsNavigatable(element, submitter) : this.session.elementIsNavigatable(element);
      if (isNavigatable) {
        const frame = this.findFrameElement(element, submitter);
        return frame ? frame != element.closest("turbo-frame") : false;
      } else {
        return false;
      }
    }
    findFrameElement(element, submitter) {
      const id = (submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("data-turbo-frame")) || element.getAttribute("data-turbo-frame");
      if (id && id != "_top") {
        const frame = this.element.querySelector(`#${id}:not([disabled])`);
        if (frame instanceof FrameElement) {
          return frame;
        }
      }
    }
  };
  var History = class {
    constructor(delegate2) {
      this.restorationIdentifier = uuid();
      this.restorationData = {};
      this.started = false;
      this.pageLoaded = false;
      this.onPopState = (event) => {
        if (this.shouldHandlePopState()) {
          const { turbo } = event.state || {};
          if (turbo) {
            this.location = new URL(window.location.href);
            const { restorationIdentifier } = turbo;
            this.restorationIdentifier = restorationIdentifier;
            this.delegate.historyPoppedToLocationWithRestorationIdentifier(this.location, restorationIdentifier);
          }
        }
      };
      this.onPageLoad = async (_event) => {
        await nextMicrotask();
        this.pageLoaded = true;
      };
      this.delegate = delegate2;
    }
    start() {
      if (!this.started) {
        addEventListener("popstate", this.onPopState, false);
        addEventListener("load", this.onPageLoad, false);
        this.started = true;
        this.replace(new URL(window.location.href));
      }
    }
    stop() {
      if (this.started) {
        removeEventListener("popstate", this.onPopState, false);
        removeEventListener("load", this.onPageLoad, false);
        this.started = false;
      }
    }
    push(location2, restorationIdentifier) {
      this.update(history.pushState, location2, restorationIdentifier);
    }
    replace(location2, restorationIdentifier) {
      this.update(history.replaceState, location2, restorationIdentifier);
    }
    update(method2, location2, restorationIdentifier = uuid()) {
      const state = { turbo: { restorationIdentifier } };
      method2.call(history, state, "", location2.href);
      this.location = location2;
      this.restorationIdentifier = restorationIdentifier;
    }
    getRestorationDataForIdentifier(restorationIdentifier) {
      return this.restorationData[restorationIdentifier] || {};
    }
    updateRestorationData(additionalData) {
      const { restorationIdentifier } = this;
      const restorationData = this.restorationData[restorationIdentifier];
      this.restorationData[restorationIdentifier] = Object.assign(Object.assign({}, restorationData), additionalData);
    }
    assumeControlOfScrollRestoration() {
      var _a2;
      if (!this.previousScrollRestoration) {
        this.previousScrollRestoration = (_a2 = history.scrollRestoration) !== null && _a2 !== void 0 ? _a2 : "auto";
        history.scrollRestoration = "manual";
      }
    }
    relinquishControlOfScrollRestoration() {
      if (this.previousScrollRestoration) {
        history.scrollRestoration = this.previousScrollRestoration;
        delete this.previousScrollRestoration;
      }
    }
    shouldHandlePopState() {
      return this.pageIsLoaded();
    }
    pageIsLoaded() {
      return this.pageLoaded || document.readyState == "complete";
    }
  };
  var Navigator = class {
    constructor(delegate2) {
      this.delegate = delegate2;
    }
    proposeVisit(location2, options = {}) {
      if (this.delegate.allowsVisitingLocationWithAction(location2, options.action)) {
        if (locationIsVisitable(location2, this.view.snapshot.rootLocation)) {
          this.delegate.visitProposedToLocation(location2, options);
        } else {
          window.location.href = location2.toString();
        }
      }
    }
    startVisit(locatable, restorationIdentifier, options = {}) {
      this.stop();
      this.currentVisit = new Visit(this, expandURL(locatable), restorationIdentifier, Object.assign({ referrer: this.location }, options));
      this.currentVisit.start();
    }
    submitForm(form2, submitter) {
      this.stop();
      this.formSubmission = new FormSubmission(this, form2, submitter, true);
      this.formSubmission.start();
    }
    stop() {
      if (this.formSubmission) {
        this.formSubmission.stop();
        delete this.formSubmission;
      }
      if (this.currentVisit) {
        this.currentVisit.cancel();
        delete this.currentVisit;
      }
    }
    get adapter() {
      return this.delegate.adapter;
    }
    get view() {
      return this.delegate.view;
    }
    get history() {
      return this.delegate.history;
    }
    formSubmissionStarted(formSubmission) {
      if (typeof this.adapter.formSubmissionStarted === "function") {
        this.adapter.formSubmissionStarted(formSubmission);
      }
    }
    async formSubmissionSucceededWithResponse(formSubmission, fetchResponse) {
      if (formSubmission == this.formSubmission) {
        const responseHTML = await fetchResponse.responseHTML;
        if (responseHTML) {
          const shouldCacheSnapshot = formSubmission.method == FetchMethod.get;
          if (!shouldCacheSnapshot) {
            this.view.clearSnapshotCache();
          }
          const { statusCode, redirected } = fetchResponse;
          const action = this.getActionForFormSubmission(formSubmission);
          const visitOptions = {
            action,
            shouldCacheSnapshot,
            response: { statusCode, responseHTML, redirected }
          };
          this.proposeVisit(fetchResponse.location, visitOptions);
        }
      }
    }
    async formSubmissionFailedWithResponse(formSubmission, fetchResponse) {
      const responseHTML = await fetchResponse.responseHTML;
      if (responseHTML) {
        const snapshot = PageSnapshot.fromHTMLString(responseHTML);
        if (fetchResponse.serverError) {
          await this.view.renderError(snapshot, this.currentVisit);
        } else {
          await this.view.renderPage(snapshot, false, true, this.currentVisit);
        }
        this.view.scrollToTop();
        this.view.clearSnapshotCache();
      }
    }
    formSubmissionErrored(formSubmission, error4) {
      console.error(error4);
    }
    formSubmissionFinished(formSubmission) {
      if (typeof this.adapter.formSubmissionFinished === "function") {
        this.adapter.formSubmissionFinished(formSubmission);
      }
    }
    visitStarted(visit2) {
      this.delegate.visitStarted(visit2);
    }
    visitCompleted(visit2) {
      this.delegate.visitCompleted(visit2);
    }
    locationWithActionIsSamePage(location2, action) {
      const anchor = getAnchor(location2);
      const currentAnchor = getAnchor(this.view.lastRenderedLocation);
      const isRestorationToTop = action === "restore" && typeof anchor === "undefined";
      return action !== "replace" && getRequestURL(location2) === getRequestURL(this.view.lastRenderedLocation) && (isRestorationToTop || anchor != null && anchor !== currentAnchor);
    }
    visitScrolledToSamePageLocation(oldURL, newURL) {
      this.delegate.visitScrolledToSamePageLocation(oldURL, newURL);
    }
    get location() {
      return this.history.location;
    }
    get restorationIdentifier() {
      return this.history.restorationIdentifier;
    }
    getActionForFormSubmission(formSubmission) {
      const { formElement, submitter } = formSubmission;
      const action = getAttribute("data-turbo-action", submitter, formElement);
      return isAction(action) ? action : "advance";
    }
  };
  var PageStage;
  (function(PageStage2) {
    PageStage2[PageStage2["initial"] = 0] = "initial";
    PageStage2[PageStage2["loading"] = 1] = "loading";
    PageStage2[PageStage2["interactive"] = 2] = "interactive";
    PageStage2[PageStage2["complete"] = 3] = "complete";
  })(PageStage || (PageStage = {}));
  var PageObserver = class {
    constructor(delegate2) {
      this.stage = PageStage.initial;
      this.started = false;
      this.interpretReadyState = () => {
        const { readyState } = this;
        if (readyState == "interactive") {
          this.pageIsInteractive();
        } else if (readyState == "complete") {
          this.pageIsComplete();
        }
      };
      this.pageWillUnload = () => {
        this.delegate.pageWillUnload();
      };
      this.delegate = delegate2;
    }
    start() {
      if (!this.started) {
        if (this.stage == PageStage.initial) {
          this.stage = PageStage.loading;
        }
        document.addEventListener("readystatechange", this.interpretReadyState, false);
        addEventListener("pagehide", this.pageWillUnload, false);
        this.started = true;
      }
    }
    stop() {
      if (this.started) {
        document.removeEventListener("readystatechange", this.interpretReadyState, false);
        removeEventListener("pagehide", this.pageWillUnload, false);
        this.started = false;
      }
    }
    pageIsInteractive() {
      if (this.stage == PageStage.loading) {
        this.stage = PageStage.interactive;
        this.delegate.pageBecameInteractive();
      }
    }
    pageIsComplete() {
      this.pageIsInteractive();
      if (this.stage == PageStage.interactive) {
        this.stage = PageStage.complete;
        this.delegate.pageLoaded();
      }
    }
    get readyState() {
      return document.readyState;
    }
  };
  var ScrollObserver = class {
    constructor(delegate2) {
      this.started = false;
      this.onScroll = () => {
        this.updatePosition({ x: window.pageXOffset, y: window.pageYOffset });
      };
      this.delegate = delegate2;
    }
    start() {
      if (!this.started) {
        addEventListener("scroll", this.onScroll, false);
        this.onScroll();
        this.started = true;
      }
    }
    stop() {
      if (this.started) {
        removeEventListener("scroll", this.onScroll, false);
        this.started = false;
      }
    }
    updatePosition(position) {
      this.delegate.scrollPositionChanged(position);
    }
  };
  var StreamMessageRenderer = class {
    render({ fragment }) {
      Bardo.preservingPermanentElements(this, getPermanentElementMapForFragment(fragment), () => document.documentElement.appendChild(fragment));
    }
    enteringBardo(currentPermanentElement, newPermanentElement) {
      newPermanentElement.replaceWith(currentPermanentElement.cloneNode(true));
    }
    leavingBardo() {
    }
  };
  function getPermanentElementMapForFragment(fragment) {
    const permanentElementsInDocument = queryPermanentElementsAll(document.documentElement);
    const permanentElementMap = {};
    for (const permanentElementInDocument of permanentElementsInDocument) {
      const { id } = permanentElementInDocument;
      for (const streamElement of fragment.querySelectorAll("turbo-stream")) {
        const elementInStream = getPermanentElementById(streamElement.templateElement.content, id);
        if (elementInStream) {
          permanentElementMap[id] = [permanentElementInDocument, elementInStream];
        }
      }
    }
    return permanentElementMap;
  }
  var StreamObserver = class {
    constructor(delegate2) {
      this.sources = /* @__PURE__ */ new Set();
      this.started = false;
      this.inspectFetchResponse = (event) => {
        const response = fetchResponseFromEvent(event);
        if (response && fetchResponseIsStream(response)) {
          event.preventDefault();
          this.receiveMessageResponse(response);
        }
      };
      this.receiveMessageEvent = (event) => {
        if (this.started && typeof event.data == "string") {
          this.receiveMessageHTML(event.data);
        }
      };
      this.delegate = delegate2;
    }
    start() {
      if (!this.started) {
        this.started = true;
        addEventListener("turbo:before-fetch-response", this.inspectFetchResponse, false);
      }
    }
    stop() {
      if (this.started) {
        this.started = false;
        removeEventListener("turbo:before-fetch-response", this.inspectFetchResponse, false);
      }
    }
    connectStreamSource(source) {
      if (!this.streamSourceIsConnected(source)) {
        this.sources.add(source);
        source.addEventListener("message", this.receiveMessageEvent, false);
      }
    }
    disconnectStreamSource(source) {
      if (this.streamSourceIsConnected(source)) {
        this.sources.delete(source);
        source.removeEventListener("message", this.receiveMessageEvent, false);
      }
    }
    streamSourceIsConnected(source) {
      return this.sources.has(source);
    }
    async receiveMessageResponse(response) {
      const html = await response.responseHTML;
      if (html) {
        this.receiveMessageHTML(html);
      }
    }
    receiveMessageHTML(html) {
      this.delegate.receivedMessageFromStream(StreamMessage.wrap(html));
    }
  };
  function fetchResponseFromEvent(event) {
    var _a2;
    const fetchResponse = (_a2 = event.detail) === null || _a2 === void 0 ? void 0 : _a2.fetchResponse;
    if (fetchResponse instanceof FetchResponse) {
      return fetchResponse;
    }
  }
  function fetchResponseIsStream(response) {
    var _a2;
    const contentType = (_a2 = response.contentType) !== null && _a2 !== void 0 ? _a2 : "";
    return contentType.startsWith(StreamMessage.contentType);
  }
  var ErrorRenderer = class extends Renderer {
    static renderElement(currentElement, newElement) {
      const { documentElement, body } = document;
      documentElement.replaceChild(newElement, body);
    }
    async render() {
      this.replaceHeadAndBody();
      this.activateScriptElements();
    }
    replaceHeadAndBody() {
      const { documentElement, head } = document;
      documentElement.replaceChild(this.newHead, head);
      this.renderElement(this.currentElement, this.newElement);
    }
    activateScriptElements() {
      for (const replaceableElement of this.scriptElements) {
        const parentNode = replaceableElement.parentNode;
        if (parentNode) {
          const element = activateScriptElement(replaceableElement);
          parentNode.replaceChild(element, replaceableElement);
        }
      }
    }
    get newHead() {
      return this.newSnapshot.headSnapshot.element;
    }
    get scriptElements() {
      return document.documentElement.querySelectorAll("script");
    }
  };
  var PageRenderer = class extends Renderer {
    static renderElement(currentElement, newElement) {
      if (document.body && newElement instanceof HTMLBodyElement) {
        document.body.replaceWith(newElement);
      } else {
        document.documentElement.appendChild(newElement);
      }
    }
    get shouldRender() {
      return this.newSnapshot.isVisitable && this.trackedElementsAreIdentical;
    }
    get reloadReason() {
      if (!this.newSnapshot.isVisitable) {
        return {
          reason: "turbo_visit_control_is_reload"
        };
      }
      if (!this.trackedElementsAreIdentical) {
        return {
          reason: "tracked_element_mismatch"
        };
      }
    }
    async prepareToRender() {
      await this.mergeHead();
    }
    async render() {
      if (this.willRender) {
        this.replaceBody();
      }
    }
    finishRendering() {
      super.finishRendering();
      if (!this.isPreview) {
        this.focusFirstAutofocusableElement();
      }
    }
    get currentHeadSnapshot() {
      return this.currentSnapshot.headSnapshot;
    }
    get newHeadSnapshot() {
      return this.newSnapshot.headSnapshot;
    }
    get newElement() {
      return this.newSnapshot.element;
    }
    async mergeHead() {
      const newStylesheetElements = this.copyNewHeadStylesheetElements();
      this.copyNewHeadScriptElements();
      this.removeCurrentHeadProvisionalElements();
      this.copyNewHeadProvisionalElements();
      await newStylesheetElements;
    }
    replaceBody() {
      this.preservingPermanentElements(() => {
        this.activateNewBody();
        this.assignNewBody();
      });
    }
    get trackedElementsAreIdentical() {
      return this.currentHeadSnapshot.trackedElementSignature == this.newHeadSnapshot.trackedElementSignature;
    }
    async copyNewHeadStylesheetElements() {
      const loadingElements = [];
      for (const element of this.newHeadStylesheetElements) {
        loadingElements.push(waitForLoad(element));
        document.head.appendChild(element);
      }
      await Promise.all(loadingElements);
    }
    copyNewHeadScriptElements() {
      for (const element of this.newHeadScriptElements) {
        document.head.appendChild(activateScriptElement(element));
      }
    }
    removeCurrentHeadProvisionalElements() {
      for (const element of this.currentHeadProvisionalElements) {
        document.head.removeChild(element);
      }
    }
    copyNewHeadProvisionalElements() {
      for (const element of this.newHeadProvisionalElements) {
        document.head.appendChild(element);
      }
    }
    activateNewBody() {
      document.adoptNode(this.newElement);
      this.activateNewBodyScriptElements();
    }
    activateNewBodyScriptElements() {
      for (const inertScriptElement of this.newBodyScriptElements) {
        const activatedScriptElement = activateScriptElement(inertScriptElement);
        inertScriptElement.replaceWith(activatedScriptElement);
      }
    }
    assignNewBody() {
      this.renderElement(this.currentElement, this.newElement);
    }
    get newHeadStylesheetElements() {
      return this.newHeadSnapshot.getStylesheetElementsNotInSnapshot(this.currentHeadSnapshot);
    }
    get newHeadScriptElements() {
      return this.newHeadSnapshot.getScriptElementsNotInSnapshot(this.currentHeadSnapshot);
    }
    get currentHeadProvisionalElements() {
      return this.currentHeadSnapshot.provisionalElements;
    }
    get newHeadProvisionalElements() {
      return this.newHeadSnapshot.provisionalElements;
    }
    get newBodyScriptElements() {
      return this.newElement.querySelectorAll("script");
    }
  };
  var SnapshotCache = class {
    constructor(size) {
      this.keys = [];
      this.snapshots = {};
      this.size = size;
    }
    has(location2) {
      return toCacheKey(location2) in this.snapshots;
    }
    get(location2) {
      if (this.has(location2)) {
        const snapshot = this.read(location2);
        this.touch(location2);
        return snapshot;
      }
    }
    put(location2, snapshot) {
      this.write(location2, snapshot);
      this.touch(location2);
      return snapshot;
    }
    clear() {
      this.snapshots = {};
    }
    read(location2) {
      return this.snapshots[toCacheKey(location2)];
    }
    write(location2, snapshot) {
      this.snapshots[toCacheKey(location2)] = snapshot;
    }
    touch(location2) {
      const key = toCacheKey(location2);
      const index = this.keys.indexOf(key);
      if (index > -1)
        this.keys.splice(index, 1);
      this.keys.unshift(key);
      this.trim();
    }
    trim() {
      for (const key of this.keys.splice(this.size)) {
        delete this.snapshots[key];
      }
    }
  };
  var PageView = class extends View {
    constructor() {
      super(...arguments);
      this.snapshotCache = new SnapshotCache(10);
      this.lastRenderedLocation = new URL(location.href);
      this.forceReloaded = false;
    }
    renderPage(snapshot, isPreview = false, willRender = true, visit2) {
      const renderer = new PageRenderer(this.snapshot, snapshot, PageRenderer.renderElement, isPreview, willRender);
      if (!renderer.shouldRender) {
        this.forceReloaded = true;
      } else {
        visit2 === null || visit2 === void 0 ? void 0 : visit2.changeHistory();
      }
      return this.render(renderer);
    }
    renderError(snapshot, visit2) {
      visit2 === null || visit2 === void 0 ? void 0 : visit2.changeHistory();
      const renderer = new ErrorRenderer(this.snapshot, snapshot, ErrorRenderer.renderElement, false);
      return this.render(renderer);
    }
    clearSnapshotCache() {
      this.snapshotCache.clear();
    }
    async cacheSnapshot(snapshot = this.snapshot) {
      if (snapshot.isCacheable) {
        this.delegate.viewWillCacheSnapshot();
        const { lastRenderedLocation: location2 } = this;
        await nextEventLoopTick();
        const cachedSnapshot = snapshot.clone();
        this.snapshotCache.put(location2, cachedSnapshot);
        return cachedSnapshot;
      }
    }
    getCachedSnapshotForLocation(location2) {
      return this.snapshotCache.get(location2);
    }
    get snapshot() {
      return PageSnapshot.fromElement(this.element);
    }
  };
  var Preloader = class {
    constructor(delegate2) {
      this.selector = "a[data-turbo-preload]";
      this.delegate = delegate2;
    }
    get snapshotCache() {
      return this.delegate.navigator.view.snapshotCache;
    }
    start() {
      if (document.readyState === "loading") {
        return document.addEventListener("DOMContentLoaded", () => {
          this.preloadOnLoadLinksForView(document.body);
        });
      } else {
        this.preloadOnLoadLinksForView(document.body);
      }
    }
    preloadOnLoadLinksForView(element) {
      for (const link2 of element.querySelectorAll(this.selector)) {
        this.preloadURL(link2);
      }
    }
    async preloadURL(link2) {
      const location2 = new URL(link2.href);
      if (this.snapshotCache.has(location2)) {
        return;
      }
      try {
        const response = await fetch(location2.toString(), { headers: { "VND.PREFETCH": "true", Accept: "text/html" } });
        const responseText = await response.text();
        const snapshot = PageSnapshot.fromHTMLString(responseText);
        this.snapshotCache.put(location2, snapshot);
      } catch (_) {
      }
    }
  };
  var Session = class {
    constructor() {
      this.navigator = new Navigator(this);
      this.history = new History(this);
      this.preloader = new Preloader(this);
      this.view = new PageView(this, document.documentElement);
      this.adapter = new BrowserAdapter(this);
      this.pageObserver = new PageObserver(this);
      this.cacheObserver = new CacheObserver();
      this.linkClickObserver = new LinkClickObserver(this, window);
      this.formSubmitObserver = new FormSubmitObserver(this, document);
      this.scrollObserver = new ScrollObserver(this);
      this.streamObserver = new StreamObserver(this);
      this.formLinkClickObserver = new FormLinkClickObserver(this, document.documentElement);
      this.frameRedirector = new FrameRedirector(this, document.documentElement);
      this.streamMessageRenderer = new StreamMessageRenderer();
      this.drive = true;
      this.enabled = true;
      this.progressBarDelay = 500;
      this.started = false;
      this.formMode = "on";
    }
    start() {
      if (!this.started) {
        this.pageObserver.start();
        this.cacheObserver.start();
        this.formLinkClickObserver.start();
        this.linkClickObserver.start();
        this.formSubmitObserver.start();
        this.scrollObserver.start();
        this.streamObserver.start();
        this.frameRedirector.start();
        this.history.start();
        this.preloader.start();
        this.started = true;
        this.enabled = true;
      }
    }
    disable() {
      this.enabled = false;
    }
    stop() {
      if (this.started) {
        this.pageObserver.stop();
        this.cacheObserver.stop();
        this.formLinkClickObserver.stop();
        this.linkClickObserver.stop();
        this.formSubmitObserver.stop();
        this.scrollObserver.stop();
        this.streamObserver.stop();
        this.frameRedirector.stop();
        this.history.stop();
        this.started = false;
      }
    }
    registerAdapter(adapter) {
      this.adapter = adapter;
    }
    visit(location2, options = {}) {
      const frameElement = options.frame ? document.getElementById(options.frame) : null;
      if (frameElement instanceof FrameElement) {
        frameElement.src = location2.toString();
        frameElement.loaded;
      } else {
        this.navigator.proposeVisit(expandURL(location2), options);
      }
    }
    connectStreamSource(source) {
      this.streamObserver.connectStreamSource(source);
    }
    disconnectStreamSource(source) {
      this.streamObserver.disconnectStreamSource(source);
    }
    renderStreamMessage(message) {
      this.streamMessageRenderer.render(StreamMessage.wrap(message));
    }
    clearCache() {
      this.view.clearSnapshotCache();
    }
    setProgressBarDelay(delay) {
      this.progressBarDelay = delay;
    }
    setFormMode(mode) {
      this.formMode = mode;
    }
    get location() {
      return this.history.location;
    }
    get restorationIdentifier() {
      return this.history.restorationIdentifier;
    }
    historyPoppedToLocationWithRestorationIdentifier(location2, restorationIdentifier) {
      if (this.enabled) {
        this.navigator.startVisit(location2, restorationIdentifier, {
          action: "restore",
          historyChanged: true
        });
      } else {
        this.adapter.pageInvalidated({
          reason: "turbo_disabled"
        });
      }
    }
    scrollPositionChanged(position) {
      this.history.updateRestorationData({ scrollPosition: position });
    }
    willSubmitFormLinkToLocation(link2, location2) {
      return this.elementIsNavigatable(link2) && locationIsVisitable(location2, this.snapshot.rootLocation);
    }
    submittedFormLinkToLocation() {
    }
    willFollowLinkToLocation(link2, location2, event) {
      return this.elementIsNavigatable(link2) && locationIsVisitable(location2, this.snapshot.rootLocation) && this.applicationAllowsFollowingLinkToLocation(link2, location2, event);
    }
    followedLinkToLocation(link2, location2) {
      const action = this.getActionForLink(link2);
      const acceptsStreamResponse = link2.hasAttribute("data-turbo-stream");
      this.visit(location2.href, { action, acceptsStreamResponse });
    }
    allowsVisitingLocationWithAction(location2, action) {
      return this.locationWithActionIsSamePage(location2, action) || this.applicationAllowsVisitingLocation(location2);
    }
    visitProposedToLocation(location2, options) {
      extendURLWithDeprecatedProperties(location2);
      this.adapter.visitProposedToLocation(location2, options);
    }
    visitStarted(visit2) {
      if (!visit2.acceptsStreamResponse) {
        markAsBusy(document.documentElement);
      }
      extendURLWithDeprecatedProperties(visit2.location);
      if (!visit2.silent) {
        this.notifyApplicationAfterVisitingLocation(visit2.location, visit2.action);
      }
    }
    visitCompleted(visit2) {
      clearBusyState(document.documentElement);
      this.notifyApplicationAfterPageLoad(visit2.getTimingMetrics());
    }
    locationWithActionIsSamePage(location2, action) {
      return this.navigator.locationWithActionIsSamePage(location2, action);
    }
    visitScrolledToSamePageLocation(oldURL, newURL) {
      this.notifyApplicationAfterVisitingSamePageLocation(oldURL, newURL);
    }
    willSubmitForm(form2, submitter) {
      const action = getAction(form2, submitter);
      return this.submissionIsNavigatable(form2, submitter) && locationIsVisitable(expandURL(action), this.snapshot.rootLocation);
    }
    formSubmitted(form2, submitter) {
      this.navigator.submitForm(form2, submitter);
    }
    pageBecameInteractive() {
      this.view.lastRenderedLocation = this.location;
      this.notifyApplicationAfterPageLoad();
    }
    pageLoaded() {
      this.history.assumeControlOfScrollRestoration();
    }
    pageWillUnload() {
      this.history.relinquishControlOfScrollRestoration();
    }
    receivedMessageFromStream(message) {
      this.renderStreamMessage(message);
    }
    viewWillCacheSnapshot() {
      var _a2;
      if (!((_a2 = this.navigator.currentVisit) === null || _a2 === void 0 ? void 0 : _a2.silent)) {
        this.notifyApplicationBeforeCachingSnapshot();
      }
    }
    allowsImmediateRender({ element }, options) {
      const event = this.notifyApplicationBeforeRender(element, options);
      const { defaultPrevented, detail: { render } } = event;
      if (this.view.renderer && render) {
        this.view.renderer.renderElement = render;
      }
      return !defaultPrevented;
    }
    viewRenderedSnapshot(_snapshot, _isPreview) {
      this.view.lastRenderedLocation = this.history.location;
      this.notifyApplicationAfterRender();
    }
    preloadOnLoadLinksForView(element) {
      this.preloader.preloadOnLoadLinksForView(element);
    }
    viewInvalidated(reason) {
      this.adapter.pageInvalidated(reason);
    }
    frameLoaded(frame) {
      this.notifyApplicationAfterFrameLoad(frame);
    }
    frameRendered(fetchResponse, frame) {
      this.notifyApplicationAfterFrameRender(fetchResponse, frame);
    }
    applicationAllowsFollowingLinkToLocation(link2, location2, ev) {
      const event = this.notifyApplicationAfterClickingLinkToLocation(link2, location2, ev);
      return !event.defaultPrevented;
    }
    applicationAllowsVisitingLocation(location2) {
      const event = this.notifyApplicationBeforeVisitingLocation(location2);
      return !event.defaultPrevented;
    }
    notifyApplicationAfterClickingLinkToLocation(link2, location2, event) {
      return dispatch("turbo:click", {
        target: link2,
        detail: { url: location2.href, originalEvent: event },
        cancelable: true
      });
    }
    notifyApplicationBeforeVisitingLocation(location2) {
      return dispatch("turbo:before-visit", {
        detail: { url: location2.href },
        cancelable: true
      });
    }
    notifyApplicationAfterVisitingLocation(location2, action) {
      return dispatch("turbo:visit", { detail: { url: location2.href, action } });
    }
    notifyApplicationBeforeCachingSnapshot() {
      return dispatch("turbo:before-cache");
    }
    notifyApplicationBeforeRender(newBody, options) {
      return dispatch("turbo:before-render", {
        detail: Object.assign({ newBody }, options),
        cancelable: true
      });
    }
    notifyApplicationAfterRender() {
      return dispatch("turbo:render");
    }
    notifyApplicationAfterPageLoad(timing = {}) {
      return dispatch("turbo:load", {
        detail: { url: this.location.href, timing }
      });
    }
    notifyApplicationAfterVisitingSamePageLocation(oldURL, newURL) {
      dispatchEvent(new HashChangeEvent("hashchange", {
        oldURL: oldURL.toString(),
        newURL: newURL.toString()
      }));
    }
    notifyApplicationAfterFrameLoad(frame) {
      return dispatch("turbo:frame-load", { target: frame });
    }
    notifyApplicationAfterFrameRender(fetchResponse, frame) {
      return dispatch("turbo:frame-render", {
        detail: { fetchResponse },
        target: frame,
        cancelable: true
      });
    }
    submissionIsNavigatable(form2, submitter) {
      if (this.formMode == "off") {
        return false;
      } else {
        const submitterIsNavigatable = submitter ? this.elementIsNavigatable(submitter) : true;
        if (this.formMode == "optin") {
          return submitterIsNavigatable && form2.closest('[data-turbo="true"]') != null;
        } else {
          return submitterIsNavigatable && this.elementIsNavigatable(form2);
        }
      }
    }
    elementIsNavigatable(element) {
      const container = element.closest("[data-turbo]");
      const withinFrame = element.closest("turbo-frame");
      if (this.drive || withinFrame) {
        if (container) {
          return container.getAttribute("data-turbo") != "false";
        } else {
          return true;
        }
      } else {
        if (container) {
          return container.getAttribute("data-turbo") == "true";
        } else {
          return false;
        }
      }
    }
    getActionForLink(link2) {
      const action = link2.getAttribute("data-turbo-action");
      return isAction(action) ? action : "advance";
    }
    get snapshot() {
      return this.view.snapshot;
    }
  };
  function extendURLWithDeprecatedProperties(url2) {
    Object.defineProperties(url2, deprecatedLocationPropertyDescriptors);
  }
  var deprecatedLocationPropertyDescriptors = {
    absoluteURL: {
      get() {
        return this.toString();
      }
    }
  };
  var Cache = class {
    constructor(session2) {
      this.session = session2;
    }
    clear() {
      this.session.clearCache();
    }
    resetCacheControl() {
      this.setCacheControl("");
    }
    exemptPageFromCache() {
      this.setCacheControl("no-cache");
    }
    exemptPageFromPreview() {
      this.setCacheControl("no-preview");
    }
    setCacheControl(value) {
      setMetaContent("turbo-cache-control", value);
    }
  };
  var StreamActions = {
    after() {
      this.targetElements.forEach((e) => {
        var _a2;
        return (_a2 = e.parentElement) === null || _a2 === void 0 ? void 0 : _a2.insertBefore(this.templateContent, e.nextSibling);
      });
    },
    append() {
      this.removeDuplicateTargetChildren();
      this.targetElements.forEach((e) => e.append(this.templateContent));
    },
    before() {
      this.targetElements.forEach((e) => {
        var _a2;
        return (_a2 = e.parentElement) === null || _a2 === void 0 ? void 0 : _a2.insertBefore(this.templateContent, e);
      });
    },
    prepend() {
      this.removeDuplicateTargetChildren();
      this.targetElements.forEach((e) => e.prepend(this.templateContent));
    },
    remove() {
      this.targetElements.forEach((e) => e.remove());
    },
    replace() {
      this.targetElements.forEach((e) => e.replaceWith(this.templateContent));
    },
    update() {
      this.targetElements.forEach((e) => e.replaceChildren(this.templateContent));
    }
  };
  var session = new Session();
  var cache = new Cache(session);
  var { navigator: navigator$1 } = session;
  function start() {
    session.start();
  }
  function registerAdapter(adapter) {
    session.registerAdapter(adapter);
  }
  function visit(location2, options) {
    session.visit(location2, options);
  }
  function connectStreamSource(source) {
    session.connectStreamSource(source);
  }
  function disconnectStreamSource(source) {
    session.disconnectStreamSource(source);
  }
  function renderStreamMessage(message) {
    session.renderStreamMessage(message);
  }
  function clearCache() {
    console.warn("Please replace `Turbo.clearCache()` with `Turbo.cache.clear()`. The top-level function is deprecated and will be removed in a future version of Turbo.`");
    session.clearCache();
  }
  function setProgressBarDelay(delay) {
    session.setProgressBarDelay(delay);
  }
  function setConfirmMethod(confirmMethod) {
    FormSubmission.confirmMethod = confirmMethod;
  }
  function setFormMode(mode) {
    session.setFormMode(mode);
  }
  var Turbo = /* @__PURE__ */ Object.freeze({
    __proto__: null,
    navigator: navigator$1,
    session,
    cache,
    PageRenderer,
    PageSnapshot,
    FrameRenderer,
    start,
    registerAdapter,
    visit,
    connectStreamSource,
    disconnectStreamSource,
    renderStreamMessage,
    clearCache,
    setProgressBarDelay,
    setConfirmMethod,
    setFormMode,
    StreamActions
  });
  var FrameController = class {
    constructor(element) {
      this.fetchResponseLoaded = (_fetchResponse) => {
      };
      this.currentFetchRequest = null;
      this.resolveVisitPromise = () => {
      };
      this.connected = false;
      this.hasBeenLoaded = false;
      this.ignoredAttributes = /* @__PURE__ */ new Set();
      this.action = null;
      this.visitCachedSnapshot = ({ element: element2 }) => {
        const frame = element2.querySelector("#" + this.element.id);
        if (frame && this.previousFrameElement) {
          frame.replaceChildren(...this.previousFrameElement.children);
        }
        delete this.previousFrameElement;
      };
      this.element = element;
      this.view = new FrameView(this, this.element);
      this.appearanceObserver = new AppearanceObserver(this, this.element);
      this.formLinkClickObserver = new FormLinkClickObserver(this, this.element);
      this.linkInterceptor = new LinkInterceptor(this, this.element);
      this.restorationIdentifier = uuid();
      this.formSubmitObserver = new FormSubmitObserver(this, this.element);
    }
    connect() {
      if (!this.connected) {
        this.connected = true;
        if (this.loadingStyle == FrameLoadingStyle.lazy) {
          this.appearanceObserver.start();
        } else {
          this.loadSourceURL();
        }
        this.formLinkClickObserver.start();
        this.linkInterceptor.start();
        this.formSubmitObserver.start();
      }
    }
    disconnect() {
      if (this.connected) {
        this.connected = false;
        this.appearanceObserver.stop();
        this.formLinkClickObserver.stop();
        this.linkInterceptor.stop();
        this.formSubmitObserver.stop();
      }
    }
    disabledChanged() {
      if (this.loadingStyle == FrameLoadingStyle.eager) {
        this.loadSourceURL();
      }
    }
    sourceURLChanged() {
      if (this.isIgnoringChangesTo("src"))
        return;
      if (this.element.isConnected) {
        this.complete = false;
      }
      if (this.loadingStyle == FrameLoadingStyle.eager || this.hasBeenLoaded) {
        this.loadSourceURL();
      }
    }
    sourceURLReloaded() {
      const { src } = this.element;
      this.ignoringChangesToAttribute("complete", () => {
        this.element.removeAttribute("complete");
      });
      this.element.src = null;
      this.element.src = src;
      return this.element.loaded;
    }
    completeChanged() {
      if (this.isIgnoringChangesTo("complete"))
        return;
      this.loadSourceURL();
    }
    loadingStyleChanged() {
      if (this.loadingStyle == FrameLoadingStyle.lazy) {
        this.appearanceObserver.start();
      } else {
        this.appearanceObserver.stop();
        this.loadSourceURL();
      }
    }
    async loadSourceURL() {
      if (this.enabled && this.isActive && !this.complete && this.sourceURL) {
        this.element.loaded = this.visit(expandURL(this.sourceURL));
        this.appearanceObserver.stop();
        await this.element.loaded;
        this.hasBeenLoaded = true;
      }
    }
    async loadResponse(fetchResponse) {
      if (fetchResponse.redirected || fetchResponse.succeeded && fetchResponse.isHTML) {
        this.sourceURL = fetchResponse.response.url;
      }
      try {
        const html = await fetchResponse.responseHTML;
        if (html) {
          const { body } = parseHTMLDocument(html);
          const newFrameElement = await this.extractForeignFrameElement(body);
          if (newFrameElement) {
            const snapshot = new Snapshot(newFrameElement);
            const renderer = new FrameRenderer(this, this.view.snapshot, snapshot, FrameRenderer.renderElement, false, false);
            if (this.view.renderPromise)
              await this.view.renderPromise;
            this.changeHistory();
            await this.view.render(renderer);
            this.complete = true;
            session.frameRendered(fetchResponse, this.element);
            session.frameLoaded(this.element);
            this.fetchResponseLoaded(fetchResponse);
          } else if (this.willHandleFrameMissingFromResponse(fetchResponse)) {
            console.warn(`A matching frame for #${this.element.id} was missing from the response, transforming into full-page Visit.`);
            this.visitResponse(fetchResponse.response);
          }
        }
      } catch (error4) {
        console.error(error4);
        this.view.invalidate();
      } finally {
        this.fetchResponseLoaded = () => {
        };
      }
    }
    elementAppearedInViewport(_element) {
      this.loadSourceURL();
    }
    willSubmitFormLinkToLocation(link2) {
      return this.shouldInterceptNavigation(link2);
    }
    submittedFormLinkToLocation(link2, _location, form2) {
      const frame = this.findFrameElement(link2);
      if (frame)
        form2.setAttribute("data-turbo-frame", frame.id);
    }
    shouldInterceptLinkClick(element, _location, _event) {
      return this.shouldInterceptNavigation(element);
    }
    linkClickIntercepted(element, location2) {
      this.navigateFrame(element, location2);
    }
    willSubmitForm(element, submitter) {
      return element.closest("turbo-frame") == this.element && this.shouldInterceptNavigation(element, submitter);
    }
    formSubmitted(element, submitter) {
      if (this.formSubmission) {
        this.formSubmission.stop();
      }
      this.formSubmission = new FormSubmission(this, element, submitter);
      const { fetchRequest } = this.formSubmission;
      this.prepareHeadersForRequest(fetchRequest.headers, fetchRequest);
      this.formSubmission.start();
    }
    prepareHeadersForRequest(headers, request2) {
      var _a2;
      headers["Turbo-Frame"] = this.id;
      if ((_a2 = this.currentNavigationElement) === null || _a2 === void 0 ? void 0 : _a2.hasAttribute("data-turbo-stream")) {
        request2.acceptResponseType(StreamMessage.contentType);
      }
    }
    requestStarted(_request) {
      markAsBusy(this.element);
    }
    requestPreventedHandlingResponse(_request, _response) {
      this.resolveVisitPromise();
    }
    async requestSucceededWithResponse(request2, response) {
      await this.loadResponse(response);
      this.resolveVisitPromise();
    }
    async requestFailedWithResponse(request2, response) {
      console.error(response);
      await this.loadResponse(response);
      this.resolveVisitPromise();
    }
    requestErrored(request2, error4) {
      console.error(error4);
      this.resolveVisitPromise();
    }
    requestFinished(_request) {
      clearBusyState(this.element);
    }
    formSubmissionStarted({ formElement }) {
      markAsBusy(formElement, this.findFrameElement(formElement));
    }
    formSubmissionSucceededWithResponse(formSubmission, response) {
      const frame = this.findFrameElement(formSubmission.formElement, formSubmission.submitter);
      frame.delegate.proposeVisitIfNavigatedWithAction(frame, formSubmission.formElement, formSubmission.submitter);
      frame.delegate.loadResponse(response);
    }
    formSubmissionFailedWithResponse(formSubmission, fetchResponse) {
      this.element.delegate.loadResponse(fetchResponse);
    }
    formSubmissionErrored(formSubmission, error4) {
      console.error(error4);
    }
    formSubmissionFinished({ formElement }) {
      clearBusyState(formElement, this.findFrameElement(formElement));
    }
    allowsImmediateRender({ element: newFrame }, options) {
      const event = dispatch("turbo:before-frame-render", {
        target: this.element,
        detail: Object.assign({ newFrame }, options),
        cancelable: true
      });
      const { defaultPrevented, detail: { render } } = event;
      if (this.view.renderer && render) {
        this.view.renderer.renderElement = render;
      }
      return !defaultPrevented;
    }
    viewRenderedSnapshot(_snapshot, _isPreview) {
    }
    preloadOnLoadLinksForView(element) {
      session.preloadOnLoadLinksForView(element);
    }
    viewInvalidated() {
    }
    willRenderFrame(currentElement, _newElement) {
      this.previousFrameElement = currentElement.cloneNode(true);
    }
    async visit(url2) {
      var _a2;
      const request2 = new FetchRequest(this, FetchMethod.get, url2, new URLSearchParams(), this.element);
      (_a2 = this.currentFetchRequest) === null || _a2 === void 0 ? void 0 : _a2.cancel();
      this.currentFetchRequest = request2;
      return new Promise((resolve) => {
        this.resolveVisitPromise = () => {
          this.resolveVisitPromise = () => {
          };
          this.currentFetchRequest = null;
          resolve();
        };
        request2.perform();
      });
    }
    navigateFrame(element, url2, submitter) {
      const frame = this.findFrameElement(element, submitter);
      this.pageSnapshot = PageSnapshot.fromElement(frame).clone();
      frame.delegate.proposeVisitIfNavigatedWithAction(frame, element, submitter);
      this.withCurrentNavigationElement(element, () => {
        frame.src = url2;
      });
    }
    proposeVisitIfNavigatedWithAction(frame, element, submitter) {
      this.action = getVisitAction(submitter, element, frame);
      if (isAction(this.action)) {
        const { visitCachedSnapshot } = frame.delegate;
        frame.delegate.fetchResponseLoaded = (fetchResponse) => {
          if (frame.src) {
            const { statusCode, redirected } = fetchResponse;
            const responseHTML = frame.ownerDocument.documentElement.outerHTML;
            const response = { statusCode, redirected, responseHTML };
            const options = {
              response,
              visitCachedSnapshot,
              willRender: false,
              updateHistory: false,
              restorationIdentifier: this.restorationIdentifier,
              snapshot: this.pageSnapshot
            };
            if (this.action)
              options.action = this.action;
            session.visit(frame.src, options);
          }
        };
      }
    }
    changeHistory() {
      if (this.action) {
        const method2 = getHistoryMethodForAction(this.action);
        session.history.update(method2, expandURL(this.element.src || ""), this.restorationIdentifier);
      }
    }
    willHandleFrameMissingFromResponse(fetchResponse) {
      this.element.setAttribute("complete", "");
      const response = fetchResponse.response;
      const visit2 = async (url2, options = {}) => {
        if (url2 instanceof Response) {
          this.visitResponse(url2);
        } else {
          session.visit(url2, options);
        }
      };
      const event = dispatch("turbo:frame-missing", {
        target: this.element,
        detail: { response, visit: visit2 },
        cancelable: true
      });
      return !event.defaultPrevented;
    }
    async visitResponse(response) {
      const wrapped = new FetchResponse(response);
      const responseHTML = await wrapped.responseHTML;
      const { location: location2, redirected, statusCode } = wrapped;
      return session.visit(location2, { response: { redirected, statusCode, responseHTML } });
    }
    findFrameElement(element, submitter) {
      var _a2;
      const id = getAttribute("data-turbo-frame", submitter, element) || this.element.getAttribute("target");
      return (_a2 = getFrameElementById(id)) !== null && _a2 !== void 0 ? _a2 : this.element;
    }
    async extractForeignFrameElement(container) {
      let element;
      const id = CSS.escape(this.id);
      try {
        element = activateElement(container.querySelector(`turbo-frame#${id}`), this.sourceURL);
        if (element) {
          return element;
        }
        element = activateElement(container.querySelector(`turbo-frame[src][recurse~=${id}]`), this.sourceURL);
        if (element) {
          await element.loaded;
          return await this.extractForeignFrameElement(element);
        }
      } catch (error4) {
        console.error(error4);
        return new FrameElement();
      }
      return null;
    }
    formActionIsVisitable(form2, submitter) {
      const action = getAction(form2, submitter);
      return locationIsVisitable(expandURL(action), this.rootLocation);
    }
    shouldInterceptNavigation(element, submitter) {
      const id = getAttribute("data-turbo-frame", submitter, element) || this.element.getAttribute("target");
      if (element instanceof HTMLFormElement && !this.formActionIsVisitable(element, submitter)) {
        return false;
      }
      if (!this.enabled || id == "_top") {
        return false;
      }
      if (id) {
        const frameElement = getFrameElementById(id);
        if (frameElement) {
          return !frameElement.disabled;
        }
      }
      if (!session.elementIsNavigatable(element)) {
        return false;
      }
      if (submitter && !session.elementIsNavigatable(submitter)) {
        return false;
      }
      return true;
    }
    get id() {
      return this.element.id;
    }
    get enabled() {
      return !this.element.disabled;
    }
    get sourceURL() {
      if (this.element.src) {
        return this.element.src;
      }
    }
    set sourceURL(sourceURL) {
      this.ignoringChangesToAttribute("src", () => {
        this.element.src = sourceURL !== null && sourceURL !== void 0 ? sourceURL : null;
      });
    }
    get loadingStyle() {
      return this.element.loading;
    }
    get isLoading() {
      return this.formSubmission !== void 0 || this.resolveVisitPromise() !== void 0;
    }
    get complete() {
      return this.element.hasAttribute("complete");
    }
    set complete(value) {
      this.ignoringChangesToAttribute("complete", () => {
        if (value) {
          this.element.setAttribute("complete", "");
        } else {
          this.element.removeAttribute("complete");
        }
      });
    }
    get isActive() {
      return this.element.isActive && this.connected;
    }
    get rootLocation() {
      var _a2;
      const meta = this.element.ownerDocument.querySelector(`meta[name="turbo-root"]`);
      const root = (_a2 = meta === null || meta === void 0 ? void 0 : meta.content) !== null && _a2 !== void 0 ? _a2 : "/";
      return expandURL(root);
    }
    isIgnoringChangesTo(attributeName) {
      return this.ignoredAttributes.has(attributeName);
    }
    ignoringChangesToAttribute(attributeName, callback) {
      this.ignoredAttributes.add(attributeName);
      callback();
      this.ignoredAttributes.delete(attributeName);
    }
    withCurrentNavigationElement(element, callback) {
      this.currentNavigationElement = element;
      callback();
      delete this.currentNavigationElement;
    }
  };
  function getFrameElementById(id) {
    if (id != null) {
      const element = document.getElementById(id);
      if (element instanceof FrameElement) {
        return element;
      }
    }
  }
  function activateElement(element, currentURL) {
    if (element) {
      const src = element.getAttribute("src");
      if (src != null && currentURL != null && urlsAreEqual(src, currentURL)) {
        throw new Error(`Matching <turbo-frame id="${element.id}"> element has a source URL which references itself`);
      }
      if (element.ownerDocument !== document) {
        element = document.importNode(element, true);
      }
      if (element instanceof FrameElement) {
        element.connectedCallback();
        element.disconnectedCallback();
        return element;
      }
    }
  }
  var StreamElement = class extends HTMLElement {
    static async renderElement(newElement) {
      await newElement.performAction();
    }
    async connectedCallback() {
      try {
        await this.render();
      } catch (error4) {
        console.error(error4);
      } finally {
        this.disconnect();
      }
    }
    async render() {
      var _a2;
      return (_a2 = this.renderPromise) !== null && _a2 !== void 0 ? _a2 : this.renderPromise = (async () => {
        const event = this.beforeRenderEvent;
        if (this.dispatchEvent(event)) {
          await nextAnimationFrame();
          await event.detail.render(this);
        }
      })();
    }
    disconnect() {
      try {
        this.remove();
      } catch (_a2) {
      }
    }
    removeDuplicateTargetChildren() {
      this.duplicateChildren.forEach((c) => c.remove());
    }
    get duplicateChildren() {
      var _a2;
      const existingChildren = this.targetElements.flatMap((e) => [...e.children]).filter((c) => !!c.id);
      const newChildrenIds = [...((_a2 = this.templateContent) === null || _a2 === void 0 ? void 0 : _a2.children) || []].filter((c) => !!c.id).map((c) => c.id);
      return existingChildren.filter((c) => newChildrenIds.includes(c.id));
    }
    get performAction() {
      if (this.action) {
        const actionFunction = StreamActions[this.action];
        if (actionFunction) {
          return actionFunction;
        }
        this.raise("unknown action");
      }
      this.raise("action attribute is missing");
    }
    get targetElements() {
      if (this.target) {
        return this.targetElementsById;
      } else if (this.targets) {
        return this.targetElementsByQuery;
      } else {
        this.raise("target or targets attribute is missing");
      }
    }
    get templateContent() {
      return this.templateElement.content.cloneNode(true);
    }
    get templateElement() {
      if (this.firstElementChild === null) {
        const template2 = this.ownerDocument.createElement("template");
        this.appendChild(template2);
        return template2;
      } else if (this.firstElementChild instanceof HTMLTemplateElement) {
        return this.firstElementChild;
      }
      this.raise("first child element must be a <template> element");
    }
    get action() {
      return this.getAttribute("action");
    }
    get target() {
      return this.getAttribute("target");
    }
    get targets() {
      return this.getAttribute("targets");
    }
    raise(message) {
      throw new Error(`${this.description}: ${message}`);
    }
    get description() {
      var _a2, _b;
      return (_b = ((_a2 = this.outerHTML.match(/<[^>]+>/)) !== null && _a2 !== void 0 ? _a2 : [])[0]) !== null && _b !== void 0 ? _b : "<turbo-stream>";
    }
    get beforeRenderEvent() {
      return new CustomEvent("turbo:before-stream-render", {
        bubbles: true,
        cancelable: true,
        detail: { newStream: this, render: StreamElement.renderElement }
      });
    }
    get targetElementsById() {
      var _a2;
      const element = (_a2 = this.ownerDocument) === null || _a2 === void 0 ? void 0 : _a2.getElementById(this.target);
      if (element !== null) {
        return [element];
      } else {
        return [];
      }
    }
    get targetElementsByQuery() {
      var _a2;
      const elements = (_a2 = this.ownerDocument) === null || _a2 === void 0 ? void 0 : _a2.querySelectorAll(this.targets);
      if (elements.length !== 0) {
        return Array.prototype.slice.call(elements);
      } else {
        return [];
      }
    }
  };
  var StreamSourceElement = class extends HTMLElement {
    constructor() {
      super(...arguments);
      this.streamSource = null;
    }
    connectedCallback() {
      this.streamSource = this.src.match(/^ws{1,2}:/) ? new WebSocket(this.src) : new EventSource(this.src);
      connectStreamSource(this.streamSource);
    }
    disconnectedCallback() {
      if (this.streamSource) {
        disconnectStreamSource(this.streamSource);
      }
    }
    get src() {
      return this.getAttribute("src") || "";
    }
  };
  FrameElement.delegateConstructor = FrameController;
  if (customElements.get("turbo-frame") === void 0) {
    customElements.define("turbo-frame", FrameElement);
  }
  if (customElements.get("turbo-stream") === void 0) {
    customElements.define("turbo-stream", StreamElement);
  }
  if (customElements.get("turbo-stream-source") === void 0) {
    customElements.define("turbo-stream-source", StreamSourceElement);
  }
  (() => {
    let element = document.currentScript;
    if (!element)
      return;
    if (element.hasAttribute("data-turbo-suppress-warning"))
      return;
    element = element.parentElement;
    while (element) {
      if (element == document.body) {
        return console.warn(unindent`
        You are loading Turbo from a <script> element inside the <body> element. This is probably not what you meant to do!

        Load your application’s JavaScript bundle inside the <head> element instead. <script> elements in <body> are evaluated with each page change.

        For more information, see: https://turbo.hotwired.dev/handbook/building#working-with-script-elements

        ——
        Suppress this warning by adding a "data-turbo-suppress-warning" attribute to: %s
      `, element.outerHTML);
      }
      element = element.parentElement;
    }
  })();
  window.Turbo = Turbo;
  start();

  // ../../node_modules/@hotwired/turbo-rails/app/javascript/turbo/cable.js
  var consumer;
  async function getConsumer() {
    return consumer || setConsumer(createConsumer2().then(setConsumer));
  }
  function setConsumer(newConsumer) {
    return consumer = newConsumer;
  }
  async function createConsumer2() {
    const { createConsumer: createConsumer4 } = await Promise.resolve().then(() => (init_src(), src_exports));
    return createConsumer4();
  }
  async function subscribeTo(channel, mixin) {
    const { subscriptions } = await getConsumer();
    return subscriptions.create(channel, mixin);
  }

  // ../../node_modules/@hotwired/turbo-rails/app/javascript/turbo/snakeize.js
  function walk(obj) {
    if (!obj || typeof obj !== "object")
      return obj;
    if (obj instanceof Date || obj instanceof RegExp)
      return obj;
    if (Array.isArray(obj))
      return obj.map(walk);
    return Object.keys(obj).reduce(function(acc, key) {
      var camel = key[0].toLowerCase() + key.slice(1).replace(/([A-Z]+)/g, function(m2, x) {
        return "_" + x.toLowerCase();
      });
      acc[camel] = walk(obj[key]);
      return acc;
    }, {});
  }

  // ../../node_modules/@hotwired/turbo-rails/app/javascript/turbo/cable_stream_source_element.js
  var TurboCableStreamSourceElement = class extends HTMLElement {
    async connectedCallback() {
      connectStreamSource(this);
      this.subscription = await subscribeTo(this.channel, { received: this.dispatchMessageEvent.bind(this) });
    }
    disconnectedCallback() {
      disconnectStreamSource(this);
      if (this.subscription)
        this.subscription.unsubscribe();
    }
    dispatchMessageEvent(data2) {
      const event = new MessageEvent("message", { data: data2 });
      return this.dispatchEvent(event);
    }
    get channel() {
      const channel = this.getAttribute("channel");
      const signed_stream_name = this.getAttribute("signed-stream-name");
      return { channel, signed_stream_name, ...walk({ ...this.dataset }) };
    }
  };
  customElements.define("turbo-cable-stream-source", TurboCableStreamSourceElement);

  // ../../node_modules/@hotwired/turbo-rails/app/javascript/turbo/fetch_requests.js
  function encodeMethodIntoRequestBody(event) {
    if (event.target instanceof HTMLFormElement) {
      const { target: form2, detail: { fetchOptions } } = event;
      form2.addEventListener("turbo:submit-start", ({ detail: { formSubmission: { submitter } } }) => {
        const method2 = submitter && submitter.formMethod || fetchOptions.body && fetchOptions.body.get("_method") || form2.getAttribute("method");
        if (!/get/i.test(method2)) {
          if (/post/i.test(method2)) {
            fetchOptions.body.delete("_method");
          } else {
            fetchOptions.body.set("_method", method2);
          }
          fetchOptions.method = "post";
        }
      }, { once: true });
    }
  }

  // ../../node_modules/@hotwired/turbo-rails/app/javascript/turbo/index.js
  addEventListener("turbo:before-fetch-request", encodeMethodIntoRequestBody);

  // ../../node_modules/@hotwired/stimulus/dist/stimulus.js
  var EventListener = class {
    constructor(eventTarget, eventName, eventOptions) {
      this.eventTarget = eventTarget;
      this.eventName = eventName;
      this.eventOptions = eventOptions;
      this.unorderedBindings = /* @__PURE__ */ new Set();
    }
    connect() {
      this.eventTarget.addEventListener(this.eventName, this, this.eventOptions);
    }
    disconnect() {
      this.eventTarget.removeEventListener(this.eventName, this, this.eventOptions);
    }
    bindingConnected(binding) {
      this.unorderedBindings.add(binding);
    }
    bindingDisconnected(binding) {
      this.unorderedBindings.delete(binding);
    }
    handleEvent(event) {
      const extendedEvent = extendEvent(event);
      for (const binding of this.bindings) {
        if (extendedEvent.immediatePropagationStopped) {
          break;
        } else {
          binding.handleEvent(extendedEvent);
        }
      }
    }
    hasBindings() {
      return this.unorderedBindings.size > 0;
    }
    get bindings() {
      return Array.from(this.unorderedBindings).sort((left, right) => {
        const leftIndex = left.index, rightIndex = right.index;
        return leftIndex < rightIndex ? -1 : leftIndex > rightIndex ? 1 : 0;
      });
    }
  };
  function extendEvent(event) {
    if ("immediatePropagationStopped" in event) {
      return event;
    } else {
      const { stopImmediatePropagation } = event;
      return Object.assign(event, {
        immediatePropagationStopped: false,
        stopImmediatePropagation() {
          this.immediatePropagationStopped = true;
          stopImmediatePropagation.call(this);
        }
      });
    }
  }
  var Dispatcher = class {
    constructor(application2) {
      this.application = application2;
      this.eventListenerMaps = /* @__PURE__ */ new Map();
      this.started = false;
    }
    start() {
      if (!this.started) {
        this.started = true;
        this.eventListeners.forEach((eventListener) => eventListener.connect());
      }
    }
    stop() {
      if (this.started) {
        this.started = false;
        this.eventListeners.forEach((eventListener) => eventListener.disconnect());
      }
    }
    get eventListeners() {
      return Array.from(this.eventListenerMaps.values()).reduce((listeners, map) => listeners.concat(Array.from(map.values())), []);
    }
    bindingConnected(binding) {
      this.fetchEventListenerForBinding(binding).bindingConnected(binding);
    }
    bindingDisconnected(binding, clearEventListeners = false) {
      this.fetchEventListenerForBinding(binding).bindingDisconnected(binding);
      if (clearEventListeners)
        this.clearEventListenersForBinding(binding);
    }
    handleError(error4, message, detail = {}) {
      this.application.handleError(error4, `Error ${message}`, detail);
    }
    clearEventListenersForBinding(binding) {
      const eventListener = this.fetchEventListenerForBinding(binding);
      if (!eventListener.hasBindings()) {
        eventListener.disconnect();
        this.removeMappedEventListenerFor(binding);
      }
    }
    removeMappedEventListenerFor(binding) {
      const { eventTarget, eventName, eventOptions } = binding;
      const eventListenerMap = this.fetchEventListenerMapForEventTarget(eventTarget);
      const cacheKey = this.cacheKey(eventName, eventOptions);
      eventListenerMap.delete(cacheKey);
      if (eventListenerMap.size == 0)
        this.eventListenerMaps.delete(eventTarget);
    }
    fetchEventListenerForBinding(binding) {
      const { eventTarget, eventName, eventOptions } = binding;
      return this.fetchEventListener(eventTarget, eventName, eventOptions);
    }
    fetchEventListener(eventTarget, eventName, eventOptions) {
      const eventListenerMap = this.fetchEventListenerMapForEventTarget(eventTarget);
      const cacheKey = this.cacheKey(eventName, eventOptions);
      let eventListener = eventListenerMap.get(cacheKey);
      if (!eventListener) {
        eventListener = this.createEventListener(eventTarget, eventName, eventOptions);
        eventListenerMap.set(cacheKey, eventListener);
      }
      return eventListener;
    }
    createEventListener(eventTarget, eventName, eventOptions) {
      const eventListener = new EventListener(eventTarget, eventName, eventOptions);
      if (this.started) {
        eventListener.connect();
      }
      return eventListener;
    }
    fetchEventListenerMapForEventTarget(eventTarget) {
      let eventListenerMap = this.eventListenerMaps.get(eventTarget);
      if (!eventListenerMap) {
        eventListenerMap = /* @__PURE__ */ new Map();
        this.eventListenerMaps.set(eventTarget, eventListenerMap);
      }
      return eventListenerMap;
    }
    cacheKey(eventName, eventOptions) {
      const parts = [eventName];
      Object.keys(eventOptions).sort().forEach((key) => {
        parts.push(`${eventOptions[key] ? "" : "!"}${key}`);
      });
      return parts.join(":");
    }
  };
  var defaultActionDescriptorFilters = {
    stop({ event, value }) {
      if (value)
        event.stopPropagation();
      return true;
    },
    prevent({ event, value }) {
      if (value)
        event.preventDefault();
      return true;
    },
    self({ event, value, element }) {
      if (value) {
        return element === event.target;
      } else {
        return true;
      }
    }
  };
  var descriptorPattern = /^((.+?)(@(window|document))?->)?(.+?)(#([^:]+?))(:(.+))?$/;
  function parseActionDescriptorString(descriptorString) {
    const source = descriptorString.trim();
    const matches2 = source.match(descriptorPattern) || [];
    return {
      eventTarget: parseEventTarget(matches2[4]),
      eventName: matches2[2],
      eventOptions: matches2[9] ? parseEventOptions(matches2[9]) : {},
      identifier: matches2[5],
      methodName: matches2[7]
    };
  }
  function parseEventTarget(eventTargetName) {
    if (eventTargetName == "window") {
      return window;
    } else if (eventTargetName == "document") {
      return document;
    }
  }
  function parseEventOptions(eventOptions) {
    return eventOptions.split(":").reduce((options, token) => Object.assign(options, { [token.replace(/^!/, "")]: !/^!/.test(token) }), {});
  }
  function stringifyEventTarget(eventTarget) {
    if (eventTarget == window) {
      return "window";
    } else if (eventTarget == document) {
      return "document";
    }
  }
  function camelize(value) {
    return value.replace(/(?:[_-])([a-z0-9])/g, (_, char) => char.toUpperCase());
  }
  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
  function dasherize(value) {
    return value.replace(/([A-Z])/g, (_, char) => `-${char.toLowerCase()}`);
  }
  function tokenize(value) {
    return value.match(/[^\s]+/g) || [];
  }
  var Action = class {
    constructor(element, index, descriptor) {
      this.element = element;
      this.index = index;
      this.eventTarget = descriptor.eventTarget || element;
      this.eventName = descriptor.eventName || getDefaultEventNameForElement(element) || error("missing event name");
      this.eventOptions = descriptor.eventOptions || {};
      this.identifier = descriptor.identifier || error("missing identifier");
      this.methodName = descriptor.methodName || error("missing method name");
    }
    static forToken(token) {
      return new this(token.element, token.index, parseActionDescriptorString(token.content));
    }
    toString() {
      const eventNameSuffix = this.eventTargetName ? `@${this.eventTargetName}` : "";
      return `${this.eventName}${eventNameSuffix}->${this.identifier}#${this.methodName}`;
    }
    get params() {
      const params2 = {};
      const pattern = new RegExp(`^data-${this.identifier}-(.+)-param$`, "i");
      for (const { name, value } of Array.from(this.element.attributes)) {
        const match = name.match(pattern);
        const key = match && match[1];
        if (key) {
          params2[camelize(key)] = typecast(value);
        }
      }
      return params2;
    }
    get eventTargetName() {
      return stringifyEventTarget(this.eventTarget);
    }
  };
  var defaultEventNames = {
    a: () => "click",
    button: () => "click",
    form: () => "submit",
    details: () => "toggle",
    input: (e) => e.getAttribute("type") == "submit" ? "click" : "input",
    select: () => "change",
    textarea: () => "input"
  };
  function getDefaultEventNameForElement(element) {
    const tagName = element.tagName.toLowerCase();
    if (tagName in defaultEventNames) {
      return defaultEventNames[tagName](element);
    }
  }
  function error(message) {
    throw new Error(message);
  }
  function typecast(value) {
    try {
      return JSON.parse(value);
    } catch (o_O) {
      return value;
    }
  }
  var Binding = class {
    constructor(context, action) {
      this.context = context;
      this.action = action;
    }
    get index() {
      return this.action.index;
    }
    get eventTarget() {
      return this.action.eventTarget;
    }
    get eventOptions() {
      return this.action.eventOptions;
    }
    get identifier() {
      return this.context.identifier;
    }
    handleEvent(event) {
      if (this.willBeInvokedByEvent(event) && this.applyEventModifiers(event)) {
        this.invokeWithEvent(event);
      }
    }
    get eventName() {
      return this.action.eventName;
    }
    get method() {
      const method2 = this.controller[this.methodName];
      if (typeof method2 == "function") {
        return method2;
      }
      throw new Error(`Action "${this.action}" references undefined method "${this.methodName}"`);
    }
    applyEventModifiers(event) {
      const { element } = this.action;
      const { actionDescriptorFilters } = this.context.application;
      let passes = true;
      for (const [name, value] of Object.entries(this.eventOptions)) {
        if (name in actionDescriptorFilters) {
          const filter = actionDescriptorFilters[name];
          passes = passes && filter({ name, value, event, element });
        } else {
          continue;
        }
      }
      return passes;
    }
    invokeWithEvent(event) {
      const { target, currentTarget } = event;
      try {
        const { params: params2 } = this.action;
        const actionEvent = Object.assign(event, { params: params2 });
        this.method.call(this.controller, actionEvent);
        this.context.logDebugActivity(this.methodName, { event, target, currentTarget, action: this.methodName });
      } catch (error4) {
        const { identifier, controller, element, index } = this;
        const detail = { identifier, controller, element, index, event };
        this.context.handleError(error4, `invoking action "${this.action}"`, detail);
      }
    }
    willBeInvokedByEvent(event) {
      const eventTarget = event.target;
      if (this.element === eventTarget) {
        return true;
      } else if (eventTarget instanceof Element && this.element.contains(eventTarget)) {
        return this.scope.containsElement(eventTarget);
      } else {
        return this.scope.containsElement(this.action.element);
      }
    }
    get controller() {
      return this.context.controller;
    }
    get methodName() {
      return this.action.methodName;
    }
    get element() {
      return this.scope.element;
    }
    get scope() {
      return this.context.scope;
    }
  };
  var ElementObserver = class {
    constructor(element, delegate2) {
      this.mutationObserverInit = { attributes: true, childList: true, subtree: true };
      this.element = element;
      this.started = false;
      this.delegate = delegate2;
      this.elements = /* @__PURE__ */ new Set();
      this.mutationObserver = new MutationObserver((mutations) => this.processMutations(mutations));
    }
    start() {
      if (!this.started) {
        this.started = true;
        this.mutationObserver.observe(this.element, this.mutationObserverInit);
        this.refresh();
      }
    }
    pause(callback) {
      if (this.started) {
        this.mutationObserver.disconnect();
        this.started = false;
      }
      callback();
      if (!this.started) {
        this.mutationObserver.observe(this.element, this.mutationObserverInit);
        this.started = true;
      }
    }
    stop() {
      if (this.started) {
        this.mutationObserver.takeRecords();
        this.mutationObserver.disconnect();
        this.started = false;
      }
    }
    refresh() {
      if (this.started) {
        const matches2 = new Set(this.matchElementsInTree());
        for (const element of Array.from(this.elements)) {
          if (!matches2.has(element)) {
            this.removeElement(element);
          }
        }
        for (const element of Array.from(matches2)) {
          this.addElement(element);
        }
      }
    }
    processMutations(mutations) {
      if (this.started) {
        for (const mutation of mutations) {
          this.processMutation(mutation);
        }
      }
    }
    processMutation(mutation) {
      if (mutation.type == "attributes") {
        this.processAttributeChange(mutation.target, mutation.attributeName);
      } else if (mutation.type == "childList") {
        this.processRemovedNodes(mutation.removedNodes);
        this.processAddedNodes(mutation.addedNodes);
      }
    }
    processAttributeChange(node, attributeName) {
      const element = node;
      if (this.elements.has(element)) {
        if (this.delegate.elementAttributeChanged && this.matchElement(element)) {
          this.delegate.elementAttributeChanged(element, attributeName);
        } else {
          this.removeElement(element);
        }
      } else if (this.matchElement(element)) {
        this.addElement(element);
      }
    }
    processRemovedNodes(nodes) {
      for (const node of Array.from(nodes)) {
        const element = this.elementFromNode(node);
        if (element) {
          this.processTree(element, this.removeElement);
        }
      }
    }
    processAddedNodes(nodes) {
      for (const node of Array.from(nodes)) {
        const element = this.elementFromNode(node);
        if (element && this.elementIsActive(element)) {
          this.processTree(element, this.addElement);
        }
      }
    }
    matchElement(element) {
      return this.delegate.matchElement(element);
    }
    matchElementsInTree(tree = this.element) {
      return this.delegate.matchElementsInTree(tree);
    }
    processTree(tree, processor) {
      for (const element of this.matchElementsInTree(tree)) {
        processor.call(this, element);
      }
    }
    elementFromNode(node) {
      if (node.nodeType == Node.ELEMENT_NODE) {
        return node;
      }
    }
    elementIsActive(element) {
      if (element.isConnected != this.element.isConnected) {
        return false;
      } else {
        return this.element.contains(element);
      }
    }
    addElement(element) {
      if (!this.elements.has(element)) {
        if (this.elementIsActive(element)) {
          this.elements.add(element);
          if (this.delegate.elementMatched) {
            this.delegate.elementMatched(element);
          }
        }
      }
    }
    removeElement(element) {
      if (this.elements.has(element)) {
        this.elements.delete(element);
        if (this.delegate.elementUnmatched) {
          this.delegate.elementUnmatched(element);
        }
      }
    }
  };
  var AttributeObserver = class {
    constructor(element, attributeName, delegate2) {
      this.attributeName = attributeName;
      this.delegate = delegate2;
      this.elementObserver = new ElementObserver(element, this);
    }
    get element() {
      return this.elementObserver.element;
    }
    get selector() {
      return `[${this.attributeName}]`;
    }
    start() {
      this.elementObserver.start();
    }
    pause(callback) {
      this.elementObserver.pause(callback);
    }
    stop() {
      this.elementObserver.stop();
    }
    refresh() {
      this.elementObserver.refresh();
    }
    get started() {
      return this.elementObserver.started;
    }
    matchElement(element) {
      return element.hasAttribute(this.attributeName);
    }
    matchElementsInTree(tree) {
      const match = this.matchElement(tree) ? [tree] : [];
      const matches2 = Array.from(tree.querySelectorAll(this.selector));
      return match.concat(matches2);
    }
    elementMatched(element) {
      if (this.delegate.elementMatchedAttribute) {
        this.delegate.elementMatchedAttribute(element, this.attributeName);
      }
    }
    elementUnmatched(element) {
      if (this.delegate.elementUnmatchedAttribute) {
        this.delegate.elementUnmatchedAttribute(element, this.attributeName);
      }
    }
    elementAttributeChanged(element, attributeName) {
      if (this.delegate.elementAttributeValueChanged && this.attributeName == attributeName) {
        this.delegate.elementAttributeValueChanged(element, attributeName);
      }
    }
  };
  var StringMapObserver = class {
    constructor(element, delegate2) {
      this.element = element;
      this.delegate = delegate2;
      this.started = false;
      this.stringMap = /* @__PURE__ */ new Map();
      this.mutationObserver = new MutationObserver((mutations) => this.processMutations(mutations));
    }
    start() {
      if (!this.started) {
        this.started = true;
        this.mutationObserver.observe(this.element, { attributes: true, attributeOldValue: true });
        this.refresh();
      }
    }
    stop() {
      if (this.started) {
        this.mutationObserver.takeRecords();
        this.mutationObserver.disconnect();
        this.started = false;
      }
    }
    refresh() {
      if (this.started) {
        for (const attributeName of this.knownAttributeNames) {
          this.refreshAttribute(attributeName, null);
        }
      }
    }
    processMutations(mutations) {
      if (this.started) {
        for (const mutation of mutations) {
          this.processMutation(mutation);
        }
      }
    }
    processMutation(mutation) {
      const attributeName = mutation.attributeName;
      if (attributeName) {
        this.refreshAttribute(attributeName, mutation.oldValue);
      }
    }
    refreshAttribute(attributeName, oldValue) {
      const key = this.delegate.getStringMapKeyForAttribute(attributeName);
      if (key != null) {
        if (!this.stringMap.has(attributeName)) {
          this.stringMapKeyAdded(key, attributeName);
        }
        const value = this.element.getAttribute(attributeName);
        if (this.stringMap.get(attributeName) != value) {
          this.stringMapValueChanged(value, key, oldValue);
        }
        if (value == null) {
          const oldValue2 = this.stringMap.get(attributeName);
          this.stringMap.delete(attributeName);
          if (oldValue2)
            this.stringMapKeyRemoved(key, attributeName, oldValue2);
        } else {
          this.stringMap.set(attributeName, value);
        }
      }
    }
    stringMapKeyAdded(key, attributeName) {
      if (this.delegate.stringMapKeyAdded) {
        this.delegate.stringMapKeyAdded(key, attributeName);
      }
    }
    stringMapValueChanged(value, key, oldValue) {
      if (this.delegate.stringMapValueChanged) {
        this.delegate.stringMapValueChanged(value, key, oldValue);
      }
    }
    stringMapKeyRemoved(key, attributeName, oldValue) {
      if (this.delegate.stringMapKeyRemoved) {
        this.delegate.stringMapKeyRemoved(key, attributeName, oldValue);
      }
    }
    get knownAttributeNames() {
      return Array.from(new Set(this.currentAttributeNames.concat(this.recordedAttributeNames)));
    }
    get currentAttributeNames() {
      return Array.from(this.element.attributes).map((attribute) => attribute.name);
    }
    get recordedAttributeNames() {
      return Array.from(this.stringMap.keys());
    }
  };
  function add(map, key, value) {
    fetch2(map, key).add(value);
  }
  function del(map, key, value) {
    fetch2(map, key).delete(value);
    prune(map, key);
  }
  function fetch2(map, key) {
    let values = map.get(key);
    if (!values) {
      values = /* @__PURE__ */ new Set();
      map.set(key, values);
    }
    return values;
  }
  function prune(map, key) {
    const values = map.get(key);
    if (values != null && values.size == 0) {
      map.delete(key);
    }
  }
  var Multimap = class {
    constructor() {
      this.valuesByKey = /* @__PURE__ */ new Map();
    }
    get keys() {
      return Array.from(this.valuesByKey.keys());
    }
    get values() {
      const sets = Array.from(this.valuesByKey.values());
      return sets.reduce((values, set) => values.concat(Array.from(set)), []);
    }
    get size() {
      const sets = Array.from(this.valuesByKey.values());
      return sets.reduce((size, set) => size + set.size, 0);
    }
    add(key, value) {
      add(this.valuesByKey, key, value);
    }
    delete(key, value) {
      del(this.valuesByKey, key, value);
    }
    has(key, value) {
      const values = this.valuesByKey.get(key);
      return values != null && values.has(value);
    }
    hasKey(key) {
      return this.valuesByKey.has(key);
    }
    hasValue(value) {
      const sets = Array.from(this.valuesByKey.values());
      return sets.some((set) => set.has(value));
    }
    getValuesForKey(key) {
      const values = this.valuesByKey.get(key);
      return values ? Array.from(values) : [];
    }
    getKeysForValue(value) {
      return Array.from(this.valuesByKey).filter(([_key, values]) => values.has(value)).map(([key, _values]) => key);
    }
  };
  var TokenListObserver = class {
    constructor(element, attributeName, delegate2) {
      this.attributeObserver = new AttributeObserver(element, attributeName, this);
      this.delegate = delegate2;
      this.tokensByElement = new Multimap();
    }
    get started() {
      return this.attributeObserver.started;
    }
    start() {
      this.attributeObserver.start();
    }
    pause(callback) {
      this.attributeObserver.pause(callback);
    }
    stop() {
      this.attributeObserver.stop();
    }
    refresh() {
      this.attributeObserver.refresh();
    }
    get element() {
      return this.attributeObserver.element;
    }
    get attributeName() {
      return this.attributeObserver.attributeName;
    }
    elementMatchedAttribute(element) {
      this.tokensMatched(this.readTokensForElement(element));
    }
    elementAttributeValueChanged(element) {
      const [unmatchedTokens, matchedTokens] = this.refreshTokensForElement(element);
      this.tokensUnmatched(unmatchedTokens);
      this.tokensMatched(matchedTokens);
    }
    elementUnmatchedAttribute(element) {
      this.tokensUnmatched(this.tokensByElement.getValuesForKey(element));
    }
    tokensMatched(tokens) {
      tokens.forEach((token) => this.tokenMatched(token));
    }
    tokensUnmatched(tokens) {
      tokens.forEach((token) => this.tokenUnmatched(token));
    }
    tokenMatched(token) {
      this.delegate.tokenMatched(token);
      this.tokensByElement.add(token.element, token);
    }
    tokenUnmatched(token) {
      this.delegate.tokenUnmatched(token);
      this.tokensByElement.delete(token.element, token);
    }
    refreshTokensForElement(element) {
      const previousTokens = this.tokensByElement.getValuesForKey(element);
      const currentTokens = this.readTokensForElement(element);
      const firstDifferingIndex = zip(previousTokens, currentTokens).findIndex(([previousToken, currentToken]) => !tokensAreEqual(previousToken, currentToken));
      if (firstDifferingIndex == -1) {
        return [[], []];
      } else {
        return [previousTokens.slice(firstDifferingIndex), currentTokens.slice(firstDifferingIndex)];
      }
    }
    readTokensForElement(element) {
      const attributeName = this.attributeName;
      const tokenString = element.getAttribute(attributeName) || "";
      return parseTokenString(tokenString, element, attributeName);
    }
  };
  function parseTokenString(tokenString, element, attributeName) {
    return tokenString.trim().split(/\s+/).filter((content) => content.length).map((content, index) => ({ element, attributeName, content, index }));
  }
  function zip(left, right) {
    const length = Math.max(left.length, right.length);
    return Array.from({ length }, (_, index) => [left[index], right[index]]);
  }
  function tokensAreEqual(left, right) {
    return left && right && left.index == right.index && left.content == right.content;
  }
  var ValueListObserver = class {
    constructor(element, attributeName, delegate2) {
      this.tokenListObserver = new TokenListObserver(element, attributeName, this);
      this.delegate = delegate2;
      this.parseResultsByToken = /* @__PURE__ */ new WeakMap();
      this.valuesByTokenByElement = /* @__PURE__ */ new WeakMap();
    }
    get started() {
      return this.tokenListObserver.started;
    }
    start() {
      this.tokenListObserver.start();
    }
    stop() {
      this.tokenListObserver.stop();
    }
    refresh() {
      this.tokenListObserver.refresh();
    }
    get element() {
      return this.tokenListObserver.element;
    }
    get attributeName() {
      return this.tokenListObserver.attributeName;
    }
    tokenMatched(token) {
      const { element } = token;
      const { value } = this.fetchParseResultForToken(token);
      if (value) {
        this.fetchValuesByTokenForElement(element).set(token, value);
        this.delegate.elementMatchedValue(element, value);
      }
    }
    tokenUnmatched(token) {
      const { element } = token;
      const { value } = this.fetchParseResultForToken(token);
      if (value) {
        this.fetchValuesByTokenForElement(element).delete(token);
        this.delegate.elementUnmatchedValue(element, value);
      }
    }
    fetchParseResultForToken(token) {
      let parseResult = this.parseResultsByToken.get(token);
      if (!parseResult) {
        parseResult = this.parseToken(token);
        this.parseResultsByToken.set(token, parseResult);
      }
      return parseResult;
    }
    fetchValuesByTokenForElement(element) {
      let valuesByToken = this.valuesByTokenByElement.get(element);
      if (!valuesByToken) {
        valuesByToken = /* @__PURE__ */ new Map();
        this.valuesByTokenByElement.set(element, valuesByToken);
      }
      return valuesByToken;
    }
    parseToken(token) {
      try {
        const value = this.delegate.parseValueForToken(token);
        return { value };
      } catch (error4) {
        return { error: error4 };
      }
    }
  };
  var BindingObserver = class {
    constructor(context, delegate2) {
      this.context = context;
      this.delegate = delegate2;
      this.bindingsByAction = /* @__PURE__ */ new Map();
    }
    start() {
      if (!this.valueListObserver) {
        this.valueListObserver = new ValueListObserver(this.element, this.actionAttribute, this);
        this.valueListObserver.start();
      }
    }
    stop() {
      if (this.valueListObserver) {
        this.valueListObserver.stop();
        delete this.valueListObserver;
        this.disconnectAllActions();
      }
    }
    get element() {
      return this.context.element;
    }
    get identifier() {
      return this.context.identifier;
    }
    get actionAttribute() {
      return this.schema.actionAttribute;
    }
    get schema() {
      return this.context.schema;
    }
    get bindings() {
      return Array.from(this.bindingsByAction.values());
    }
    connectAction(action) {
      const binding = new Binding(this.context, action);
      this.bindingsByAction.set(action, binding);
      this.delegate.bindingConnected(binding);
    }
    disconnectAction(action) {
      const binding = this.bindingsByAction.get(action);
      if (binding) {
        this.bindingsByAction.delete(action);
        this.delegate.bindingDisconnected(binding);
      }
    }
    disconnectAllActions() {
      this.bindings.forEach((binding) => this.delegate.bindingDisconnected(binding, true));
      this.bindingsByAction.clear();
    }
    parseValueForToken(token) {
      const action = Action.forToken(token);
      if (action.identifier == this.identifier) {
        return action;
      }
    }
    elementMatchedValue(element, action) {
      this.connectAction(action);
    }
    elementUnmatchedValue(element, action) {
      this.disconnectAction(action);
    }
  };
  var ValueObserver = class {
    constructor(context, receiver) {
      this.context = context;
      this.receiver = receiver;
      this.stringMapObserver = new StringMapObserver(this.element, this);
      this.valueDescriptorMap = this.controller.valueDescriptorMap;
    }
    start() {
      this.stringMapObserver.start();
      this.invokeChangedCallbacksForDefaultValues();
    }
    stop() {
      this.stringMapObserver.stop();
    }
    get element() {
      return this.context.element;
    }
    get controller() {
      return this.context.controller;
    }
    getStringMapKeyForAttribute(attributeName) {
      if (attributeName in this.valueDescriptorMap) {
        return this.valueDescriptorMap[attributeName].name;
      }
    }
    stringMapKeyAdded(key, attributeName) {
      const descriptor = this.valueDescriptorMap[attributeName];
      if (!this.hasValue(key)) {
        this.invokeChangedCallback(key, descriptor.writer(this.receiver[key]), descriptor.writer(descriptor.defaultValue));
      }
    }
    stringMapValueChanged(value, name, oldValue) {
      const descriptor = this.valueDescriptorNameMap[name];
      if (value === null)
        return;
      if (oldValue === null) {
        oldValue = descriptor.writer(descriptor.defaultValue);
      }
      this.invokeChangedCallback(name, value, oldValue);
    }
    stringMapKeyRemoved(key, attributeName, oldValue) {
      const descriptor = this.valueDescriptorNameMap[key];
      if (this.hasValue(key)) {
        this.invokeChangedCallback(key, descriptor.writer(this.receiver[key]), oldValue);
      } else {
        this.invokeChangedCallback(key, descriptor.writer(descriptor.defaultValue), oldValue);
      }
    }
    invokeChangedCallbacksForDefaultValues() {
      for (const { key, name, defaultValue, writer } of this.valueDescriptors) {
        if (defaultValue != void 0 && !this.controller.data.has(key)) {
          this.invokeChangedCallback(name, writer(defaultValue), void 0);
        }
      }
    }
    invokeChangedCallback(name, rawValue, rawOldValue) {
      const changedMethodName = `${name}Changed`;
      const changedMethod = this.receiver[changedMethodName];
      if (typeof changedMethod == "function") {
        const descriptor = this.valueDescriptorNameMap[name];
        try {
          const value = descriptor.reader(rawValue);
          let oldValue = rawOldValue;
          if (rawOldValue) {
            oldValue = descriptor.reader(rawOldValue);
          }
          changedMethod.call(this.receiver, value, oldValue);
        } catch (error4) {
          if (error4 instanceof TypeError) {
            error4.message = `Stimulus Value "${this.context.identifier}.${descriptor.name}" - ${error4.message}`;
          }
          throw error4;
        }
      }
    }
    get valueDescriptors() {
      const { valueDescriptorMap } = this;
      return Object.keys(valueDescriptorMap).map((key) => valueDescriptorMap[key]);
    }
    get valueDescriptorNameMap() {
      const descriptors = {};
      Object.keys(this.valueDescriptorMap).forEach((key) => {
        const descriptor = this.valueDescriptorMap[key];
        descriptors[descriptor.name] = descriptor;
      });
      return descriptors;
    }
    hasValue(attributeName) {
      const descriptor = this.valueDescriptorNameMap[attributeName];
      const hasMethodName = `has${capitalize(descriptor.name)}`;
      return this.receiver[hasMethodName];
    }
  };
  var TargetObserver = class {
    constructor(context, delegate2) {
      this.context = context;
      this.delegate = delegate2;
      this.targetsByName = new Multimap();
    }
    start() {
      if (!this.tokenListObserver) {
        this.tokenListObserver = new TokenListObserver(this.element, this.attributeName, this);
        this.tokenListObserver.start();
      }
    }
    stop() {
      if (this.tokenListObserver) {
        this.disconnectAllTargets();
        this.tokenListObserver.stop();
        delete this.tokenListObserver;
      }
    }
    tokenMatched({ element, content: name }) {
      if (this.scope.containsElement(element)) {
        this.connectTarget(element, name);
      }
    }
    tokenUnmatched({ element, content: name }) {
      this.disconnectTarget(element, name);
    }
    connectTarget(element, name) {
      var _a2;
      if (!this.targetsByName.has(name, element)) {
        this.targetsByName.add(name, element);
        (_a2 = this.tokenListObserver) === null || _a2 === void 0 ? void 0 : _a2.pause(() => this.delegate.targetConnected(element, name));
      }
    }
    disconnectTarget(element, name) {
      var _a2;
      if (this.targetsByName.has(name, element)) {
        this.targetsByName.delete(name, element);
        (_a2 = this.tokenListObserver) === null || _a2 === void 0 ? void 0 : _a2.pause(() => this.delegate.targetDisconnected(element, name));
      }
    }
    disconnectAllTargets() {
      for (const name of this.targetsByName.keys) {
        for (const element of this.targetsByName.getValuesForKey(name)) {
          this.disconnectTarget(element, name);
        }
      }
    }
    get attributeName() {
      return `data-${this.context.identifier}-target`;
    }
    get element() {
      return this.context.element;
    }
    get scope() {
      return this.context.scope;
    }
  };
  var Context = class {
    constructor(module, scope) {
      this.logDebugActivity = (functionName, detail = {}) => {
        const { identifier, controller, element } = this;
        detail = Object.assign({ identifier, controller, element }, detail);
        this.application.logDebugActivity(this.identifier, functionName, detail);
      };
      this.module = module;
      this.scope = scope;
      this.controller = new module.controllerConstructor(this);
      this.bindingObserver = new BindingObserver(this, this.dispatcher);
      this.valueObserver = new ValueObserver(this, this.controller);
      this.targetObserver = new TargetObserver(this, this);
      try {
        this.controller.initialize();
        this.logDebugActivity("initialize");
      } catch (error4) {
        this.handleError(error4, "initializing controller");
      }
    }
    connect() {
      this.bindingObserver.start();
      this.valueObserver.start();
      this.targetObserver.start();
      try {
        this.controller.connect();
        this.logDebugActivity("connect");
      } catch (error4) {
        this.handleError(error4, "connecting controller");
      }
    }
    disconnect() {
      try {
        this.controller.disconnect();
        this.logDebugActivity("disconnect");
      } catch (error4) {
        this.handleError(error4, "disconnecting controller");
      }
      this.targetObserver.stop();
      this.valueObserver.stop();
      this.bindingObserver.stop();
    }
    get application() {
      return this.module.application;
    }
    get identifier() {
      return this.module.identifier;
    }
    get schema() {
      return this.application.schema;
    }
    get dispatcher() {
      return this.application.dispatcher;
    }
    get element() {
      return this.scope.element;
    }
    get parentElement() {
      return this.element.parentElement;
    }
    handleError(error4, message, detail = {}) {
      const { identifier, controller, element } = this;
      detail = Object.assign({ identifier, controller, element }, detail);
      this.application.handleError(error4, `Error ${message}`, detail);
    }
    targetConnected(element, name) {
      this.invokeControllerMethod(`${name}TargetConnected`, element);
    }
    targetDisconnected(element, name) {
      this.invokeControllerMethod(`${name}TargetDisconnected`, element);
    }
    invokeControllerMethod(methodName, ...args) {
      const controller = this.controller;
      if (typeof controller[methodName] == "function") {
        controller[methodName](...args);
      }
    }
  };
  function readInheritableStaticArrayValues(constructor, propertyName) {
    const ancestors = getAncestorsForConstructor(constructor);
    return Array.from(ancestors.reduce((values, constructor2) => {
      getOwnStaticArrayValues(constructor2, propertyName).forEach((name) => values.add(name));
      return values;
    }, /* @__PURE__ */ new Set()));
  }
  function readInheritableStaticObjectPairs(constructor, propertyName) {
    const ancestors = getAncestorsForConstructor(constructor);
    return ancestors.reduce((pairs, constructor2) => {
      pairs.push(...getOwnStaticObjectPairs(constructor2, propertyName));
      return pairs;
    }, []);
  }
  function getAncestorsForConstructor(constructor) {
    const ancestors = [];
    while (constructor) {
      ancestors.push(constructor);
      constructor = Object.getPrototypeOf(constructor);
    }
    return ancestors.reverse();
  }
  function getOwnStaticArrayValues(constructor, propertyName) {
    const definition = constructor[propertyName];
    return Array.isArray(definition) ? definition : [];
  }
  function getOwnStaticObjectPairs(constructor, propertyName) {
    const definition = constructor[propertyName];
    return definition ? Object.keys(definition).map((key) => [key, definition[key]]) : [];
  }
  function bless(constructor) {
    return shadow(constructor, getBlessedProperties(constructor));
  }
  function shadow(constructor, properties) {
    const shadowConstructor = extend2(constructor);
    const shadowProperties = getShadowProperties(constructor.prototype, properties);
    Object.defineProperties(shadowConstructor.prototype, shadowProperties);
    return shadowConstructor;
  }
  function getBlessedProperties(constructor) {
    const blessings = readInheritableStaticArrayValues(constructor, "blessings");
    return blessings.reduce((blessedProperties, blessing) => {
      const properties = blessing(constructor);
      for (const key in properties) {
        const descriptor = blessedProperties[key] || {};
        blessedProperties[key] = Object.assign(descriptor, properties[key]);
      }
      return blessedProperties;
    }, {});
  }
  function getShadowProperties(prototype, properties) {
    return getOwnKeys(properties).reduce((shadowProperties, key) => {
      const descriptor = getShadowedDescriptor(prototype, properties, key);
      if (descriptor) {
        Object.assign(shadowProperties, { [key]: descriptor });
      }
      return shadowProperties;
    }, {});
  }
  function getShadowedDescriptor(prototype, properties, key) {
    const shadowingDescriptor = Object.getOwnPropertyDescriptor(prototype, key);
    const shadowedByValue = shadowingDescriptor && "value" in shadowingDescriptor;
    if (!shadowedByValue) {
      const descriptor = Object.getOwnPropertyDescriptor(properties, key).value;
      if (shadowingDescriptor) {
        descriptor.get = shadowingDescriptor.get || descriptor.get;
        descriptor.set = shadowingDescriptor.set || descriptor.set;
      }
      return descriptor;
    }
  }
  var getOwnKeys = (() => {
    if (typeof Object.getOwnPropertySymbols == "function") {
      return (object) => [...Object.getOwnPropertyNames(object), ...Object.getOwnPropertySymbols(object)];
    } else {
      return Object.getOwnPropertyNames;
    }
  })();
  var extend2 = (() => {
    function extendWithReflect(constructor) {
      function extended() {
        return Reflect.construct(constructor, arguments, new.target);
      }
      extended.prototype = Object.create(constructor.prototype, {
        constructor: { value: extended }
      });
      Reflect.setPrototypeOf(extended, constructor);
      return extended;
    }
    function testReflectExtension() {
      const a = function() {
        this.a.call(this);
      };
      const b = extendWithReflect(a);
      b.prototype.a = function() {
      };
      return new b();
    }
    try {
      testReflectExtension();
      return extendWithReflect;
    } catch (error4) {
      return (constructor) => class extended extends constructor {
      };
    }
  })();
  function blessDefinition(definition) {
    return {
      identifier: definition.identifier,
      controllerConstructor: bless(definition.controllerConstructor)
    };
  }
  var Module = class {
    constructor(application2, definition) {
      this.application = application2;
      this.definition = blessDefinition(definition);
      this.contextsByScope = /* @__PURE__ */ new WeakMap();
      this.connectedContexts = /* @__PURE__ */ new Set();
    }
    get identifier() {
      return this.definition.identifier;
    }
    get controllerConstructor() {
      return this.definition.controllerConstructor;
    }
    get contexts() {
      return Array.from(this.connectedContexts);
    }
    connectContextForScope(scope) {
      const context = this.fetchContextForScope(scope);
      this.connectedContexts.add(context);
      context.connect();
    }
    disconnectContextForScope(scope) {
      const context = this.contextsByScope.get(scope);
      if (context) {
        this.connectedContexts.delete(context);
        context.disconnect();
      }
    }
    fetchContextForScope(scope) {
      let context = this.contextsByScope.get(scope);
      if (!context) {
        context = new Context(this, scope);
        this.contextsByScope.set(scope, context);
      }
      return context;
    }
  };
  var ClassMap = class {
    constructor(scope) {
      this.scope = scope;
    }
    has(name) {
      return this.data.has(this.getDataKey(name));
    }
    get(name) {
      return this.getAll(name)[0];
    }
    getAll(name) {
      const tokenString = this.data.get(this.getDataKey(name)) || "";
      return tokenize(tokenString);
    }
    getAttributeName(name) {
      return this.data.getAttributeNameForKey(this.getDataKey(name));
    }
    getDataKey(name) {
      return `${name}-class`;
    }
    get data() {
      return this.scope.data;
    }
  };
  var DataMap = class {
    constructor(scope) {
      this.scope = scope;
    }
    get element() {
      return this.scope.element;
    }
    get identifier() {
      return this.scope.identifier;
    }
    get(key) {
      const name = this.getAttributeNameForKey(key);
      return this.element.getAttribute(name);
    }
    set(key, value) {
      const name = this.getAttributeNameForKey(key);
      this.element.setAttribute(name, value);
      return this.get(key);
    }
    has(key) {
      const name = this.getAttributeNameForKey(key);
      return this.element.hasAttribute(name);
    }
    delete(key) {
      if (this.has(key)) {
        const name = this.getAttributeNameForKey(key);
        this.element.removeAttribute(name);
        return true;
      } else {
        return false;
      }
    }
    getAttributeNameForKey(key) {
      return `data-${this.identifier}-${dasherize(key)}`;
    }
  };
  var Guide = class {
    constructor(logger2) {
      this.warnedKeysByObject = /* @__PURE__ */ new WeakMap();
      this.logger = logger2;
    }
    warn(object, key, message) {
      let warnedKeys = this.warnedKeysByObject.get(object);
      if (!warnedKeys) {
        warnedKeys = /* @__PURE__ */ new Set();
        this.warnedKeysByObject.set(object, warnedKeys);
      }
      if (!warnedKeys.has(key)) {
        warnedKeys.add(key);
        this.logger.warn(message, object);
      }
    }
  };
  function attributeValueContainsToken(attributeName, token) {
    return `[${attributeName}~="${token}"]`;
  }
  var TargetSet = class {
    constructor(scope) {
      this.scope = scope;
    }
    get element() {
      return this.scope.element;
    }
    get identifier() {
      return this.scope.identifier;
    }
    get schema() {
      return this.scope.schema;
    }
    has(targetName) {
      return this.find(targetName) != null;
    }
    find(...targetNames) {
      return targetNames.reduce((target, targetName) => target || this.findTarget(targetName) || this.findLegacyTarget(targetName), void 0);
    }
    findAll(...targetNames) {
      return targetNames.reduce((targets, targetName) => [
        ...targets,
        ...this.findAllTargets(targetName),
        ...this.findAllLegacyTargets(targetName)
      ], []);
    }
    findTarget(targetName) {
      const selector = this.getSelectorForTargetName(targetName);
      return this.scope.findElement(selector);
    }
    findAllTargets(targetName) {
      const selector = this.getSelectorForTargetName(targetName);
      return this.scope.findAllElements(selector);
    }
    getSelectorForTargetName(targetName) {
      const attributeName = this.schema.targetAttributeForScope(this.identifier);
      return attributeValueContainsToken(attributeName, targetName);
    }
    findLegacyTarget(targetName) {
      const selector = this.getLegacySelectorForTargetName(targetName);
      return this.deprecate(this.scope.findElement(selector), targetName);
    }
    findAllLegacyTargets(targetName) {
      const selector = this.getLegacySelectorForTargetName(targetName);
      return this.scope.findAllElements(selector).map((element) => this.deprecate(element, targetName));
    }
    getLegacySelectorForTargetName(targetName) {
      const targetDescriptor = `${this.identifier}.${targetName}`;
      return attributeValueContainsToken(this.schema.targetAttribute, targetDescriptor);
    }
    deprecate(element, targetName) {
      if (element) {
        const { identifier } = this;
        const attributeName = this.schema.targetAttribute;
        const revisedAttributeName = this.schema.targetAttributeForScope(identifier);
        this.guide.warn(element, `target:${targetName}`, `Please replace ${attributeName}="${identifier}.${targetName}" with ${revisedAttributeName}="${targetName}". The ${attributeName} attribute is deprecated and will be removed in a future version of Stimulus.`);
      }
      return element;
    }
    get guide() {
      return this.scope.guide;
    }
  };
  var Scope = class {
    constructor(schema2, element, identifier, logger2) {
      this.targets = new TargetSet(this);
      this.classes = new ClassMap(this);
      this.data = new DataMap(this);
      this.containsElement = (element2) => {
        return element2.closest(this.controllerSelector) === this.element;
      };
      this.schema = schema2;
      this.element = element;
      this.identifier = identifier;
      this.guide = new Guide(logger2);
    }
    findElement(selector) {
      return this.element.matches(selector) ? this.element : this.queryElements(selector).find(this.containsElement);
    }
    findAllElements(selector) {
      return [
        ...this.element.matches(selector) ? [this.element] : [],
        ...this.queryElements(selector).filter(this.containsElement)
      ];
    }
    queryElements(selector) {
      return Array.from(this.element.querySelectorAll(selector));
    }
    get controllerSelector() {
      return attributeValueContainsToken(this.schema.controllerAttribute, this.identifier);
    }
  };
  var ScopeObserver = class {
    constructor(element, schema2, delegate2) {
      this.element = element;
      this.schema = schema2;
      this.delegate = delegate2;
      this.valueListObserver = new ValueListObserver(this.element, this.controllerAttribute, this);
      this.scopesByIdentifierByElement = /* @__PURE__ */ new WeakMap();
      this.scopeReferenceCounts = /* @__PURE__ */ new WeakMap();
    }
    start() {
      this.valueListObserver.start();
    }
    stop() {
      this.valueListObserver.stop();
    }
    get controllerAttribute() {
      return this.schema.controllerAttribute;
    }
    parseValueForToken(token) {
      const { element, content: identifier } = token;
      const scopesByIdentifier = this.fetchScopesByIdentifierForElement(element);
      let scope = scopesByIdentifier.get(identifier);
      if (!scope) {
        scope = this.delegate.createScopeForElementAndIdentifier(element, identifier);
        scopesByIdentifier.set(identifier, scope);
      }
      return scope;
    }
    elementMatchedValue(element, value) {
      const referenceCount = (this.scopeReferenceCounts.get(value) || 0) + 1;
      this.scopeReferenceCounts.set(value, referenceCount);
      if (referenceCount == 1) {
        this.delegate.scopeConnected(value);
      }
    }
    elementUnmatchedValue(element, value) {
      const referenceCount = this.scopeReferenceCounts.get(value);
      if (referenceCount) {
        this.scopeReferenceCounts.set(value, referenceCount - 1);
        if (referenceCount == 1) {
          this.delegate.scopeDisconnected(value);
        }
      }
    }
    fetchScopesByIdentifierForElement(element) {
      let scopesByIdentifier = this.scopesByIdentifierByElement.get(element);
      if (!scopesByIdentifier) {
        scopesByIdentifier = /* @__PURE__ */ new Map();
        this.scopesByIdentifierByElement.set(element, scopesByIdentifier);
      }
      return scopesByIdentifier;
    }
  };
  var Router = class {
    constructor(application2) {
      this.application = application2;
      this.scopeObserver = new ScopeObserver(this.element, this.schema, this);
      this.scopesByIdentifier = new Multimap();
      this.modulesByIdentifier = /* @__PURE__ */ new Map();
    }
    get element() {
      return this.application.element;
    }
    get schema() {
      return this.application.schema;
    }
    get logger() {
      return this.application.logger;
    }
    get controllerAttribute() {
      return this.schema.controllerAttribute;
    }
    get modules() {
      return Array.from(this.modulesByIdentifier.values());
    }
    get contexts() {
      return this.modules.reduce((contexts, module) => contexts.concat(module.contexts), []);
    }
    start() {
      this.scopeObserver.start();
    }
    stop() {
      this.scopeObserver.stop();
    }
    loadDefinition(definition) {
      this.unloadIdentifier(definition.identifier);
      const module = new Module(this.application, definition);
      this.connectModule(module);
    }
    unloadIdentifier(identifier) {
      const module = this.modulesByIdentifier.get(identifier);
      if (module) {
        this.disconnectModule(module);
      }
    }
    getContextForElementAndIdentifier(element, identifier) {
      const module = this.modulesByIdentifier.get(identifier);
      if (module) {
        return module.contexts.find((context) => context.element == element);
      }
    }
    handleError(error4, message, detail) {
      this.application.handleError(error4, message, detail);
    }
    createScopeForElementAndIdentifier(element, identifier) {
      return new Scope(this.schema, element, identifier, this.logger);
    }
    scopeConnected(scope) {
      this.scopesByIdentifier.add(scope.identifier, scope);
      const module = this.modulesByIdentifier.get(scope.identifier);
      if (module) {
        module.connectContextForScope(scope);
      }
    }
    scopeDisconnected(scope) {
      this.scopesByIdentifier.delete(scope.identifier, scope);
      const module = this.modulesByIdentifier.get(scope.identifier);
      if (module) {
        module.disconnectContextForScope(scope);
      }
    }
    connectModule(module) {
      this.modulesByIdentifier.set(module.identifier, module);
      const scopes = this.scopesByIdentifier.getValuesForKey(module.identifier);
      scopes.forEach((scope) => module.connectContextForScope(scope));
    }
    disconnectModule(module) {
      this.modulesByIdentifier.delete(module.identifier);
      const scopes = this.scopesByIdentifier.getValuesForKey(module.identifier);
      scopes.forEach((scope) => module.disconnectContextForScope(scope));
    }
  };
  var defaultSchema = {
    controllerAttribute: "data-controller",
    actionAttribute: "data-action",
    targetAttribute: "data-target",
    targetAttributeForScope: (identifier) => `data-${identifier}-target`
  };
  var Application = class {
    constructor(element = document.documentElement, schema2 = defaultSchema) {
      this.logger = console;
      this.debug = false;
      this.logDebugActivity = (identifier, functionName, detail = {}) => {
        if (this.debug) {
          this.logFormattedMessage(identifier, functionName, detail);
        }
      };
      this.element = element;
      this.schema = schema2;
      this.dispatcher = new Dispatcher(this);
      this.router = new Router(this);
      this.actionDescriptorFilters = Object.assign({}, defaultActionDescriptorFilters);
    }
    static start(element, schema2) {
      const application2 = new Application(element, schema2);
      application2.start();
      return application2;
    }
    async start() {
      await domReady();
      this.logDebugActivity("application", "starting");
      this.dispatcher.start();
      this.router.start();
      this.logDebugActivity("application", "start");
    }
    stop() {
      this.logDebugActivity("application", "stopping");
      this.dispatcher.stop();
      this.router.stop();
      this.logDebugActivity("application", "stop");
    }
    register(identifier, controllerConstructor) {
      this.load({ identifier, controllerConstructor });
    }
    registerActionOption(name, filter) {
      this.actionDescriptorFilters[name] = filter;
    }
    load(head, ...rest) {
      const definitions = Array.isArray(head) ? head : [head, ...rest];
      definitions.forEach((definition) => {
        if (definition.controllerConstructor.shouldLoad) {
          this.router.loadDefinition(definition);
        }
      });
    }
    unload(head, ...rest) {
      const identifiers = Array.isArray(head) ? head : [head, ...rest];
      identifiers.forEach((identifier) => this.router.unloadIdentifier(identifier));
    }
    get controllers() {
      return this.router.contexts.map((context) => context.controller);
    }
    getControllerForElementAndIdentifier(element, identifier) {
      const context = this.router.getContextForElementAndIdentifier(element, identifier);
      return context ? context.controller : null;
    }
    handleError(error4, message, detail) {
      var _a2;
      this.logger.error(`%s

%o

%o`, message, error4, detail);
      (_a2 = window.onerror) === null || _a2 === void 0 ? void 0 : _a2.call(window, message, "", 0, 0, error4);
    }
    logFormattedMessage(identifier, functionName, detail = {}) {
      detail = Object.assign({ application: this }, detail);
      this.logger.groupCollapsed(`${identifier} #${functionName}`);
      this.logger.log("details:", Object.assign({}, detail));
      this.logger.groupEnd();
    }
  };
  function domReady() {
    return new Promise((resolve) => {
      if (document.readyState == "loading") {
        document.addEventListener("DOMContentLoaded", () => resolve());
      } else {
        resolve();
      }
    });
  }
  function ClassPropertiesBlessing(constructor) {
    const classes = readInheritableStaticArrayValues(constructor, "classes");
    return classes.reduce((properties, classDefinition) => {
      return Object.assign(properties, propertiesForClassDefinition(classDefinition));
    }, {});
  }
  function propertiesForClassDefinition(key) {
    return {
      [`${key}Class`]: {
        get() {
          const { classes } = this;
          if (classes.has(key)) {
            return classes.get(key);
          } else {
            const attribute = classes.getAttributeName(key);
            throw new Error(`Missing attribute "${attribute}"`);
          }
        }
      },
      [`${key}Classes`]: {
        get() {
          return this.classes.getAll(key);
        }
      },
      [`has${capitalize(key)}Class`]: {
        get() {
          return this.classes.has(key);
        }
      }
    };
  }
  function TargetPropertiesBlessing(constructor) {
    const targets = readInheritableStaticArrayValues(constructor, "targets");
    return targets.reduce((properties, targetDefinition) => {
      return Object.assign(properties, propertiesForTargetDefinition(targetDefinition));
    }, {});
  }
  function propertiesForTargetDefinition(name) {
    return {
      [`${name}Target`]: {
        get() {
          const target = this.targets.find(name);
          if (target) {
            return target;
          } else {
            throw new Error(`Missing target element "${name}" for "${this.identifier}" controller`);
          }
        }
      },
      [`${name}Targets`]: {
        get() {
          return this.targets.findAll(name);
        }
      },
      [`has${capitalize(name)}Target`]: {
        get() {
          return this.targets.has(name);
        }
      }
    };
  }
  function ValuePropertiesBlessing(constructor) {
    const valueDefinitionPairs = readInheritableStaticObjectPairs(constructor, "values");
    const propertyDescriptorMap = {
      valueDescriptorMap: {
        get() {
          return valueDefinitionPairs.reduce((result, valueDefinitionPair) => {
            const valueDescriptor = parseValueDefinitionPair(valueDefinitionPair, this.identifier);
            const attributeName = this.data.getAttributeNameForKey(valueDescriptor.key);
            return Object.assign(result, { [attributeName]: valueDescriptor });
          }, {});
        }
      }
    };
    return valueDefinitionPairs.reduce((properties, valueDefinitionPair) => {
      return Object.assign(properties, propertiesForValueDefinitionPair(valueDefinitionPair));
    }, propertyDescriptorMap);
  }
  function propertiesForValueDefinitionPair(valueDefinitionPair, controller) {
    const definition = parseValueDefinitionPair(valueDefinitionPair, controller);
    const { key, name, reader: read, writer: write } = definition;
    return {
      [name]: {
        get() {
          const value = this.data.get(key);
          if (value !== null) {
            return read(value);
          } else {
            return definition.defaultValue;
          }
        },
        set(value) {
          if (value === void 0) {
            this.data.delete(key);
          } else {
            this.data.set(key, write(value));
          }
        }
      },
      [`has${capitalize(name)}`]: {
        get() {
          return this.data.has(key) || definition.hasCustomDefaultValue;
        }
      }
    };
  }
  function parseValueDefinitionPair([token, typeDefinition], controller) {
    return valueDescriptorForTokenAndTypeDefinition({
      controller,
      token,
      typeDefinition
    });
  }
  function parseValueTypeConstant(constant) {
    switch (constant) {
      case Array:
        return "array";
      case Boolean:
        return "boolean";
      case Number:
        return "number";
      case Object:
        return "object";
      case String:
        return "string";
    }
  }
  function parseValueTypeDefault(defaultValue) {
    switch (typeof defaultValue) {
      case "boolean":
        return "boolean";
      case "number":
        return "number";
      case "string":
        return "string";
    }
    if (Array.isArray(defaultValue))
      return "array";
    if (Object.prototype.toString.call(defaultValue) === "[object Object]")
      return "object";
  }
  function parseValueTypeObject(payload) {
    const typeFromObject = parseValueTypeConstant(payload.typeObject.type);
    if (!typeFromObject)
      return;
    const defaultValueType = parseValueTypeDefault(payload.typeObject.default);
    if (typeFromObject !== defaultValueType) {
      const propertyPath = payload.controller ? `${payload.controller}.${payload.token}` : payload.token;
      throw new Error(`The specified default value for the Stimulus Value "${propertyPath}" must match the defined type "${typeFromObject}". The provided default value of "${payload.typeObject.default}" is of type "${defaultValueType}".`);
    }
    return typeFromObject;
  }
  function parseValueTypeDefinition(payload) {
    const typeFromObject = parseValueTypeObject({
      controller: payload.controller,
      token: payload.token,
      typeObject: payload.typeDefinition
    });
    const typeFromDefaultValue = parseValueTypeDefault(payload.typeDefinition);
    const typeFromConstant = parseValueTypeConstant(payload.typeDefinition);
    const type = typeFromObject || typeFromDefaultValue || typeFromConstant;
    if (type)
      return type;
    const propertyPath = payload.controller ? `${payload.controller}.${payload.typeDefinition}` : payload.token;
    throw new Error(`Unknown value type "${propertyPath}" for "${payload.token}" value`);
  }
  function defaultValueForDefinition(typeDefinition) {
    const constant = parseValueTypeConstant(typeDefinition);
    if (constant)
      return defaultValuesByType[constant];
    const defaultValue = typeDefinition.default;
    if (defaultValue !== void 0)
      return defaultValue;
    return typeDefinition;
  }
  function valueDescriptorForTokenAndTypeDefinition(payload) {
    const key = `${dasherize(payload.token)}-value`;
    const type = parseValueTypeDefinition(payload);
    return {
      type,
      key,
      name: camelize(key),
      get defaultValue() {
        return defaultValueForDefinition(payload.typeDefinition);
      },
      get hasCustomDefaultValue() {
        return parseValueTypeDefault(payload.typeDefinition) !== void 0;
      },
      reader: readers[type],
      writer: writers[type] || writers.default
    };
  }
  var defaultValuesByType = {
    get array() {
      return [];
    },
    boolean: false,
    number: 0,
    get object() {
      return {};
    },
    string: ""
  };
  var readers = {
    array(value) {
      const array = JSON.parse(value);
      if (!Array.isArray(array)) {
        throw new TypeError(`expected value of type "array" but instead got value "${value}" of type "${parseValueTypeDefault(array)}"`);
      }
      return array;
    },
    boolean(value) {
      return !(value == "0" || String(value).toLowerCase() == "false");
    },
    number(value) {
      return Number(value);
    },
    object(value) {
      const object = JSON.parse(value);
      if (object === null || typeof object != "object" || Array.isArray(object)) {
        throw new TypeError(`expected value of type "object" but instead got value "${value}" of type "${parseValueTypeDefault(object)}"`);
      }
      return object;
    },
    string(value) {
      return value;
    }
  };
  var writers = {
    default: writeString,
    array: writeJSON,
    object: writeJSON
  };
  function writeJSON(value) {
    return JSON.stringify(value);
  }
  function writeString(value) {
    return `${value}`;
  }
  var Controller = class {
    constructor(context) {
      this.context = context;
    }
    static get shouldLoad() {
      return true;
    }
    get application() {
      return this.context.application;
    }
    get scope() {
      return this.context.scope;
    }
    get element() {
      return this.scope.element;
    }
    get identifier() {
      return this.scope.identifier;
    }
    get targets() {
      return this.scope.targets;
    }
    get classes() {
      return this.scope.classes;
    }
    get data() {
      return this.scope.data;
    }
    initialize() {
    }
    connect() {
    }
    disconnect() {
    }
    dispatch(eventName, { target = this.element, detail = {}, prefix: prefix2 = this.identifier, bubbles = true, cancelable = true } = {}) {
      const type = prefix2 ? `${prefix2}:${eventName}` : eventName;
      const event = new CustomEvent(type, { detail, bubbles, cancelable });
      target.dispatchEvent(event);
      return event;
    }
  };
  Controller.blessings = [ClassPropertiesBlessing, TargetPropertiesBlessing, ValuePropertiesBlessing];
  Controller.targets = [];
  Controller.values = {};

  // ../../node_modules/stimulus/dist/stimulus.js
  function camelize2(value) {
    return value.replace(/(?:[_-])([a-z0-9])/g, (_, char) => char.toUpperCase());
  }
  function capitalize2(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
  function dasherize2(value) {
    return value.replace(/([A-Z])/g, (_, char) => `-${char.toLowerCase()}`);
  }
  function readInheritableStaticArrayValues2(constructor, propertyName) {
    const ancestors = getAncestorsForConstructor2(constructor);
    return Array.from(ancestors.reduce((values, constructor2) => {
      getOwnStaticArrayValues2(constructor2, propertyName).forEach((name) => values.add(name));
      return values;
    }, /* @__PURE__ */ new Set()));
  }
  function readInheritableStaticObjectPairs2(constructor, propertyName) {
    const ancestors = getAncestorsForConstructor2(constructor);
    return ancestors.reduce((pairs, constructor2) => {
      pairs.push(...getOwnStaticObjectPairs2(constructor2, propertyName));
      return pairs;
    }, []);
  }
  function getAncestorsForConstructor2(constructor) {
    const ancestors = [];
    while (constructor) {
      ancestors.push(constructor);
      constructor = Object.getPrototypeOf(constructor);
    }
    return ancestors.reverse();
  }
  function getOwnStaticArrayValues2(constructor, propertyName) {
    const definition = constructor[propertyName];
    return Array.isArray(definition) ? definition : [];
  }
  function getOwnStaticObjectPairs2(constructor, propertyName) {
    const definition = constructor[propertyName];
    return definition ? Object.keys(definition).map((key) => [key, definition[key]]) : [];
  }
  var getOwnKeys2 = (() => {
    if (typeof Object.getOwnPropertySymbols == "function") {
      return (object) => [...Object.getOwnPropertyNames(object), ...Object.getOwnPropertySymbols(object)];
    } else {
      return Object.getOwnPropertyNames;
    }
  })();
  var extend3 = (() => {
    function extendWithReflect(constructor) {
      function extended() {
        return Reflect.construct(constructor, arguments, new.target);
      }
      extended.prototype = Object.create(constructor.prototype, {
        constructor: { value: extended }
      });
      Reflect.setPrototypeOf(extended, constructor);
      return extended;
    }
    function testReflectExtension() {
      const a = function() {
        this.a.call(this);
      };
      const b = extendWithReflect(a);
      b.prototype.a = function() {
      };
      return new b();
    }
    try {
      testReflectExtension();
      return extendWithReflect;
    } catch (error4) {
      return (constructor) => class extended extends constructor {
      };
    }
  })();
  function ClassPropertiesBlessing2(constructor) {
    const classes = readInheritableStaticArrayValues2(constructor, "classes");
    return classes.reduce((properties, classDefinition) => {
      return Object.assign(properties, propertiesForClassDefinition2(classDefinition));
    }, {});
  }
  function propertiesForClassDefinition2(key) {
    return {
      [`${key}Class`]: {
        get() {
          const { classes } = this;
          if (classes.has(key)) {
            return classes.get(key);
          } else {
            const attribute = classes.getAttributeName(key);
            throw new Error(`Missing attribute "${attribute}"`);
          }
        }
      },
      [`${key}Classes`]: {
        get() {
          return this.classes.getAll(key);
        }
      },
      [`has${capitalize2(key)}Class`]: {
        get() {
          return this.classes.has(key);
        }
      }
    };
  }
  function TargetPropertiesBlessing2(constructor) {
    const targets = readInheritableStaticArrayValues2(constructor, "targets");
    return targets.reduce((properties, targetDefinition) => {
      return Object.assign(properties, propertiesForTargetDefinition2(targetDefinition));
    }, {});
  }
  function propertiesForTargetDefinition2(name) {
    return {
      [`${name}Target`]: {
        get() {
          const target = this.targets.find(name);
          if (target) {
            return target;
          } else {
            throw new Error(`Missing target element "${name}" for "${this.identifier}" controller`);
          }
        }
      },
      [`${name}Targets`]: {
        get() {
          return this.targets.findAll(name);
        }
      },
      [`has${capitalize2(name)}Target`]: {
        get() {
          return this.targets.has(name);
        }
      }
    };
  }
  function ValuePropertiesBlessing2(constructor) {
    const valueDefinitionPairs = readInheritableStaticObjectPairs2(constructor, "values");
    const propertyDescriptorMap = {
      valueDescriptorMap: {
        get() {
          return valueDefinitionPairs.reduce((result, valueDefinitionPair) => {
            const valueDescriptor = parseValueDefinitionPair2(valueDefinitionPair, this.identifier);
            const attributeName = this.data.getAttributeNameForKey(valueDescriptor.key);
            return Object.assign(result, { [attributeName]: valueDescriptor });
          }, {});
        }
      }
    };
    return valueDefinitionPairs.reduce((properties, valueDefinitionPair) => {
      return Object.assign(properties, propertiesForValueDefinitionPair2(valueDefinitionPair));
    }, propertyDescriptorMap);
  }
  function propertiesForValueDefinitionPair2(valueDefinitionPair, controller) {
    const definition = parseValueDefinitionPair2(valueDefinitionPair, controller);
    const { key, name, reader: read, writer: write } = definition;
    return {
      [name]: {
        get() {
          const value = this.data.get(key);
          if (value !== null) {
            return read(value);
          } else {
            return definition.defaultValue;
          }
        },
        set(value) {
          if (value === void 0) {
            this.data.delete(key);
          } else {
            this.data.set(key, write(value));
          }
        }
      },
      [`has${capitalize2(name)}`]: {
        get() {
          return this.data.has(key) || definition.hasCustomDefaultValue;
        }
      }
    };
  }
  function parseValueDefinitionPair2([token, typeDefinition], controller) {
    return valueDescriptorForTokenAndTypeDefinition2({
      controller,
      token,
      typeDefinition
    });
  }
  function parseValueTypeConstant2(constant) {
    switch (constant) {
      case Array:
        return "array";
      case Boolean:
        return "boolean";
      case Number:
        return "number";
      case Object:
        return "object";
      case String:
        return "string";
    }
  }
  function parseValueTypeDefault2(defaultValue) {
    switch (typeof defaultValue) {
      case "boolean":
        return "boolean";
      case "number":
        return "number";
      case "string":
        return "string";
    }
    if (Array.isArray(defaultValue))
      return "array";
    if (Object.prototype.toString.call(defaultValue) === "[object Object]")
      return "object";
  }
  function parseValueTypeObject2(payload) {
    const typeFromObject = parseValueTypeConstant2(payload.typeObject.type);
    if (!typeFromObject)
      return;
    const defaultValueType = parseValueTypeDefault2(payload.typeObject.default);
    if (typeFromObject !== defaultValueType) {
      const propertyPath = payload.controller ? `${payload.controller}.${payload.token}` : payload.token;
      throw new Error(`The specified default value for the Stimulus Value "${propertyPath}" must match the defined type "${typeFromObject}". The provided default value of "${payload.typeObject.default}" is of type "${defaultValueType}".`);
    }
    return typeFromObject;
  }
  function parseValueTypeDefinition2(payload) {
    const typeFromObject = parseValueTypeObject2({
      controller: payload.controller,
      token: payload.token,
      typeObject: payload.typeDefinition
    });
    const typeFromDefaultValue = parseValueTypeDefault2(payload.typeDefinition);
    const typeFromConstant = parseValueTypeConstant2(payload.typeDefinition);
    const type = typeFromObject || typeFromDefaultValue || typeFromConstant;
    if (type)
      return type;
    const propertyPath = payload.controller ? `${payload.controller}.${payload.typeDefinition}` : payload.token;
    throw new Error(`Unknown value type "${propertyPath}" for "${payload.token}" value`);
  }
  function defaultValueForDefinition2(typeDefinition) {
    const constant = parseValueTypeConstant2(typeDefinition);
    if (constant)
      return defaultValuesByType2[constant];
    const defaultValue = typeDefinition.default;
    if (defaultValue !== void 0)
      return defaultValue;
    return typeDefinition;
  }
  function valueDescriptorForTokenAndTypeDefinition2(payload) {
    const key = `${dasherize2(payload.token)}-value`;
    const type = parseValueTypeDefinition2(payload);
    return {
      type,
      key,
      name: camelize2(key),
      get defaultValue() {
        return defaultValueForDefinition2(payload.typeDefinition);
      },
      get hasCustomDefaultValue() {
        return parseValueTypeDefault2(payload.typeDefinition) !== void 0;
      },
      reader: readers2[type],
      writer: writers2[type] || writers2.default
    };
  }
  var defaultValuesByType2 = {
    get array() {
      return [];
    },
    boolean: false,
    number: 0,
    get object() {
      return {};
    },
    string: ""
  };
  var readers2 = {
    array(value) {
      const array = JSON.parse(value);
      if (!Array.isArray(array)) {
        throw new TypeError(`expected value of type "array" but instead got value "${value}" of type "${parseValueTypeDefault2(array)}"`);
      }
      return array;
    },
    boolean(value) {
      return !(value == "0" || String(value).toLowerCase() == "false");
    },
    number(value) {
      return Number(value);
    },
    object(value) {
      const object = JSON.parse(value);
      if (object === null || typeof object != "object" || Array.isArray(object)) {
        throw new TypeError(`expected value of type "object" but instead got value "${value}" of type "${parseValueTypeDefault2(object)}"`);
      }
      return object;
    },
    string(value) {
      return value;
    }
  };
  var writers2 = {
    default: writeString2,
    array: writeJSON2,
    object: writeJSON2
  };
  function writeJSON2(value) {
    return JSON.stringify(value);
  }
  function writeString2(value) {
    return `${value}`;
  }
  var Controller2 = class {
    constructor(context) {
      this.context = context;
    }
    static get shouldLoad() {
      return true;
    }
    get application() {
      return this.context.application;
    }
    get scope() {
      return this.context.scope;
    }
    get element() {
      return this.scope.element;
    }
    get identifier() {
      return this.scope.identifier;
    }
    get targets() {
      return this.scope.targets;
    }
    get classes() {
      return this.scope.classes;
    }
    get data() {
      return this.scope.data;
    }
    initialize() {
    }
    connect() {
    }
    disconnect() {
    }
    dispatch(eventName, { target = this.element, detail = {}, prefix: prefix2 = this.identifier, bubbles = true, cancelable = true } = {}) {
      const type = prefix2 ? `${prefix2}:${eventName}` : eventName;
      const event = new CustomEvent(type, { detail, bubbles, cancelable });
      target.dispatchEvent(event);
      return event;
    }
  };
  Controller2.blessings = [ClassPropertiesBlessing2, TargetPropertiesBlessing2, ValuePropertiesBlessing2];
  Controller2.targets = [];
  Controller2.values = {};

  // ../../node_modules/stimulus_reflex/javascript/utils.js
  var uuidv4 = () => {
    const crypto = window.crypto || window.msCrypto;
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(
      /[018]/g,
      (c) => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  };
  var serializeForm = (form2, options = {}) => {
    if (!form2)
      return "";
    const w = options.w || window;
    const { element } = options;
    const formData = new w.FormData(form2);
    const data2 = Array.from(formData, (e) => e.map(encodeURIComponent).join("="));
    const submitButton = form2.querySelector("input[type=submit]");
    if (element && element.name && element.nodeName === "INPUT" && element.type === "submit") {
      data2.push(
        `${encodeURIComponent(element.name)}=${encodeURIComponent(element.value)}`
      );
    } else if (submitButton && submitButton.name) {
      data2.push(
        `${encodeURIComponent(submitButton.name)}=${encodeURIComponent(
          submitButton.value
        )}`
      );
    }
    return Array.from(data2).join("&");
  };
  var camelize3 = (value, uppercaseFirstLetter = true) => {
    if (typeof value !== "string")
      return "";
    value = value.replace(/[\s_](.)/g, ($1) => $1.toUpperCase()).replace(/[\s_]/g, "").replace(/^(.)/, ($1) => $1.toLowerCase());
    if (uppercaseFirstLetter)
      value = value.substr(0, 1).toUpperCase() + value.substr(1);
    return value;
  };
  var debounce = (callback, delay = 250) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        timeoutId = null;
        callback(...args);
      }, delay);
    };
  };
  var extractReflexName = (reflexString) => {
    const match = reflexString.match(/(?:.*->)?(.*?)(?:Reflex)?#/);
    return match ? match[1] : "";
  };
  var emitEvent = (event, detail) => {
    document.dispatchEvent(
      new CustomEvent(event, {
        bubbles: true,
        cancelable: false,
        detail
      })
    );
    if (window.jQuery)
      window.jQuery(document).trigger(event, detail);
  };
  var elementToXPath = (element) => {
    if (element.id !== "")
      return "//*[@id='" + element.id + "']";
    if (element === document.body)
      return "/html/body";
    let ix = 0;
    const siblings = element.parentNode.childNodes;
    for (var i = 0; i < siblings.length; i++) {
      const sibling = siblings[i];
      if (sibling === element) {
        const computedPath = elementToXPath(element.parentNode);
        const tagName = element.tagName.toLowerCase();
        const ixInc = ix + 1;
        return `${computedPath}/${tagName}[${ixInc}]`;
      }
      if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
        ix++;
      }
    }
  };
  var XPathToElement = (xpath) => {
    return document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;
  };
  var XPathToArray = (xpath, reverse = false) => {
    const snapshotList = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    const snapshots = [];
    for (let i = 0; i < snapshotList.snapshotLength; i++) {
      snapshots.push(snapshotList.snapshotItem(i));
    }
    return reverse ? snapshots.reverse() : snapshots;
  };

  // ../../node_modules/stimulus_reflex/javascript/debug.js
  var debugging = false;
  var debug_default = {
    get enabled() {
      return debugging;
    },
    get disabled() {
      return !debugging;
    },
    get value() {
      return debugging;
    },
    set(value) {
      debugging = !!value;
    },
    set debug(value) {
      debugging = !!value;
    }
  };

  // ../../node_modules/cable_ready/package.json
  var version = "5.0.0-pre8";

  // ../../node_modules/cable_ready/javascript/enums.js
  var inputTags = {
    INPUT: true,
    TEXTAREA: true,
    SELECT: true
  };
  var mutableTags = {
    INPUT: true,
    TEXTAREA: true,
    OPTION: true
  };
  var textInputTypes = {
    "datetime-local": true,
    "select-multiple": true,
    "select-one": true,
    color: true,
    date: true,
    datetime: true,
    email: true,
    month: true,
    number: true,
    password: true,
    range: true,
    search: true,
    tel: true,
    text: true,
    textarea: true,
    time: true,
    url: true,
    week: true
  };

  // ../../node_modules/cable_ready/javascript/active_element.js
  var activeElement;
  var active_element_default = {
    get element() {
      return activeElement;
    },
    set(element) {
      activeElement = element;
    }
  };

  // ../../node_modules/cable_ready/javascript/utils.js
  var isTextInput = (element) => {
    return inputTags[element.tagName] && textInputTypes[element.type];
  };
  var assignFocus = (selector) => {
    const element = selector && selector.nodeType === Node.ELEMENT_NODE ? selector : document.querySelector(selector);
    const focusElement = element || active_element_default.element;
    if (focusElement && focusElement.focus)
      focusElement.focus();
  };
  var dispatch2 = (element, name, detail = {}) => {
    const init = { bubbles: true, cancelable: true, detail };
    const evt = new CustomEvent(name, init);
    element.dispatchEvent(evt);
    if (window.jQuery)
      window.jQuery(element).trigger(name, detail);
  };
  var xpathToElement = (xpath) => {
    return document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;
  };
  var getClassNames = (names) => Array(names).flat();
  var processElements = (operation, callback) => {
    Array.from(
      operation.selectAll ? operation.element : [operation.element]
    ).forEach(callback);
  };
  var kebabize = (str) => {
    return str.split("").map((letter, idx) => {
      return letter.toUpperCase() === letter ? `${idx !== 0 ? "-" : ""}${letter.toLowerCase()}` : letter;
    }).join("");
  };
  var operate = (operation, callback) => {
    if (!operation.cancel) {
      operation.delay ? setTimeout(callback, operation.delay) : callback();
      return true;
    }
    return false;
  };
  var before = (target, operation) => dispatch2(
    target,
    `cable-ready:before-${kebabize(operation.operation)}`,
    operation
  );
  var after = (target, operation) => dispatch2(
    target,
    `cable-ready:after-${kebabize(operation.operation)}`,
    operation
  );
  function debounce2(func, timeout) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => func.apply(this, args), timeout);
    };
  }
  function handleErrors(response) {
    if (!response.ok)
      throw Error(response.statusText);
    return response;
  }
  async function graciouslyFetch(url2, additionalHeaders) {
    try {
      const response = await fetch(url2, {
        headers: {
          "X-REQUESTED-WITH": "XmlHttpRequest",
          ...additionalHeaders
        }
      });
      if (response == void 0)
        return;
      handleErrors(response);
      return response;
    } catch (e) {
      console.error(`Could not fetch ${url2}`);
    }
  }

  // ../../node_modules/cable_ready/javascript/morph_callbacks.js
  var shouldMorph = (operation) => (fromEl, toEl) => {
    return !shouldMorphCallbacks.map((callback) => {
      return typeof callback === "function" ? callback(operation, fromEl, toEl) : true;
    }).includes(false);
  };
  var didMorph = (operation) => (el) => {
    didMorphCallbacks.forEach((callback) => {
      if (typeof callback === "function")
        callback(operation, el);
    });
  };
  var verifyNotMutable = (detail, fromEl, toEl) => {
    if (!mutableTags[fromEl.tagName] && fromEl.isEqualNode(toEl))
      return false;
    return true;
  };
  var verifyNotContentEditable = (detail, fromEl, toEl) => {
    if (fromEl === active_element_default.element && fromEl.isContentEditable)
      return false;
    return true;
  };
  var verifyNotPermanent = (detail, fromEl, toEl) => {
    const { permanentAttributeName } = detail;
    if (!permanentAttributeName)
      return true;
    const permanent = fromEl.closest(`[${permanentAttributeName}]`);
    if (!permanent && fromEl === active_element_default.element && isTextInput(fromEl)) {
      const ignore = { value: true };
      Array.from(toEl.attributes).forEach((attribute) => {
        if (!ignore[attribute.name])
          fromEl.setAttribute(attribute.name, attribute.value);
      });
      return false;
    }
    return !permanent;
  };
  var shouldMorphCallbacks = [
    verifyNotMutable,
    verifyNotPermanent,
    verifyNotContentEditable
  ];
  var didMorphCallbacks = [];

  // ../../node_modules/morphdom/dist/morphdom-esm.js
  var DOCUMENT_FRAGMENT_NODE = 11;
  function morphAttrs(fromNode, toNode) {
    var toNodeAttrs = toNode.attributes;
    var attr;
    var attrName;
    var attrNamespaceURI;
    var attrValue;
    var fromValue;
    if (toNode.nodeType === DOCUMENT_FRAGMENT_NODE || fromNode.nodeType === DOCUMENT_FRAGMENT_NODE) {
      return;
    }
    for (var i = toNodeAttrs.length - 1; i >= 0; i--) {
      attr = toNodeAttrs[i];
      attrName = attr.name;
      attrNamespaceURI = attr.namespaceURI;
      attrValue = attr.value;
      if (attrNamespaceURI) {
        attrName = attr.localName || attrName;
        fromValue = fromNode.getAttributeNS(attrNamespaceURI, attrName);
        if (fromValue !== attrValue) {
          if (attr.prefix === "xmlns") {
            attrName = attr.name;
          }
          fromNode.setAttributeNS(attrNamespaceURI, attrName, attrValue);
        }
      } else {
        fromValue = fromNode.getAttribute(attrName);
        if (fromValue !== attrValue) {
          fromNode.setAttribute(attrName, attrValue);
        }
      }
    }
    var fromNodeAttrs = fromNode.attributes;
    for (var d = fromNodeAttrs.length - 1; d >= 0; d--) {
      attr = fromNodeAttrs[d];
      attrName = attr.name;
      attrNamespaceURI = attr.namespaceURI;
      if (attrNamespaceURI) {
        attrName = attr.localName || attrName;
        if (!toNode.hasAttributeNS(attrNamespaceURI, attrName)) {
          fromNode.removeAttributeNS(attrNamespaceURI, attrName);
        }
      } else {
        if (!toNode.hasAttribute(attrName)) {
          fromNode.removeAttribute(attrName);
        }
      }
    }
  }
  var range;
  var NS_XHTML = "http://www.w3.org/1999/xhtml";
  var doc = typeof document === "undefined" ? void 0 : document;
  var HAS_TEMPLATE_SUPPORT = !!doc && "content" in doc.createElement("template");
  var HAS_RANGE_SUPPORT = !!doc && doc.createRange && "createContextualFragment" in doc.createRange();
  function createFragmentFromTemplate(str) {
    var template2 = doc.createElement("template");
    template2.innerHTML = str;
    return template2.content.childNodes[0];
  }
  function createFragmentFromRange(str) {
    if (!range) {
      range = doc.createRange();
      range.selectNode(doc.body);
    }
    var fragment = range.createContextualFragment(str);
    return fragment.childNodes[0];
  }
  function createFragmentFromWrap(str) {
    var fragment = doc.createElement("body");
    fragment.innerHTML = str;
    return fragment.childNodes[0];
  }
  function toElement(str) {
    str = str.trim();
    if (HAS_TEMPLATE_SUPPORT) {
      return createFragmentFromTemplate(str);
    } else if (HAS_RANGE_SUPPORT) {
      return createFragmentFromRange(str);
    }
    return createFragmentFromWrap(str);
  }
  function compareNodeNames(fromEl, toEl) {
    var fromNodeName = fromEl.nodeName;
    var toNodeName = toEl.nodeName;
    var fromCodeStart, toCodeStart;
    if (fromNodeName === toNodeName) {
      return true;
    }
    fromCodeStart = fromNodeName.charCodeAt(0);
    toCodeStart = toNodeName.charCodeAt(0);
    if (fromCodeStart <= 90 && toCodeStart >= 97) {
      return fromNodeName === toNodeName.toUpperCase();
    } else if (toCodeStart <= 90 && fromCodeStart >= 97) {
      return toNodeName === fromNodeName.toUpperCase();
    } else {
      return false;
    }
  }
  function createElementNS(name, namespaceURI) {
    return !namespaceURI || namespaceURI === NS_XHTML ? doc.createElement(name) : doc.createElementNS(namespaceURI, name);
  }
  function moveChildren(fromEl, toEl) {
    var curChild = fromEl.firstChild;
    while (curChild) {
      var nextChild = curChild.nextSibling;
      toEl.appendChild(curChild);
      curChild = nextChild;
    }
    return toEl;
  }
  function syncBooleanAttrProp(fromEl, toEl, name) {
    if (fromEl[name] !== toEl[name]) {
      fromEl[name] = toEl[name];
      if (fromEl[name]) {
        fromEl.setAttribute(name, "");
      } else {
        fromEl.removeAttribute(name);
      }
    }
  }
  var specialElHandlers = {
    OPTION: function(fromEl, toEl) {
      var parentNode = fromEl.parentNode;
      if (parentNode) {
        var parentName = parentNode.nodeName.toUpperCase();
        if (parentName === "OPTGROUP") {
          parentNode = parentNode.parentNode;
          parentName = parentNode && parentNode.nodeName.toUpperCase();
        }
        if (parentName === "SELECT" && !parentNode.hasAttribute("multiple")) {
          if (fromEl.hasAttribute("selected") && !toEl.selected) {
            fromEl.setAttribute("selected", "selected");
            fromEl.removeAttribute("selected");
          }
          parentNode.selectedIndex = -1;
        }
      }
      syncBooleanAttrProp(fromEl, toEl, "selected");
    },
    INPUT: function(fromEl, toEl) {
      syncBooleanAttrProp(fromEl, toEl, "checked");
      syncBooleanAttrProp(fromEl, toEl, "disabled");
      if (fromEl.value !== toEl.value) {
        fromEl.value = toEl.value;
      }
      if (!toEl.hasAttribute("value")) {
        fromEl.removeAttribute("value");
      }
    },
    TEXTAREA: function(fromEl, toEl) {
      var newValue = toEl.value;
      if (fromEl.value !== newValue) {
        fromEl.value = newValue;
      }
      var firstChild = fromEl.firstChild;
      if (firstChild) {
        var oldValue = firstChild.nodeValue;
        if (oldValue == newValue || !newValue && oldValue == fromEl.placeholder) {
          return;
        }
        firstChild.nodeValue = newValue;
      }
    },
    SELECT: function(fromEl, toEl) {
      if (!toEl.hasAttribute("multiple")) {
        var selectedIndex = -1;
        var i = 0;
        var curChild = fromEl.firstChild;
        var optgroup;
        var nodeName;
        while (curChild) {
          nodeName = curChild.nodeName && curChild.nodeName.toUpperCase();
          if (nodeName === "OPTGROUP") {
            optgroup = curChild;
            curChild = optgroup.firstChild;
          } else {
            if (nodeName === "OPTION") {
              if (curChild.hasAttribute("selected")) {
                selectedIndex = i;
                break;
              }
              i++;
            }
            curChild = curChild.nextSibling;
            if (!curChild && optgroup) {
              curChild = optgroup.nextSibling;
              optgroup = null;
            }
          }
        }
        fromEl.selectedIndex = selectedIndex;
      }
    }
  };
  var ELEMENT_NODE = 1;
  var DOCUMENT_FRAGMENT_NODE$1 = 11;
  var TEXT_NODE = 3;
  var COMMENT_NODE = 8;
  function noop() {
  }
  function defaultGetNodeKey(node) {
    if (node) {
      return node.getAttribute && node.getAttribute("id") || node.id;
    }
  }
  function morphdomFactory(morphAttrs2) {
    return function morphdom2(fromNode, toNode, options) {
      if (!options) {
        options = {};
      }
      if (typeof toNode === "string") {
        if (fromNode.nodeName === "#document" || fromNode.nodeName === "HTML" || fromNode.nodeName === "BODY") {
          var toNodeHtml = toNode;
          toNode = doc.createElement("html");
          toNode.innerHTML = toNodeHtml;
        } else {
          toNode = toElement(toNode);
        }
      }
      var getNodeKey = options.getNodeKey || defaultGetNodeKey;
      var onBeforeNodeAdded = options.onBeforeNodeAdded || noop;
      var onNodeAdded = options.onNodeAdded || noop;
      var onBeforeElUpdated = options.onBeforeElUpdated || noop;
      var onElUpdated = options.onElUpdated || noop;
      var onBeforeNodeDiscarded = options.onBeforeNodeDiscarded || noop;
      var onNodeDiscarded = options.onNodeDiscarded || noop;
      var onBeforeElChildrenUpdated = options.onBeforeElChildrenUpdated || noop;
      var childrenOnly = options.childrenOnly === true;
      var fromNodesLookup = /* @__PURE__ */ Object.create(null);
      var keyedRemovalList = [];
      function addKeyedRemoval(key) {
        keyedRemovalList.push(key);
      }
      function walkDiscardedChildNodes(node, skipKeyedNodes) {
        if (node.nodeType === ELEMENT_NODE) {
          var curChild = node.firstChild;
          while (curChild) {
            var key = void 0;
            if (skipKeyedNodes && (key = getNodeKey(curChild))) {
              addKeyedRemoval(key);
            } else {
              onNodeDiscarded(curChild);
              if (curChild.firstChild) {
                walkDiscardedChildNodes(curChild, skipKeyedNodes);
              }
            }
            curChild = curChild.nextSibling;
          }
        }
      }
      function removeNode(node, parentNode, skipKeyedNodes) {
        if (onBeforeNodeDiscarded(node) === false) {
          return;
        }
        if (parentNode) {
          parentNode.removeChild(node);
        }
        onNodeDiscarded(node);
        walkDiscardedChildNodes(node, skipKeyedNodes);
      }
      function indexTree(node) {
        if (node.nodeType === ELEMENT_NODE || node.nodeType === DOCUMENT_FRAGMENT_NODE$1) {
          var curChild = node.firstChild;
          while (curChild) {
            var key = getNodeKey(curChild);
            if (key) {
              fromNodesLookup[key] = curChild;
            }
            indexTree(curChild);
            curChild = curChild.nextSibling;
          }
        }
      }
      indexTree(fromNode);
      function handleNodeAdded(el) {
        onNodeAdded(el);
        var curChild = el.firstChild;
        while (curChild) {
          var nextSibling = curChild.nextSibling;
          var key = getNodeKey(curChild);
          if (key) {
            var unmatchedFromEl = fromNodesLookup[key];
            if (unmatchedFromEl && compareNodeNames(curChild, unmatchedFromEl)) {
              curChild.parentNode.replaceChild(unmatchedFromEl, curChild);
              morphEl(unmatchedFromEl, curChild);
            } else {
              handleNodeAdded(curChild);
            }
          } else {
            handleNodeAdded(curChild);
          }
          curChild = nextSibling;
        }
      }
      function cleanupFromEl(fromEl, curFromNodeChild, curFromNodeKey) {
        while (curFromNodeChild) {
          var fromNextSibling = curFromNodeChild.nextSibling;
          if (curFromNodeKey = getNodeKey(curFromNodeChild)) {
            addKeyedRemoval(curFromNodeKey);
          } else {
            removeNode(curFromNodeChild, fromEl, true);
          }
          curFromNodeChild = fromNextSibling;
        }
      }
      function morphEl(fromEl, toEl, childrenOnly2) {
        var toElKey = getNodeKey(toEl);
        if (toElKey) {
          delete fromNodesLookup[toElKey];
        }
        if (!childrenOnly2) {
          if (onBeforeElUpdated(fromEl, toEl) === false) {
            return;
          }
          morphAttrs2(fromEl, toEl);
          onElUpdated(fromEl);
          if (onBeforeElChildrenUpdated(fromEl, toEl) === false) {
            return;
          }
        }
        if (fromEl.nodeName !== "TEXTAREA") {
          morphChildren(fromEl, toEl);
        } else {
          specialElHandlers.TEXTAREA(fromEl, toEl);
        }
      }
      function morphChildren(fromEl, toEl) {
        var curToNodeChild = toEl.firstChild;
        var curFromNodeChild = fromEl.firstChild;
        var curToNodeKey;
        var curFromNodeKey;
        var fromNextSibling;
        var toNextSibling;
        var matchingFromEl;
        outer:
          while (curToNodeChild) {
            toNextSibling = curToNodeChild.nextSibling;
            curToNodeKey = getNodeKey(curToNodeChild);
            while (curFromNodeChild) {
              fromNextSibling = curFromNodeChild.nextSibling;
              if (curToNodeChild.isSameNode && curToNodeChild.isSameNode(curFromNodeChild)) {
                curToNodeChild = toNextSibling;
                curFromNodeChild = fromNextSibling;
                continue outer;
              }
              curFromNodeKey = getNodeKey(curFromNodeChild);
              var curFromNodeType = curFromNodeChild.nodeType;
              var isCompatible = void 0;
              if (curFromNodeType === curToNodeChild.nodeType) {
                if (curFromNodeType === ELEMENT_NODE) {
                  if (curToNodeKey) {
                    if (curToNodeKey !== curFromNodeKey) {
                      if (matchingFromEl = fromNodesLookup[curToNodeKey]) {
                        if (fromNextSibling === matchingFromEl) {
                          isCompatible = false;
                        } else {
                          fromEl.insertBefore(matchingFromEl, curFromNodeChild);
                          if (curFromNodeKey) {
                            addKeyedRemoval(curFromNodeKey);
                          } else {
                            removeNode(curFromNodeChild, fromEl, true);
                          }
                          curFromNodeChild = matchingFromEl;
                        }
                      } else {
                        isCompatible = false;
                      }
                    }
                  } else if (curFromNodeKey) {
                    isCompatible = false;
                  }
                  isCompatible = isCompatible !== false && compareNodeNames(curFromNodeChild, curToNodeChild);
                  if (isCompatible) {
                    morphEl(curFromNodeChild, curToNodeChild);
                  }
                } else if (curFromNodeType === TEXT_NODE || curFromNodeType == COMMENT_NODE) {
                  isCompatible = true;
                  if (curFromNodeChild.nodeValue !== curToNodeChild.nodeValue) {
                    curFromNodeChild.nodeValue = curToNodeChild.nodeValue;
                  }
                }
              }
              if (isCompatible) {
                curToNodeChild = toNextSibling;
                curFromNodeChild = fromNextSibling;
                continue outer;
              }
              if (curFromNodeKey) {
                addKeyedRemoval(curFromNodeKey);
              } else {
                removeNode(curFromNodeChild, fromEl, true);
              }
              curFromNodeChild = fromNextSibling;
            }
            if (curToNodeKey && (matchingFromEl = fromNodesLookup[curToNodeKey]) && compareNodeNames(matchingFromEl, curToNodeChild)) {
              fromEl.appendChild(matchingFromEl);
              morphEl(matchingFromEl, curToNodeChild);
            } else {
              var onBeforeNodeAddedResult = onBeforeNodeAdded(curToNodeChild);
              if (onBeforeNodeAddedResult !== false) {
                if (onBeforeNodeAddedResult) {
                  curToNodeChild = onBeforeNodeAddedResult;
                }
                if (curToNodeChild.actualize) {
                  curToNodeChild = curToNodeChild.actualize(fromEl.ownerDocument || doc);
                }
                fromEl.appendChild(curToNodeChild);
                handleNodeAdded(curToNodeChild);
              }
            }
            curToNodeChild = toNextSibling;
            curFromNodeChild = fromNextSibling;
          }
        cleanupFromEl(fromEl, curFromNodeChild, curFromNodeKey);
        var specialElHandler = specialElHandlers[fromEl.nodeName];
        if (specialElHandler) {
          specialElHandler(fromEl, toEl);
        }
      }
      var morphedNode = fromNode;
      var morphedNodeType = morphedNode.nodeType;
      var toNodeType = toNode.nodeType;
      if (!childrenOnly) {
        if (morphedNodeType === ELEMENT_NODE) {
          if (toNodeType === ELEMENT_NODE) {
            if (!compareNodeNames(fromNode, toNode)) {
              onNodeDiscarded(fromNode);
              morphedNode = moveChildren(fromNode, createElementNS(toNode.nodeName, toNode.namespaceURI));
            }
          } else {
            morphedNode = toNode;
          }
        } else if (morphedNodeType === TEXT_NODE || morphedNodeType === COMMENT_NODE) {
          if (toNodeType === morphedNodeType) {
            if (morphedNode.nodeValue !== toNode.nodeValue) {
              morphedNode.nodeValue = toNode.nodeValue;
            }
            return morphedNode;
          } else {
            morphedNode = toNode;
          }
        }
      }
      if (morphedNode === toNode) {
        onNodeDiscarded(fromNode);
      } else {
        if (toNode.isSameNode && toNode.isSameNode(morphedNode)) {
          return;
        }
        morphEl(morphedNode, toNode, childrenOnly);
        if (keyedRemovalList) {
          for (var i = 0, len = keyedRemovalList.length; i < len; i++) {
            var elToRemove = fromNodesLookup[keyedRemovalList[i]];
            if (elToRemove) {
              removeNode(elToRemove, elToRemove.parentNode, false);
            }
          }
        }
      }
      if (!childrenOnly && morphedNode !== fromNode && fromNode.parentNode) {
        if (morphedNode.actualize) {
          morphedNode = morphedNode.actualize(fromNode.ownerDocument || doc);
        }
        fromNode.parentNode.replaceChild(morphedNode, fromNode);
      }
      return morphedNode;
    };
  }
  var morphdom = morphdomFactory(morphAttrs);
  var morphdom_esm_default = morphdom;

  // ../../node_modules/cable_ready/javascript/operations.js
  var operations_default = {
    append: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { html, focusSelector } = operation;
          element.insertAdjacentHTML("beforeend", html || "");
          assignFocus(focusSelector);
        });
        after(element, operation);
      });
    },
    graft: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { parent, focusSelector } = operation;
          const parentElement = document.querySelector(parent);
          if (parentElement) {
            parentElement.appendChild(element);
            assignFocus(focusSelector);
          }
        });
        after(element, operation);
      });
    },
    innerHtml: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { html, focusSelector } = operation;
          element.innerHTML = html || "";
          assignFocus(focusSelector);
        });
        after(element, operation);
      });
    },
    insertAdjacentHtml: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { html, position, focusSelector } = operation;
          element.insertAdjacentHTML(position || "beforeend", html || "");
          assignFocus(focusSelector);
        });
        after(element, operation);
      });
    },
    insertAdjacentText: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { text, position, focusSelector } = operation;
          element.insertAdjacentText(position || "beforeend", text || "");
          assignFocus(focusSelector);
        });
        after(element, operation);
      });
    },
    morph: (operation) => {
      processElements(operation, (element) => {
        const { html } = operation;
        const template2 = document.createElement("template");
        template2.innerHTML = String(html).trim();
        operation.content = template2.content;
        const parent = element.parentElement;
        const ordinal = Array.from(parent.children).indexOf(element);
        before(element, operation);
        operate(operation, () => {
          const { childrenOnly, focusSelector } = operation;
          morphdom_esm_default(
            element,
            childrenOnly ? template2.content : template2.innerHTML,
            {
              childrenOnly: !!childrenOnly,
              onBeforeElUpdated: shouldMorph(operation),
              onElUpdated: didMorph(operation)
            }
          );
          assignFocus(focusSelector);
        });
        after(parent.children[ordinal], operation);
      });
    },
    outerHtml: (operation) => {
      processElements(operation, (element) => {
        const parent = element.parentElement;
        const ordinal = Array.from(parent.children).indexOf(element);
        before(element, operation);
        operate(operation, () => {
          const { html, focusSelector } = operation;
          element.outerHTML = html || "";
          assignFocus(focusSelector);
        });
        after(parent.children[ordinal], operation);
      });
    },
    prepend: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { html, focusSelector } = operation;
          element.insertAdjacentHTML("afterbegin", html || "");
          assignFocus(focusSelector);
        });
        after(element, operation);
      });
    },
    remove: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { focusSelector } = operation;
          element.remove();
          assignFocus(focusSelector);
        });
        after(document, operation);
      });
    },
    replace: (operation) => {
      processElements(operation, (element) => {
        const parent = element.parentElement;
        const ordinal = Array.from(parent.children).indexOf(element);
        before(element, operation);
        operate(operation, () => {
          const { html, focusSelector } = operation;
          element.outerHTML = html || "";
          assignFocus(focusSelector);
        });
        after(parent.children[ordinal], operation);
      });
    },
    textContent: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { text, focusSelector } = operation;
          element.textContent = text || "";
          assignFocus(focusSelector);
        });
        after(element, operation);
      });
    },
    addCssClass: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { name } = operation;
          element.classList.add(...getClassNames(name || ""));
        });
        after(element, operation);
      });
    },
    removeAttribute: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { name } = operation;
          element.removeAttribute(name);
        });
        after(element, operation);
      });
    },
    removeCssClass: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { name } = operation;
          element.classList.remove(...getClassNames(name));
        });
        after(element, operation);
      });
    },
    setAttribute: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { name, value } = operation;
          element.setAttribute(name, value || "");
        });
        after(element, operation);
      });
    },
    setDatasetProperty: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { name, value } = operation;
          element.dataset[name] = value || "";
        });
        after(element, operation);
      });
    },
    setProperty: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { name, value } = operation;
          if (name in element)
            element[name] = value || "";
        });
        after(element, operation);
      });
    },
    setStyle: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { name, value } = operation;
          element.style[name] = value || "";
        });
        after(element, operation);
      });
    },
    setStyles: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { styles } = operation;
          for (let [name, value] of Object.entries(styles))
            element.style[name] = value || "";
        });
        after(element, operation);
      });
    },
    setValue: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { value } = operation;
          element.value = value || "";
        });
        after(element, operation);
      });
    },
    dispatchEvent: (operation) => {
      processElements(operation, (element) => {
        before(element, operation);
        operate(operation, () => {
          const { name, detail } = operation;
          dispatch2(element, name, detail);
        });
        after(element, operation);
      });
    },
    setMeta: (operation) => {
      before(document, operation);
      operate(operation, () => {
        const { name, content } = operation;
        let meta = document.head.querySelector(`meta[name='${name}']`);
        if (!meta) {
          meta = document.createElement("meta");
          meta.name = name;
          document.head.appendChild(meta);
        }
        meta.content = content;
      });
      after(document, operation);
    },
    clearStorage: (operation) => {
      before(document, operation);
      operate(operation, () => {
        const { type } = operation;
        const storage = type === "session" ? sessionStorage : localStorage;
        storage.clear();
      });
      after(document, operation);
    },
    go: (operation) => {
      before(window, operation);
      operate(operation, () => {
        const { delta } = operation;
        history.go(delta);
      });
      after(window, operation);
    },
    pushState: (operation) => {
      before(window, operation);
      operate(operation, () => {
        const { state, title, url: url2 } = operation;
        history.pushState(state || {}, title || "", url2);
      });
      after(window, operation);
    },
    redirectTo: (operation) => {
      before(window, operation);
      operate(operation, () => {
        let { url: url2, action } = operation;
        action = action || "advance";
        if (window.Turbo)
          window.Turbo.visit(url2, { action });
        if (window.Turbolinks)
          window.Turbolinks.visit(url2, { action });
        if (!window.Turbo && !window.Turbolinks)
          window.location.href = url2;
      });
      after(window, operation);
    },
    reload: (operation) => {
      before(window, operation);
      operate(operation, () => {
        window.location.reload();
      });
      after(window, operation);
    },
    removeStorageItem: (operation) => {
      before(document, operation);
      operate(operation, () => {
        const { key, type } = operation;
        const storage = type === "session" ? sessionStorage : localStorage;
        storage.removeItem(key);
      });
      after(document, operation);
    },
    replaceState: (operation) => {
      before(window, operation);
      operate(operation, () => {
        const { state, title, url: url2 } = operation;
        history.replaceState(state || {}, title || "", url2);
      });
      after(window, operation);
    },
    scrollIntoView: (operation) => {
      const { element } = operation;
      before(element, operation);
      operate(operation, () => {
        element.scrollIntoView(operation);
      });
      after(element, operation);
    },
    setCookie: (operation) => {
      before(document, operation);
      operate(operation, () => {
        const { cookie } = operation;
        document.cookie = cookie || "";
      });
      after(document, operation);
    },
    setFocus: (operation) => {
      const { element } = operation;
      before(element, operation);
      operate(operation, () => {
        assignFocus(element);
      });
      after(element, operation);
    },
    setStorageItem: (operation) => {
      before(document, operation);
      operate(operation, () => {
        const { key, value, type } = operation;
        const storage = type === "session" ? sessionStorage : localStorage;
        storage.setItem(key, value || "");
      });
      after(document, operation);
    },
    consoleLog: (operation) => {
      before(document, operation);
      operate(operation, () => {
        const { message, level } = operation;
        level && ["warn", "info", "error"].includes(level) ? console[level](message || "") : console.log(message || "");
      });
      after(document, operation);
    },
    consoleTable: (operation) => {
      before(document, operation);
      operate(operation, () => {
        const { data: data2, columns } = operation;
        console.table(data2, columns || []);
      });
      after(document, operation);
    },
    notification: (operation) => {
      before(document, operation);
      operate(operation, () => {
        const { title, options } = operation;
        Notification.requestPermission().then((result) => {
          operation.permission = result;
          if (result === "granted")
            new Notification(title || "", options);
        });
      });
      after(document, operation);
    }
  };

  // ../../node_modules/cable_ready/javascript/operation_store.js
  var operations = operations_default;
  var add2 = (newOperations) => {
    operations = { ...operations, ...newOperations };
  };
  var addOperations = (operations2) => {
    add2(operations2);
  };
  var addOperation = (name, operation) => {
    const operations2 = {};
    operations2[name] = operation;
    add2(operations2);
  };
  var operation_store_default = {
    get all() {
      return operations;
    }
  };

  // ../../node_modules/cable_ready/javascript/action_cable.js
  var consumer2;
  var wait = () => new Promise((resolve) => setTimeout(resolve));
  var retryGetConsumer = async () => {
    if (!consumer2) {
      await wait();
      return retryGetConsumer();
    } else {
      return consumer2;
    }
  };
  var action_cable_default = {
    setConsumer(value) {
      consumer2 = value;
    },
    async getConsumer() {
      return new Promise((resolve, reject) => {
        consumer2 = retryGetConsumer();
        resolve(consumer2);
      });
    }
  };

  // ../../node_modules/cable_ready/javascript/elements/subscribing_element.js
  var SubscribingElement = class extends HTMLElement {
    disconnectedCallback() {
      if (this.channel)
        this.channel.unsubscribe();
    }
    createSubscription(consumer5, channel, receivedCallback) {
      this.channel = consumer5.subscriptions.create(
        {
          channel,
          identifier: this.getAttribute("identifier")
        },
        {
          received: receivedCallback
        }
      );
    }
    get preview() {
      return document.documentElement.hasAttribute("data-turbolinks-preview") || document.documentElement.hasAttribute("data-turbo-preview");
    }
  };

  // ../../node_modules/cable_ready/javascript/elements/stream_from_element.js
  var StreamFromElement = class extends SubscribingElement {
    async connectedCallback() {
      if (this.preview)
        return;
      const consumer5 = await javascript_default.consumer;
      if (consumer5) {
        this.createSubscription(
          consumer5,
          "CableReady::Stream",
          this.performOperations
        );
      } else {
        console.error(
          "The `stream_from` helper cannot connect without an ActionCable consumer.\nPlease run `rails generate cable_ready:helpers` to fix this."
        );
      }
    }
    performOperations(data2) {
      if (data2.cableReady)
        javascript_default.perform(data2.operations);
    }
  };

  // ../../node_modules/cable_ready/javascript/elements/updates_for_element.js
  var template = `
<style>
  :host {
    display: block;
  }
</style>
<slot></slot>
`;
  function url(ele) {
    return ele.hasAttribute("url") ? ele.getAttribute("url") : location.href;
  }
  var UpdatesForElement = class extends SubscribingElement {
    constructor() {
      super();
      const shadowRoot = this.attachShadow({ mode: "open" });
      shadowRoot.innerHTML = template;
    }
    async connectedCallback() {
      if (this.preview)
        return;
      this.update = debounce2(this.update.bind(this), this.debounce);
      const consumer5 = await javascript_default.consumer;
      if (consumer5) {
        this.createSubscription(consumer5, "CableReady::Stream", this.update);
      } else {
        console.error(
          "The `updates-for` helper cannot connect without an ActionCable consumer.\nPlease run `rails generate cable_ready:helpers` to fix this."
        );
      }
    }
    async update(data2) {
      const identifier = this.getAttribute("identifier");
      const query = `updates-for[identifier="${identifier}"]`;
      const blocks = document.querySelectorAll(query);
      if (blocks[0] !== this)
        return;
      const only = this.getAttribute("only");
      if (only && data2.changed && !only.split(" ").some((attribute) => data2.changed.includes(attribute)))
        return;
      const html = {};
      const template2 = document.createElement("template");
      for (let i = 0; i < blocks.length; i++) {
        blocks[i].setAttribute("updating", "updating");
        if (!html.hasOwnProperty(url(blocks[i]))) {
          const response = await graciouslyFetch(url(blocks[i]), {
            "X-Cable-Ready": "update"
          });
          html[url(blocks[i])] = await response.text();
        }
        template2.innerHTML = String(html[url(blocks[i])]).trim();
        await this.resolveTurboFrames(template2.content);
        const fragments = template2.content.querySelectorAll(query);
        if (fragments.length <= i) {
          console.warn("Update aborted due to mismatched number of elements");
          return;
        }
        active_element_default.set(document.activeElement);
        const operation = {
          element: blocks[i],
          html: fragments[i],
          permanentAttributeName: "data-ignore-updates"
        };
        dispatch2(blocks[i], "cable-ready:before-update", operation);
        morphdom_esm_default(blocks[i], fragments[i], {
          childrenOnly: true,
          onBeforeElUpdated: shouldMorph(operation),
          onElUpdated: (_) => {
            blocks[i].removeAttribute("updating");
            dispatch2(blocks[i], "cable-ready:after-update", operation);
            assignFocus(operation.focusSelector);
          }
        });
      }
    }
    async resolveTurboFrames(documentFragment) {
      const reloadingTurboFrames = [
        ...documentFragment.querySelectorAll(
          'turbo-frame[src]:not([loading="lazy"])'
        )
      ];
      return Promise.all(
        reloadingTurboFrames.map((frame) => {
          return new Promise(async (resolve) => {
            const frameResponse = await graciouslyFetch(
              frame.getAttribute("src"),
              {
                "Turbo-Frame": frame.id,
                "X-Cable-Ready": "update"
              }
            );
            const frameTemplate = document.createElement("template");
            frameTemplate.innerHTML = await frameResponse.text();
            await this.resolveTurboFrames(frameTemplate.content);
            documentFragment.querySelector(
              `turbo-frame#${frame.id}`
            ).innerHTML = String(
              frameTemplate.content.querySelector(`turbo-frame#${frame.id}`).innerHTML
            ).trim();
            resolve();
          });
        })
      );
    }
    get debounce() {
      return this.hasAttribute("debounce") ? parseInt(this.getAttribute("debounce")) : 20;
    }
  };

  // ../../node_modules/cable_ready/javascript/cable_ready.js
  var perform = (operations2, options = { emitMissingElementWarnings: true }) => {
    const batches = {};
    operations2.forEach((operation) => {
      if (!!operation.batch)
        batches[operation.batch] = batches[operation.batch] ? ++batches[operation.batch] : 1;
    });
    operations2.forEach((operation) => {
      const name = operation.operation;
      try {
        if (operation.selector) {
          operation.element = operation.xpath ? xpathToElement(operation.selector) : document[operation.selectAll ? "querySelectorAll" : "querySelector"](operation.selector);
        } else {
          operation.element = document;
        }
        if (operation.element || options.emitMissingElementWarnings) {
          active_element_default.set(document.activeElement);
          const cableReadyOperation = operation_store_default.all[name];
          if (cableReadyOperation) {
            cableReadyOperation(operation);
            if (!!operation.batch && --batches[operation.batch] === 0)
              dispatch2(document, "cable-ready:batch-complete", {
                batch: operation.batch
              });
          } else {
            console.error(
              `CableReady couldn't find the "${name}" operation. Make sure you use the camelized form when calling an operation method.`
            );
          }
        }
      } catch (e) {
        if (operation.element) {
          console.error(
            `CableReady detected an error in ${name}: ${e.message}. If you need to support older browsers make sure you've included the corresponding polyfills. https://docs.stimulusreflex.com/setup#polyfills-for-ie11.`
          );
          console.error(e);
        } else {
          console.warn(
            `CableReady ${name} failed due to missing DOM element for selector: '${operation.selector}'`
          );
        }
      }
    });
  };
  var performAsync = (operations2, options = { emitMissingElementWarnings: true }) => {
    return new Promise((resolve, reject) => {
      try {
        resolve(perform(operations2, options));
      } catch (err) {
        reject(err);
      }
    });
  };
  var initialize = (initializeOptions = {}) => {
    const { consumer: consumer5 } = initializeOptions;
    action_cable_default.setConsumer(consumer5);
    if (!customElements.get("stream-from"))
      customElements.define("stream-from", StreamFromElement);
    if (!customElements.get("updates-for"))
      customElements.define("updates-for", UpdatesForElement);
  };
  var consumer3 = action_cable_default.getConsumer();

  // ../../node_modules/cable_ready/javascript/index.js
  var javascript_default = {
    perform,
    performAsync,
    shouldMorphCallbacks,
    didMorphCallbacks,
    initialize,
    consumer: consumer3,
    addOperation,
    addOperations,
    version,
    get DOMOperations() {
      console.warn(
        "DEPRECATED: Please use `CableReady.operations` instead of `CableReady.DOMOperations`"
      );
      return operation_store_default.all;
    },
    get operations() {
      return operation_store_default.all;
    }
  };

  // ../../node_modules/stimulus_reflex/javascript/schema.js
  var defaultSchema2 = {
    reflexAttribute: "data-reflex",
    reflexPermanentAttribute: "data-reflex-permanent",
    reflexRootAttribute: "data-reflex-root",
    reflexSuppressLoggingAttribute: "data-reflex-suppress-logging",
    reflexDatasetAttribute: "data-reflex-dataset",
    reflexDatasetAllAttribute: "data-reflex-dataset-all",
    reflexSerializeFormAttribute: "data-reflex-serialize-form",
    reflexFormSelectorAttribute: "data-reflex-form-selector",
    reflexIncludeInnerHtmlAttribute: "data-reflex-include-inner-html",
    reflexIncludeTextContentAttribute: "data-reflex-include-text-content"
  };
  var schema = {};
  var schema_default = {
    set(application2) {
      schema = { ...defaultSchema2, ...application2.schema };
      for (const attribute in schema)
        Object.defineProperty(this, attribute.slice(0, -9), {
          get: () => {
            return schema[attribute];
          }
        });
    }
  };

  // ../../node_modules/stimulus_reflex/javascript/isolation_mode.js
  var isolationMode = false;
  var isolation_mode_default = {
    get disabled() {
      return !isolationMode;
    },
    set(value) {
      isolationMode = value;
    }
  };

  // ../../node_modules/stimulus_reflex/javascript/deprecate.js
  var deprecationWarnings = true;
  var deprecate_default = {
    get enabled() {
      return deprecationWarnings;
    },
    get disabled() {
      return !deprecationWarnings;
    },
    get value() {
      return deprecationWarnings;
    },
    set(value) {
      deprecationWarnings = !!value;
    },
    set deprecate(value) {
      deprecationWarnings = !!value;
    }
  };

  // ../../node_modules/stimulus_reflex/javascript/attributes.js
  var multipleInstances = (element) => {
    if (["checkbox", "radio"].includes(element.type)) {
      return document.querySelectorAll(
        `input[type="${element.type}"][name="${element.name}"]`
      ).length > 1;
    }
    return false;
  };
  var collectCheckedOptions = (element) => {
    return Array.from(element.querySelectorAll("option:checked")).concat(
      Array.from(
        document.querySelectorAll(
          `input[type="${element.type}"][name="${element.name}"]`
        )
      ).filter((elem) => elem.checked)
    ).map((o) => o.value);
  };
  var attributeValue = (values = []) => {
    const value = values.filter((v) => v && String(v).length).map((v) => v.trim()).join(" ").trim();
    return value.length ? value : null;
  };
  var attributeValues = (value) => {
    if (!value)
      return [];
    if (!value.length)
      return [];
    return value.split(" ").filter((v) => v.trim().length);
  };
  var extractElementAttributes = (element) => {
    let attrs = Array.from(element.attributes).reduce((memo, attr) => {
      memo[attr.name] = attr.value;
      return memo;
    }, {});
    attrs.checked = !!element.checked;
    attrs.selected = !!element.selected;
    attrs.tag_name = element.tagName;
    if (element.tagName.match(/select/i) || multipleInstances(element)) {
      const collectedOptions = collectCheckedOptions(element);
      attrs.values = collectedOptions;
      attrs.value = collectedOptions.join(",");
    } else {
      attrs.value = element.value;
    }
    return attrs;
  };
  var getElementsFromTokens = (element, tokens) => {
    if (!tokens || tokens.length === 0)
      return [];
    let elements = [element];
    const xPath = elementToXPath(element);
    tokens.forEach((token) => {
      try {
        switch (token) {
          case "combined":
            if (deprecate_default.enabled)
              console.warn(
                "In the next version of StimulusReflex, the 'combined' option to data-reflex-dataset will become 'ancestors'."
              );
            elements = [
              ...elements,
              ...XPathToArray(`${xPath}/ancestor::*`, true)
            ];
            break;
          case "ancestors":
            elements = [
              ...elements,
              ...XPathToArray(`${xPath}/ancestor::*`, true)
            ];
            break;
          case "parent":
            elements = [...elements, ...XPathToArray(`${xPath}/parent::*`)];
            break;
          case "siblings":
            elements = [
              ...elements,
              ...XPathToArray(
                `${xPath}/preceding-sibling::*|${xPath}/following-sibling::*`
              )
            ];
            break;
          case "children":
            elements = [...elements, ...XPathToArray(`${xPath}/child::*`)];
            break;
          case "descendants":
            elements = [...elements, ...XPathToArray(`${xPath}/descendant::*`)];
            break;
          default:
            elements = [...elements, ...document.querySelectorAll(token)];
        }
      } catch (error4) {
        if (debug_default.enabled)
          console.error(error4);
      }
    });
    return elements;
  };
  var extractElementDataset = (element) => {
    const dataset = element.attributes[schema_default.reflexDataset];
    const allDataset = element.attributes[schema_default.reflexDatasetAll];
    const tokens = dataset && dataset.value.split(" ") || [];
    const allTokens = allDataset && allDataset.value.split(" ") || [];
    const datasetElements = getElementsFromTokens(element, tokens);
    const datasetAllElements = getElementsFromTokens(element, allTokens);
    const datasetAttributes = datasetElements.reduce((acc, ele) => {
      return { ...extractDataAttributes(ele), ...acc };
    }, {});
    const reflexElementAttributes = extractDataAttributes(element);
    const elementDataset = {
      dataset: { ...reflexElementAttributes, ...datasetAttributes },
      datasetAll: {}
    };
    datasetAllElements.forEach((element2) => {
      const elementAttributes = extractDataAttributes(element2);
      Object.keys(elementAttributes).forEach((key) => {
        const value = elementAttributes[key];
        if (elementDataset.datasetAll[key] && Array.isArray(elementDataset.datasetAll[key])) {
          elementDataset.datasetAll[key].push(value);
        } else {
          elementDataset.datasetAll[key] = [value];
        }
      });
    });
    return elementDataset;
  };
  var extractDataAttributes = (element) => {
    let attrs = {};
    if (element && element.attributes) {
      Array.from(element.attributes).forEach((attr) => {
        if (attr.name.startsWith("data-")) {
          attrs[attr.name] = attr.value;
        }
      });
    }
    return attrs;
  };

  // ../../node_modules/stimulus_reflex/javascript/controllers.js
  var localReflexControllers = (app, element) => {
    return attributeValues(element.getAttribute(schema_default.controller)).reduce(
      (memo, name) => {
        const controller = app.getControllerForElementAndIdentifier(element, name);
        if (controller && controller.StimulusReflex)
          memo.push(controller);
        return memo;
      },
      []
    );
  };
  var allReflexControllers = (app, element) => {
    let controllers = [];
    while (element) {
      controllers = controllers.concat(localReflexControllers(app, element));
      element = element.parentElement;
    }
    return controllers;
  };
  var findControllerByReflexName = (reflexName, controllers) => {
    const controller = controllers.find((controller2) => {
      if (!controller2.identifier)
        return;
      return extractReflexName(reflexName).replace(/([a-z0–9])([A-Z])/g, "$1-$2").replace(/(::)/g, "--").toLowerCase() === controller2.identifier;
    });
    return controller || controllers[0];
  };

  // ../../node_modules/stimulus_reflex/javascript/reflexes.js
  var reflexes = {};
  var received = (data2) => {
    if (!data2.cableReady)
      return;
    let reflexOperations = [];
    for (let i = data2.operations.length - 1; i >= 0; i--) {
      if (data2.operations[i].stimulusReflex) {
        reflexOperations.push(data2.operations[i]);
        data2.operations.splice(i, 1);
      }
    }
    if (reflexOperations.some((operation) => {
      return operation.stimulusReflex.url !== location.href;
    }))
      return;
    let reflexData;
    if (reflexOperations.length) {
      reflexData = reflexOperations[0].stimulusReflex;
      reflexData.payload = reflexOperations[0].payload;
    }
    if (reflexData) {
      const { reflexId, payload } = reflexData;
      if (!reflexes[reflexId] && isolation_mode_default.disabled) {
        const controllerElement = XPathToElement(reflexData.xpathController);
        const reflexElement = XPathToElement(reflexData.xpathElement);
        controllerElement.reflexController = controllerElement.reflexController || {};
        controllerElement.reflexData = controllerElement.reflexData || {};
        controllerElement.reflexError = controllerElement.reflexError || {};
        controllerElement.reflexController[reflexId] = reflexes.app.getControllerForElementAndIdentifier(
          controllerElement,
          reflexData.reflexController
        );
        controllerElement.reflexData[reflexId] = reflexData;
        dispatchLifecycleEvent(
          "before",
          reflexElement,
          controllerElement,
          reflexId,
          payload
        );
        registerReflex(reflexData);
      }
      if (reflexes[reflexId]) {
        reflexes[reflexId].totalOperations = reflexOperations.length;
        reflexes[reflexId].pendingOperations = reflexOperations.length;
        reflexes[reflexId].completedOperations = 0;
        reflexes[reflexId].piggybackOperations = data2.operations;
        javascript_default.perform(reflexOperations);
      }
    } else {
      if (data2.operations.length && reflexes[data2.operations[0].reflexId])
        javascript_default.perform(data2.operations);
    }
  };
  var registerReflex = (data2) => {
    const { reflexId } = data2;
    reflexes[reflexId] = { finalStage: "finalize" };
    const promise = new Promise((resolve, reject) => {
      reflexes[reflexId].promise = {
        resolve,
        reject,
        data: data2
      };
    });
    promise.reflexId = reflexId;
    if (debug_default.enabled)
      promise.catch(() => {
      });
    return promise;
  };
  var getReflexRoots = (element) => {
    let list = [];
    while (list.length === 0 && element) {
      let reflexRoot = element.getAttribute(schema_default.reflexRoot);
      if (reflexRoot) {
        if (reflexRoot.length === 0 && element.id)
          reflexRoot = `#${element.id}`;
        const selectors = reflexRoot.split(",").filter((s) => s.trim().length);
        if (debug_default.enabled && selectors.length === 0) {
          console.error(
            `No value found for ${schema_default.reflexRoot}. Add an #id to the element or provide a value for ${schema_default.reflexRoot}.`,
            element
          );
        }
        list = list.concat(selectors.filter((s) => document.querySelector(s)));
      }
      element = element.parentElement ? element.parentElement.closest(`[${schema_default.reflexRoot}]`) : null;
    }
    return list;
  };
  var setupDeclarativeReflexes = debounce(() => {
    document.querySelectorAll(`[${schema_default.reflex}]`).forEach((element) => {
      const controllers = attributeValues(element.getAttribute(schema_default.controller));
      const reflexAttributeNames = attributeValues(
        element.getAttribute(schema_default.reflex)
      );
      const actions = attributeValues(element.getAttribute(schema_default.action));
      reflexAttributeNames.forEach((reflexName) => {
        const controller = findControllerByReflexName(
          reflexName,
          allReflexControllers(reflexes.app, element)
        );
        let action;
        if (controller) {
          action = `${reflexName.split("->")[0]}->${controller.identifier}#__perform`;
          if (!actions.includes(action))
            actions.push(action);
        } else {
          action = `${reflexName.split("->")[0]}->stimulus-reflex#__perform`;
          if (!controllers.includes("stimulus-reflex")) {
            controllers.push("stimulus-reflex");
          }
          if (!actions.includes(action))
            actions.push(action);
        }
      });
      const controllerValue = attributeValue(controllers);
      const actionValue = attributeValue(actions);
      if (controllerValue && element.getAttribute(schema_default.controller) != controllerValue) {
        element.setAttribute(schema_default.controller, controllerValue);
      }
      if (actionValue && element.getAttribute(schema_default.action) != actionValue)
        element.setAttribute(schema_default.action, actionValue);
    });
    emitEvent("stimulus-reflex:ready");
  }, 20);
  var reflexes_default = reflexes;

  // ../../node_modules/stimulus_reflex/javascript/lifecycle.js
  var invokeLifecycleMethod = (stage, reflexElement, controllerElement, reflexId, payload) => {
    if (!controllerElement || !controllerElement.reflexData[reflexId])
      return;
    const controller = controllerElement.reflexController[reflexId];
    const reflex = controllerElement.reflexData[reflexId].target;
    const reflexMethodName = reflex.split("#")[1];
    const specificLifecycleMethodName = ["before", "after", "finalize"].includes(
      stage
    ) ? `${stage}${camelize3(reflexMethodName)}` : `${camelize3(reflexMethodName, false)}${camelize3(stage)}`;
    const specificLifecycleMethod = controller[specificLifecycleMethodName];
    const genericLifecycleMethodName = ["before", "after", "finalize"].includes(
      stage
    ) ? `${stage}Reflex` : `reflex${camelize3(stage)}`;
    const genericLifecycleMethod = controller[genericLifecycleMethodName];
    if (typeof specificLifecycleMethod === "function") {
      specificLifecycleMethod.call(
        controller,
        reflexElement,
        reflex,
        controllerElement.reflexError[reflexId],
        reflexId,
        payload
      );
    }
    if (typeof genericLifecycleMethod === "function") {
      genericLifecycleMethod.call(
        controller,
        reflexElement,
        reflex,
        controllerElement.reflexError[reflexId],
        reflexId,
        payload
      );
    }
    if (reflexes_default[reflexId] && stage === reflexes_default[reflexId].finalStage) {
      Reflect.deleteProperty(controllerElement.reflexController, reflexId);
      Reflect.deleteProperty(controllerElement.reflexData, reflexId);
      Reflect.deleteProperty(controllerElement.reflexError, reflexId);
    }
  };
  document.addEventListener(
    "stimulus-reflex:before",
    (event) => invokeLifecycleMethod(
      "before",
      event.detail.element,
      event.detail.controller.element,
      event.detail.reflexId,
      event.detail.payload
    ),
    true
  );
  document.addEventListener(
    "stimulus-reflex:success",
    (event) => {
      invokeLifecycleMethod(
        "success",
        event.detail.element,
        event.detail.controller.element,
        event.detail.reflexId,
        event.detail.payload
      );
      dispatchLifecycleEvent(
        "after",
        event.detail.element,
        event.detail.controller.element,
        event.detail.reflexId,
        event.detail.payload
      );
    },
    true
  );
  document.addEventListener(
    "stimulus-reflex:nothing",
    (event) => {
      dispatchLifecycleEvent(
        "success",
        event.detail.element,
        event.detail.controller.element,
        event.detail.reflexId,
        event.detail.payload
      );
    },
    true
  );
  document.addEventListener(
    "stimulus-reflex:error",
    (event) => {
      invokeLifecycleMethod(
        "error",
        event.detail.element,
        event.detail.controller.element,
        event.detail.reflexId,
        event.detail.payload
      );
      dispatchLifecycleEvent(
        "after",
        event.detail.element,
        event.detail.controller.element,
        event.detail.reflexId,
        event.detail.payload
      );
    },
    true
  );
  document.addEventListener(
    "stimulus-reflex:halted",
    (event) => invokeLifecycleMethod(
      "halted",
      event.detail.element,
      event.detail.controller.element,
      event.detail.reflexId,
      event.detail.payload
    ),
    true
  );
  document.addEventListener(
    "stimulus-reflex:after",
    (event) => invokeLifecycleMethod(
      "after",
      event.detail.element,
      event.detail.controller.element,
      event.detail.reflexId,
      event.detail.payload
    ),
    true
  );
  document.addEventListener(
    "stimulus-reflex:finalize",
    (event) => invokeLifecycleMethod(
      "finalize",
      event.detail.element,
      event.detail.controller.element,
      event.detail.reflexId,
      event.detail.payload
    ),
    true
  );
  var dispatchLifecycleEvent = (stage, reflexElement, controllerElement, reflexId, payload) => {
    if (!controllerElement) {
      if (debug_default.enabled && !reflexes_default[reflexId].warned) {
        console.warn(
          `StimulusReflex was not able execute callbacks or emit events for "${stage}" or later life-cycle stages for this Reflex. The StimulusReflex Controller Element is no longer present in the DOM. Could you move the StimulusReflex Controller to an element higher in your DOM?`
        );
        reflexes_default[reflexId].warned = true;
      }
      return;
    }
    if (!controllerElement.reflexController || controllerElement.reflexController && !controllerElement.reflexController[reflexId]) {
      if (debug_default.enabled && !reflexes_default[reflexId].warned) {
        console.warn(
          `StimulusReflex detected that the StimulusReflex Controller responsible for this Reflex has been replaced with a new instance. Callbacks and events for "${stage}" or later life-cycle stages cannot be executed.`
        );
        reflexes_default[reflexId].warned = true;
      }
      return;
    }
    const { target } = controllerElement.reflexData[reflexId] || {};
    const controller = controllerElement.reflexController[reflexId] || {};
    const event = `stimulus-reflex:${stage}`;
    const action = `${event}:${target.split("#")[1]}`;
    const detail = {
      reflex: target,
      controller,
      reflexId,
      element: reflexElement,
      payload
    };
    const options = { bubbles: true, cancelable: false, detail };
    controllerElement.dispatchEvent(new CustomEvent(event, options));
    controllerElement.dispatchEvent(new CustomEvent(action, options));
    if (window.jQuery) {
      window.jQuery(controllerElement).trigger(event, detail);
      window.jQuery(controllerElement).trigger(action, detail);
    }
  };

  // ../../node_modules/stimulus_reflex/javascript/log.js
  var request = (reflexId, target, args, controller, element, controllerElement) => {
    const reflex = reflexes_default[reflexId];
    if (debug_default.disabled || reflex.promise.data.suppressLogging)
      return;
    reflex.timestamp = new Date();
    console.log(`\u2191 stimulus \u2191 ${target}`, {
      reflexId,
      args,
      controller,
      element,
      controllerElement
    });
  };
  var success = (event, halted2) => {
    const { detail } = event || {};
    const { selector, payload } = detail || {};
    const { reflexId, target, morph } = detail.stimulusReflex || {};
    const reflex = reflexes_default[reflexId];
    if (debug_default.disabled || reflex.promise.data.suppressLogging)
      return;
    const progress = reflex.totalOperations > 1 ? ` ${reflex.completedOperations}/${reflex.totalOperations}` : "";
    const duration = reflex.timestamp ? `in ${new Date() - reflex.timestamp}ms` : "CLONED";
    const operation = event.type.split(":")[1].split("-").slice(1).join("_");
    console.log(
      `\u2193 reflex \u2193 ${target} \u2192 ${selector || "\u221E"}${progress} ${duration}`,
      { reflexId, morph, operation, halted: halted2, payload }
    );
  };
  var error2 = (event) => {
    const { detail } = event || {};
    const { reflexId, target, payload } = detail.stimulusReflex || {};
    const reflex = reflexes_default[reflexId];
    if (debug_default.disabled || reflex.promise.data.suppressLogging)
      return;
    const duration = reflex.timestamp ? `in ${new Date() - reflex.timestamp}ms` : "CLONED";
    console.log(
      `\u2193 reflex \u2193 ${target} ${duration} %cERROR: ${event.detail.body}`,
      "color: #f00;",
      { reflexId, payload }
    );
  };
  var log_default = { request, success, error: error2 };

  // ../../node_modules/stimulus_reflex/javascript/callbacks.js
  var beforeDOMUpdate = (event) => {
    const { stimulusReflex, payload } = event.detail || {};
    if (!stimulusReflex)
      return;
    const { reflexId, xpathElement, xpathController } = stimulusReflex;
    const controllerElement = XPathToElement(xpathController);
    const reflexElement = XPathToElement(xpathElement);
    const reflex = reflexes_default[reflexId];
    const { promise } = reflex;
    reflex.pendingOperations--;
    if (reflex.pendingOperations > 0)
      return;
    if (!stimulusReflex.resolveLate)
      setTimeout(
        () => promise.resolve({
          element: reflexElement,
          event,
          data: promise.data,
          payload,
          reflexId,
          toString: () => ""
        })
      );
    setTimeout(
      () => dispatchLifecycleEvent(
        "success",
        reflexElement,
        controllerElement,
        reflexId,
        payload
      )
    );
  };
  var afterDOMUpdate = (event) => {
    const { stimulusReflex, payload } = event.detail || {};
    if (!stimulusReflex)
      return;
    const { reflexId, xpathElement, xpathController } = stimulusReflex;
    const controllerElement = XPathToElement(xpathController);
    const reflexElement = XPathToElement(xpathElement);
    const reflex = reflexes_default[reflexId];
    const { promise } = reflex;
    reflex.completedOperations++;
    log_default.success(event, false);
    if (reflex.completedOperations < reflex.totalOperations)
      return;
    if (stimulusReflex.resolveLate)
      setTimeout(
        () => promise.resolve({
          element: reflexElement,
          event,
          data: promise.data,
          payload,
          reflexId,
          toString: () => ""
        })
      );
    setTimeout(
      () => dispatchLifecycleEvent(
        "finalize",
        reflexElement,
        controllerElement,
        reflexId,
        payload
      )
    );
    if (reflex.piggybackOperations.length)
      javascript_default.perform(reflex.piggybackOperations);
  };
  var routeReflexEvent = (event) => {
    const { stimulusReflex, payload, name, body } = event.detail || {};
    const eventType = name.split("-")[2];
    if (!stimulusReflex || !["nothing", "halted", "error"].includes(eventType))
      return;
    const { reflexId, xpathElement, xpathController } = stimulusReflex;
    const reflexElement = XPathToElement(xpathElement);
    const controllerElement = XPathToElement(xpathController);
    const reflex = reflexes_default[reflexId];
    const { promise } = reflex;
    if (controllerElement) {
      controllerElement.reflexError = controllerElement.reflexError || {};
      if (eventType === "error")
        controllerElement.reflexError[reflexId] = body;
    }
    switch (eventType) {
      case "nothing":
        nothing(event, payload, promise, reflex, reflexElement);
        break;
      case "error":
        error3(event, payload, promise, reflex, reflexElement);
        break;
      case "halted":
        halted(event, payload, promise, reflex, reflexElement);
        break;
    }
    setTimeout(
      () => dispatchLifecycleEvent(
        eventType,
        reflexElement,
        controllerElement,
        reflexId,
        payload
      )
    );
    if (reflex.piggybackOperations.length)
      javascript_default.perform(reflex.piggybackOperations);
  };
  var nothing = (event, payload, promise, reflex, reflexElement) => {
    reflex.finalStage = "after";
    log_default.success(event, false);
    setTimeout(
      () => promise.resolve({
        data: promise.data,
        element: reflexElement,
        event,
        payload,
        reflexId: promise.data.reflexId,
        toString: () => ""
      })
    );
  };
  var halted = (event, payload, promise, reflex, reflexElement) => {
    reflex.finalStage = "halted";
    log_default.success(event, true);
    setTimeout(
      () => promise.resolve({
        data: promise.data,
        element: reflexElement,
        event,
        payload,
        reflexId: promise.data.reflexId,
        toString: () => ""
      })
    );
  };
  var error3 = (event, payload, promise, reflex, reflexElement) => {
    reflex.finalStage = "after";
    log_default.error(event);
    setTimeout(
      () => promise.reject({
        data: promise.data,
        element: reflexElement,
        event,
        payload,
        reflexId: promise.data.reflexId,
        error: event.detail.body,
        toString: () => event.detail.body
      })
    );
  };

  // ../../node_modules/stimulus_reflex/javascript/reflex_data.js
  var ReflexData = class {
    constructor(options, reflexElement, controllerElement, reflexController, permanentAttributeName, target, args, url2, tabId2) {
      this.options = options;
      this.reflexElement = reflexElement;
      this.controllerElement = controllerElement;
      this.reflexController = reflexController;
      this.permanentAttributeName = permanentAttributeName;
      this.target = target;
      this.args = args;
      this.url = url2;
      this.tabId = tabId2;
    }
    get attrs() {
      this._attrs = this._attrs || this.options["attrs"] || extractElementAttributes(this.reflexElement);
      return this._attrs;
    }
    get reflexId() {
      this._reflexId = this._reflexId || this.options["reflexId"] || uuidv4();
      return this._reflexId;
    }
    get selectors() {
      this._selectors = this._selectors || this.options["selectors"] || getReflexRoots(this.reflexElement);
      return typeof this._selectors === "string" ? [this._selectors] : this._selectors;
    }
    get resolveLate() {
      return this.options["resolveLate"] || false;
    }
    get dataset() {
      this._dataset = this._dataset || extractElementDataset(this.reflexElement);
      return this._dataset;
    }
    get innerHTML() {
      return this.includeInnerHtml ? this.reflexElement.innerHTML : "";
    }
    get textContent() {
      return this.includeTextContent ? this.reflexElement.textContent : "";
    }
    get xpathController() {
      return elementToXPath(this.controllerElement);
    }
    get xpathElement() {
      return elementToXPath(this.reflexElement);
    }
    get formSelector() {
      const attr = this.reflexElement.attributes[schema_default.reflexFormSelector] ? this.reflexElement.attributes[schema_default.reflexFormSelector].value : void 0;
      return this.options["formSelector"] || attr;
    }
    get includeInnerHtml() {
      const attr = this.reflexElement.attributes[schema_default.reflexIncludeInnerHtml] || false;
      return this.options["includeInnerHTML"] || attr ? attr.value !== "false" : false;
    }
    get includeTextContent() {
      const attr = this.reflexElement.attributes[schema_default.reflexIncludeTextContent] || false;
      return this.options["includeTextContent"] || attr ? attr.value !== "false" : false;
    }
    get suppressLogging() {
      return this.options["suppressLogging"] || this.reflexElement.attributes[schema_default.reflexSuppressLogging] || false;
    }
    valueOf() {
      return {
        attrs: this.attrs,
        dataset: this.dataset,
        selectors: this.selectors,
        reflexId: this.reflexId,
        resolveLate: this.resolveLate,
        suppressLogging: this.suppressLogging,
        xpathController: this.xpathController,
        xpathElement: this.xpathElement,
        inner_html: this.innerHTML,
        text_content: this.textContent,
        formSelector: this.formSelector,
        reflexController: this.reflexController,
        permanentAttributeName: this.permanentAttributeName,
        target: this.target,
        args: this.args,
        url: this.url,
        tabId: this.tabId
      };
    }
  };

  // ../../node_modules/@rails/actioncable/app/assets/javascripts/actioncable.esm.js
  var adapters = {
    logger: self.console,
    WebSocket: self.WebSocket
  };
  var logger = {
    log(...messages) {
      if (this.enabled) {
        messages.push(Date.now());
        adapters.logger.log("[ActionCable]", ...messages);
      }
    }
  };
  var now2 = () => new Date().getTime();
  var secondsSince2 = (time) => (now2() - time) / 1e3;
  var ConnectionMonitor2 = class {
    constructor(connection) {
      this.visibilityDidChange = this.visibilityDidChange.bind(this);
      this.connection = connection;
      this.reconnectAttempts = 0;
    }
    start() {
      if (!this.isRunning()) {
        this.startedAt = now2();
        delete this.stoppedAt;
        this.startPolling();
        addEventListener("visibilitychange", this.visibilityDidChange);
        logger.log(`ConnectionMonitor started. stale threshold = ${this.constructor.staleThreshold} s`);
      }
    }
    stop() {
      if (this.isRunning()) {
        this.stoppedAt = now2();
        this.stopPolling();
        removeEventListener("visibilitychange", this.visibilityDidChange);
        logger.log("ConnectionMonitor stopped");
      }
    }
    isRunning() {
      return this.startedAt && !this.stoppedAt;
    }
    recordPing() {
      this.pingedAt = now2();
    }
    recordConnect() {
      this.reconnectAttempts = 0;
      this.recordPing();
      delete this.disconnectedAt;
      logger.log("ConnectionMonitor recorded connect");
    }
    recordDisconnect() {
      this.disconnectedAt = now2();
      logger.log("ConnectionMonitor recorded disconnect");
    }
    startPolling() {
      this.stopPolling();
      this.poll();
    }
    stopPolling() {
      clearTimeout(this.pollTimeout);
    }
    poll() {
      this.pollTimeout = setTimeout(() => {
        this.reconnectIfStale();
        this.poll();
      }, this.getPollInterval());
    }
    getPollInterval() {
      const { staleThreshold, reconnectionBackoffRate } = this.constructor;
      const backoff = Math.pow(1 + reconnectionBackoffRate, Math.min(this.reconnectAttempts, 10));
      const jitterMax = this.reconnectAttempts === 0 ? 1 : reconnectionBackoffRate;
      const jitter = jitterMax * Math.random();
      return staleThreshold * 1e3 * backoff * (1 + jitter);
    }
    reconnectIfStale() {
      if (this.connectionIsStale()) {
        logger.log(`ConnectionMonitor detected stale connection. reconnectAttempts = ${this.reconnectAttempts}, time stale = ${secondsSince2(this.refreshedAt)} s, stale threshold = ${this.constructor.staleThreshold} s`);
        this.reconnectAttempts++;
        if (this.disconnectedRecently()) {
          logger.log(`ConnectionMonitor skipping reopening recent disconnect. time disconnected = ${secondsSince2(this.disconnectedAt)} s`);
        } else {
          logger.log("ConnectionMonitor reopening");
          this.connection.reopen();
        }
      }
    }
    get refreshedAt() {
      return this.pingedAt ? this.pingedAt : this.startedAt;
    }
    connectionIsStale() {
      return secondsSince2(this.refreshedAt) > this.constructor.staleThreshold;
    }
    disconnectedRecently() {
      return this.disconnectedAt && secondsSince2(this.disconnectedAt) < this.constructor.staleThreshold;
    }
    visibilityDidChange() {
      if (document.visibilityState === "visible") {
        setTimeout(() => {
          if (this.connectionIsStale() || !this.connection.isOpen()) {
            logger.log(`ConnectionMonitor reopening stale connection on visibilitychange. visibilityState = ${document.visibilityState}`);
            this.connection.reopen();
          }
        }, 200);
      }
    }
  };
  ConnectionMonitor2.staleThreshold = 6;
  ConnectionMonitor2.reconnectionBackoffRate = 0.15;
  var INTERNAL = {
    message_types: {
      welcome: "welcome",
      disconnect: "disconnect",
      ping: "ping",
      confirmation: "confirm_subscription",
      rejection: "reject_subscription"
    },
    disconnect_reasons: {
      unauthorized: "unauthorized",
      invalid_request: "invalid_request",
      server_restart: "server_restart"
    },
    default_mount_path: "/cable",
    protocols: ["actioncable-v1-json", "actioncable-unsupported"]
  };
  var { message_types: message_types2, protocols: protocols2 } = INTERNAL;
  var supportedProtocols2 = protocols2.slice(0, protocols2.length - 1);
  var indexOf2 = [].indexOf;
  var Connection2 = class {
    constructor(consumer5) {
      this.open = this.open.bind(this);
      this.consumer = consumer5;
      this.subscriptions = this.consumer.subscriptions;
      this.monitor = new ConnectionMonitor2(this);
      this.disconnected = true;
    }
    send(data2) {
      if (this.isOpen()) {
        this.webSocket.send(JSON.stringify(data2));
        return true;
      } else {
        return false;
      }
    }
    open() {
      if (this.isActive()) {
        logger.log(`Attempted to open WebSocket, but existing socket is ${this.getState()}`);
        return false;
      } else {
        logger.log(`Opening WebSocket, current state is ${this.getState()}, subprotocols: ${protocols2}`);
        if (this.webSocket) {
          this.uninstallEventHandlers();
        }
        this.webSocket = new adapters.WebSocket(this.consumer.url, protocols2);
        this.installEventHandlers();
        this.monitor.start();
        return true;
      }
    }
    close({ allowReconnect } = {
      allowReconnect: true
    }) {
      if (!allowReconnect) {
        this.monitor.stop();
      }
      if (this.isOpen()) {
        return this.webSocket.close();
      }
    }
    reopen() {
      logger.log(`Reopening WebSocket, current state is ${this.getState()}`);
      if (this.isActive()) {
        try {
          return this.close();
        } catch (error4) {
          logger.log("Failed to reopen WebSocket", error4);
        } finally {
          logger.log(`Reopening WebSocket in ${this.constructor.reopenDelay}ms`);
          setTimeout(this.open, this.constructor.reopenDelay);
        }
      } else {
        return this.open();
      }
    }
    getProtocol() {
      if (this.webSocket) {
        return this.webSocket.protocol;
      }
    }
    isOpen() {
      return this.isState("open");
    }
    isActive() {
      return this.isState("open", "connecting");
    }
    isProtocolSupported() {
      return indexOf2.call(supportedProtocols2, this.getProtocol()) >= 0;
    }
    isState(...states) {
      return indexOf2.call(states, this.getState()) >= 0;
    }
    getState() {
      if (this.webSocket) {
        for (let state in adapters.WebSocket) {
          if (adapters.WebSocket[state] === this.webSocket.readyState) {
            return state.toLowerCase();
          }
        }
      }
      return null;
    }
    installEventHandlers() {
      for (let eventName in this.events) {
        const handler = this.events[eventName].bind(this);
        this.webSocket[`on${eventName}`] = handler;
      }
    }
    uninstallEventHandlers() {
      for (let eventName in this.events) {
        this.webSocket[`on${eventName}`] = function() {
        };
      }
    }
  };
  Connection2.reopenDelay = 500;
  Connection2.prototype.events = {
    message(event) {
      if (!this.isProtocolSupported()) {
        return;
      }
      const { identifier, message, reason, reconnect, type } = JSON.parse(event.data);
      switch (type) {
        case message_types2.welcome:
          this.monitor.recordConnect();
          return this.subscriptions.reload();
        case message_types2.disconnect:
          logger.log(`Disconnecting. Reason: ${reason}`);
          return this.close({
            allowReconnect: reconnect
          });
        case message_types2.ping:
          return this.monitor.recordPing();
        case message_types2.confirmation:
          this.subscriptions.confirmSubscription(identifier);
          return this.subscriptions.notify(identifier, "connected");
        case message_types2.rejection:
          return this.subscriptions.reject(identifier);
        default:
          return this.subscriptions.notify(identifier, "received", message);
      }
    },
    open() {
      logger.log(`WebSocket onopen event, using '${this.getProtocol()}' subprotocol`);
      this.disconnected = false;
      if (!this.isProtocolSupported()) {
        logger.log("Protocol is unsupported. Stopping monitor and disconnecting.");
        return this.close({
          allowReconnect: false
        });
      }
    },
    close(event) {
      logger.log("WebSocket onclose event");
      if (this.disconnected) {
        return;
      }
      this.disconnected = true;
      this.monitor.recordDisconnect();
      return this.subscriptions.notifyAll("disconnected", {
        willAttemptReconnect: this.monitor.isRunning()
      });
    },
    error() {
      logger.log("WebSocket onerror event");
    }
  };
  var extend4 = function(object, properties) {
    if (properties != null) {
      for (let key in properties) {
        const value = properties[key];
        object[key] = value;
      }
    }
    return object;
  };
  var Subscription2 = class {
    constructor(consumer5, params2 = {}, mixin) {
      this.consumer = consumer5;
      this.identifier = JSON.stringify(params2);
      extend4(this, mixin);
    }
    perform(action, data2 = {}) {
      data2.action = action;
      return this.send(data2);
    }
    send(data2) {
      return this.consumer.send({
        command: "message",
        identifier: this.identifier,
        data: JSON.stringify(data2)
      });
    }
    unsubscribe() {
      return this.consumer.subscriptions.remove(this);
    }
  };
  var SubscriptionGuarantor2 = class {
    constructor(subscriptions) {
      this.subscriptions = subscriptions;
      this.pendingSubscriptions = [];
    }
    guarantee(subscription) {
      if (this.pendingSubscriptions.indexOf(subscription) == -1) {
        logger.log(`SubscriptionGuarantor guaranteeing ${subscription.identifier}`);
        this.pendingSubscriptions.push(subscription);
      } else {
        logger.log(`SubscriptionGuarantor already guaranteeing ${subscription.identifier}`);
      }
      this.startGuaranteeing();
    }
    forget(subscription) {
      logger.log(`SubscriptionGuarantor forgetting ${subscription.identifier}`);
      this.pendingSubscriptions = this.pendingSubscriptions.filter((s) => s !== subscription);
    }
    startGuaranteeing() {
      this.stopGuaranteeing();
      this.retrySubscribing();
    }
    stopGuaranteeing() {
      clearTimeout(this.retryTimeout);
    }
    retrySubscribing() {
      this.retryTimeout = setTimeout(() => {
        if (this.subscriptions && typeof this.subscriptions.subscribe === "function") {
          this.pendingSubscriptions.map((subscription) => {
            logger.log(`SubscriptionGuarantor resubscribing ${subscription.identifier}`);
            this.subscriptions.subscribe(subscription);
          });
        }
      }, 500);
    }
  };
  var Subscriptions2 = class {
    constructor(consumer5) {
      this.consumer = consumer5;
      this.guarantor = new SubscriptionGuarantor2(this);
      this.subscriptions = [];
    }
    create(channelName, mixin) {
      const channel = channelName;
      const params2 = typeof channel === "object" ? channel : {
        channel
      };
      const subscription = new Subscription2(this.consumer, params2, mixin);
      return this.add(subscription);
    }
    add(subscription) {
      this.subscriptions.push(subscription);
      this.consumer.ensureActiveConnection();
      this.notify(subscription, "initialized");
      this.subscribe(subscription);
      return subscription;
    }
    remove(subscription) {
      this.forget(subscription);
      if (!this.findAll(subscription.identifier).length) {
        this.sendCommand(subscription, "unsubscribe");
      }
      return subscription;
    }
    reject(identifier) {
      return this.findAll(identifier).map((subscription) => {
        this.forget(subscription);
        this.notify(subscription, "rejected");
        return subscription;
      });
    }
    forget(subscription) {
      this.guarantor.forget(subscription);
      this.subscriptions = this.subscriptions.filter((s) => s !== subscription);
      return subscription;
    }
    findAll(identifier) {
      return this.subscriptions.filter((s) => s.identifier === identifier);
    }
    reload() {
      return this.subscriptions.map((subscription) => this.subscribe(subscription));
    }
    notifyAll(callbackName, ...args) {
      return this.subscriptions.map((subscription) => this.notify(subscription, callbackName, ...args));
    }
    notify(subscription, callbackName, ...args) {
      let subscriptions;
      if (typeof subscription === "string") {
        subscriptions = this.findAll(subscription);
      } else {
        subscriptions = [subscription];
      }
      return subscriptions.map((subscription2) => typeof subscription2[callbackName] === "function" ? subscription2[callbackName](...args) : void 0);
    }
    subscribe(subscription) {
      if (this.sendCommand(subscription, "subscribe")) {
        this.guarantor.guarantee(subscription);
      }
    }
    confirmSubscription(identifier) {
      logger.log(`Subscription confirmed ${identifier}`);
      this.findAll(identifier).map((subscription) => this.guarantor.forget(subscription));
    }
    sendCommand(subscription, command) {
      const { identifier } = subscription;
      return this.consumer.send({
        command,
        identifier
      });
    }
  };
  var Consumer2 = class {
    constructor(url2) {
      this._url = url2;
      this.subscriptions = new Subscriptions2(this);
      this.connection = new Connection2(this);
    }
    get url() {
      return createWebSocketURL2(this._url);
    }
    send(data2) {
      return this.connection.send(data2);
    }
    connect() {
      return this.connection.open();
    }
    disconnect() {
      return this.connection.close({
        allowReconnect: false
      });
    }
    ensureActiveConnection() {
      if (!this.connection.isActive()) {
        return this.connection.open();
      }
    }
  };
  function createWebSocketURL2(url2) {
    if (typeof url2 === "function") {
      url2 = url2();
    }
    if (url2 && !/^wss?:/i.test(url2)) {
      const a = document.createElement("a");
      a.href = url2;
      a.href = a.href;
      a.protocol = a.protocol.replace("http", "ws");
      return a.href;
    } else {
      return url2;
    }
  }
  function createConsumer3(url2 = getConfig2("url") || INTERNAL.default_mount_path) {
    return new Consumer2(url2);
  }
  function getConfig2(name) {
    const element = document.head.querySelector(`meta[name='action-cable-${name}']`);
    if (element) {
      return element.getAttribute("content");
    }
  }

  // ../../node_modules/stimulus_reflex/javascript/transports/action_cable.js
  var consumer4;
  var params;
  var subscriptionActive;
  var createSubscription = (controller) => {
    consumer4 = consumer4 || controller.application.consumer || createConsumer3();
    const { channel } = controller.StimulusReflex;
    const subscription = { channel, ...params };
    const identifier = JSON.stringify(subscription);
    controller.StimulusReflex.subscription = consumer4.subscriptions.findAll(identifier)[0] || consumer4.subscriptions.create(subscription, {
      received,
      connected,
      rejected,
      disconnected
    });
  };
  var connected = () => {
    subscriptionActive = true;
    document.body.classList.replace(
      "stimulus-reflex-disconnected",
      "stimulus-reflex-connected"
    );
    emitEvent("stimulus-reflex:connected");
    emitEvent("stimulus-reflex:action-cable:connected");
  };
  var rejected = () => {
    subscriptionActive = false;
    document.body.classList.replace(
      "stimulus-reflex-connected",
      "stimulus-reflex-disconnected"
    );
    emitEvent("stimulus-reflex:rejected");
    emitEvent("stimulus-reflex:action-cable:rejected");
    if (Debug.enabled)
      console.warn("Channel subscription was rejected.");
  };
  var disconnected = (willAttemptReconnect) => {
    subscriptionActive = false;
    document.body.classList.replace(
      "stimulus-reflex-connected",
      "stimulus-reflex-disconnected"
    );
    emitEvent("stimulus-reflex:disconnected", willAttemptReconnect);
    emitEvent("stimulus-reflex:action-cable:disconnected", willAttemptReconnect);
  };
  var action_cable_default2 = {
    consumer: consumer4,
    params,
    get subscriptionActive() {
      return subscriptionActive;
    },
    createSubscription,
    connected,
    rejected,
    disconnected,
    set(consumerValue, paramsValue) {
      consumer4 = consumerValue;
      params = paramsValue;
    }
  };

  // ../../node_modules/stimulus_reflex/javascript/stimulus_reflex.js
  var StimulusReflexController = class extends Controller2 {
    constructor(...args) {
      super(...args);
      register(this);
    }
  };
  var initialize2 = (application2, { controller, consumer: consumer5, debug, params: params2, isolate, deprecate } = {}) => {
    action_cable_default2.set(consumer5, params2);
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        document.body.classList.remove("stimulus-reflex-connected");
        document.body.classList.add("stimulus-reflex-disconnected");
        if (deprecate_default.enabled && consumer5)
          console.warn(
            "Deprecation warning: the next version of StimulusReflex will obtain a reference to consumer via the Stimulus application object.\nPlease add 'application.consumer = consumer' to your index.js after your Stimulus application has been established, and remove the consumer key from your StimulusReflex initialize() options object."
          );
        if (deprecate_default.enabled && isolation_mode_default.disabled)
          console.warn(
            "Deprecation warning: the next version of StimulusReflex will standardize isolation mode, and the isolate option will be removed.\nPlease update your applications to assume that every tab will be isolated."
          );
      },
      { once: true }
    );
    isolation_mode_default.set(!!isolate);
    reflexes_default.app = application2;
    schema_default.set(application2);
    reflexes_default.app.register(
      "stimulus-reflex",
      controller || StimulusReflexController
    );
    debug_default.set(!!debug);
    if (typeof deprecate !== "undefined")
      deprecate_default.set(deprecate);
    const observer = new MutationObserver(setupDeclarativeReflexes);
    observer.observe(document.documentElement, {
      attributeFilter: [schema_default.reflex, schema_default.action],
      childList: true,
      subtree: true
    });
  };
  var register = (controller, options = {}) => {
    const channel = "StimulusReflex::Channel";
    controller.StimulusReflex = { ...options, channel };
    action_cable_default2.createSubscription(controller);
    Object.assign(controller, {
      isActionCableConnectionOpen() {
        return this.StimulusReflex.subscription.consumer.connection.isOpen();
      },
      stimulate() {
        const url2 = location.href;
        const args = Array.from(arguments);
        const target = args.shift() || "StimulusReflex::Reflex#default_reflex";
        const controllerElement = this.element;
        const reflexElement = args[0] && args[0].nodeType === Node.ELEMENT_NODE ? args.shift() : controllerElement;
        if (reflexElement.type === "number" && reflexElement.validity && reflexElement.validity.badInput) {
          if (debug_default.enabled)
            console.warn("Reflex aborted: invalid numeric input");
          return;
        }
        const options2 = {};
        if (args[0] && typeof args[0] === "object" && Object.keys(args[0]).filter(
          (key) => [
            "attrs",
            "selectors",
            "reflexId",
            "resolveLate",
            "serializeForm",
            "suppressLogging",
            "includeInnerHTML",
            "includeTextContent"
          ].includes(key)
        ).length) {
          const opts = args.shift();
          Object.keys(opts).forEach((o) => options2[o] = opts[o]);
        }
        const reflexData = new ReflexData(
          options2,
          reflexElement,
          controllerElement,
          this.identifier,
          schema_default.reflexPermanent,
          target,
          args,
          url2,
          tabId
        );
        const reflexId = reflexData.reflexId;
        if (!this.isActionCableConnectionOpen())
          throw "The ActionCable connection is not open! `this.isActionCableConnectionOpen()` must return true before calling `this.stimulate()`";
        if (!action_cable_default2.subscriptionActive)
          throw "The ActionCable channel subscription for StimulusReflex was rejected.";
        controllerElement.reflexController = controllerElement.reflexController || {};
        controllerElement.reflexData = controllerElement.reflexData || {};
        controllerElement.reflexError = controllerElement.reflexError || {};
        controllerElement.reflexController[reflexId] = this;
        controllerElement.reflexData[reflexId] = reflexData.valueOf();
        dispatchLifecycleEvent(
          "before",
          reflexElement,
          controllerElement,
          reflexId
        );
        setTimeout(() => {
          const { params: params2 } = controllerElement.reflexData[reflexId] || {};
          const check = reflexElement.attributes[schema_default.reflexSerializeForm];
          if (check) {
            options2["serializeForm"] = check.value !== "false";
          }
          const form2 = reflexElement.closest(reflexData.formSelector) || document.querySelector(reflexData.formSelector) || reflexElement.closest("form");
          if (deprecate_default.enabled && options2["serializeForm"] === void 0 && form2)
            console.warn(
              `Deprecation warning: the next version of StimulusReflex will not serialize forms by default.
Please set ${schema_default.reflexSerializeForm}="true" on your Reflex Controller Element or pass { serializeForm: true } as an option to stimulate.`
            );
          const formData = options2["serializeForm"] === false ? "" : serializeForm(form2, {
            element: reflexElement
          });
          controllerElement.reflexData[reflexId] = {
            ...reflexData.valueOf(),
            params: params2,
            formData
          };
          this.StimulusReflex.subscription.send(
            controllerElement.reflexData[reflexId]
          );
        });
        const promise = registerReflex(reflexData.valueOf());
        log_default.request(
          reflexId,
          target,
          args,
          this.context.scope.identifier,
          reflexElement,
          controllerElement
        );
        return promise;
      },
      __perform(event) {
        let element = event.target;
        let reflex;
        while (element && !reflex) {
          reflex = element.getAttribute(schema_default.reflex);
          if (!reflex || !reflex.trim().length)
            element = element.parentElement;
        }
        const match = attributeValues(reflex).find(
          (reflex2) => reflex2.split("->")[0] === event.type
        );
        if (match) {
          event.preventDefault();
          event.stopPropagation();
          this.stimulate(match.split("->")[1], element);
        }
      }
    });
  };
  var tabId = uuidv4();
  var useReflex = (controller, options = {}) => {
    register(controller, options);
  };
  document.addEventListener("cable-ready:after-dispatch-event", routeReflexEvent);
  document.addEventListener("cable-ready:before-inner-html", beforeDOMUpdate);
  document.addEventListener("cable-ready:before-morph", beforeDOMUpdate);
  document.addEventListener("cable-ready:after-inner-html", afterDOMUpdate);
  document.addEventListener("cable-ready:after-morph", afterDOMUpdate);
  window.addEventListener("load", setupDeclarativeReflexes);
  var stimulus_reflex_default = {
    initialize: initialize2,
    register,
    useReflex,
    get debug() {
      return debug_default.value;
    },
    set debug(value) {
      debug_default.set(!!value);
    },
    get deprecate() {
      return deprecate_default.value;
    },
    set deprecate(value) {
      deprecate_default.set(!!value);
    }
  };

  // controllers/application.js
  var application = Application.start();
  application.warnings = true;
  application.debug = false;
  window.Stimulus = application;
  stimulus_reflex_default.initialize(application, { isolate: true });

  // controllers/alert_controller.js
  var alert_controller_default = class extends Controller2 {
    initialize() {
      this.hide();
    }
    connect() {
      setTimeout(() => {
        this.show();
      }, 50);
      setTimeout(() => {
        this.close();
      }, this.closeAfterValue);
    }
    close() {
      this.hide();
      setTimeout(() => {
        this.element.remove();
      }, this.removeAfterValue);
    }
    show() {
      this.element.setAttribute(
        "style",
        "transition: 0.5s; transform:translate(0, -100px);"
      );
    }
    hide() {
      this.element.setAttribute(
        "style",
        "transition: 1s; transform:translate(0, 200px);"
      );
    }
  };
  __publicField(alert_controller_default, "values", {
    closeAfter: {
      type: Number,
      default: 2500
    },
    removeAfter: {
      type: Number,
      default: 1100
    }
  });

  // controllers/hello_controller.js
  var hello_controller_default = class extends Controller {
    connect() {
      this.element.textContent = "Hello World!";
    }
  };

  // controllers/index.js
  application.register("alert", alert_controller_default);
  application.register("hello", hello_controller_default);

  // channels/consumer.js
  var consumer_default = createConsumer3();

  // ../../node_modules/mrujs/dist/index.module.js
  var submittersByForm2 = /* @__PURE__ */ new WeakMap();
  function findSubmitterFromClickTarget2(target) {
    const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
    const candidate = element != null ? element.closest("input, button") : null;
    if (candidate != null && candidate.type === "submit") {
      return candidate;
    }
    return null;
  }
  function clickCaptured2(event) {
    const submitter = findSubmitterFromClickTarget2(event.target);
    if ((submitter === null || submitter === void 0 ? void 0 : submitter.form) != null) {
      submittersByForm2.set(submitter.form, submitter);
    }
  }
  (function() {
    let prototype = Event.prototype;
    const isSafari = navigator.vendor.includes("Apple Computer");
    if ("SubmitEvent" in window) {
      if (!isSafari)
        return;
      prototype = window.SubmitEvent.prototype;
    }
    if ("submitter" in prototype)
      return;
    addEventListener("click", clickCaptured2, true);
    Object.defineProperty(prototype, "submitter", {
      get() {
        if (this.type === "submit" && this.target instanceof HTMLFormElement) {
          return submittersByForm2.get(this.target);
        }
        return void 0;
      }
    });
  })();
  var _a;
  function toArray(value) {
    if (Array.isArray(value)) {
      return value;
    } else if (Array.from != null) {
      return Array.from(value);
    } else {
      return [].slice.call(value);
    }
  }
  var m = (_a = Element.prototype.matches) !== null && _a !== void 0 ? _a : Element.prototype.webkitMatchesSelector;
  function matches$1(element, selector) {
    if (!(element instanceof Element)) {
      return false;
    }
    if (typeof selector === "string") {
      return m.call(element, selector);
    }
    return m.call(element, selector.selector) && !m.call(element, selector.exclude);
  }
  var form = "form";
  var link = "a";
  if (window.Turbo != null) {
    form = 'form[data-turbo="false"]';
    link = 'a[data-turbo="false"]';
  }
  var data = "data-";
  var remote = `${data}remote`;
  var method = `${data}method`;
  var confirm$2 = `${data}confirm`;
  var disable = `${data}disable`;
  var disableWith = `${disable}-with`;
  var BASE_SELECTORS = {
    remoteSelector: `a[${remote}="true"], a[${method}], form[${remote}="true"]`,
    linkClickSelector: `a[${confirm$2}], ${link}[${method}], ${link}[${remote}]:not([disabled]), ${link}[${disableWith}], ${link}[${disable}]`,
    buttonClickSelector: {
      selector: `button[${remote}]:not([form]), button[${confirm$2}]:not([form]), button[${disableWith}]:not([form]), button[${disable}]:not([form])`,
      exclude: "form button"
    },
    inputChangeSelector: `select[${remote}], input[${remote}], textarea[${remote}]`,
    formSubmitSelector: `${form}`,
    formInputClickSelector: "form input[type=submit], form input[type=image], form button[type=submit], form button:not([type]), input[type=submit][form], input[type=image][form], button[type=submit][form], button[form]:not([type])",
    formDisableSelector: `input[${disableWith}]:enabled, button[${disableWith}]:enabled, textarea[${disableWith}]:enabled, input[${disable}]:enabled, button[${disable}]:enabled, textarea[${disable}]:enabled`,
    formEnableSelector: `input[${disableWith}]:disabled, button[${disableWith}]:disabled, textarea[${disableWith}]:disabled, input[${disable}]:disabled, button[${disable}]:disabled, textarea[${disable}]:disabled`,
    linkDisableSelector: `a[${disableWith}], a[${disable}]`,
    buttonDisableSelector: `button[data-remote][${disableWith}], button[data-remote][${disable}]`,
    fileInputSelector: "fileInputSelector: 'input[name][type=file]:not([disabled])'"
  };
  function addListeners(conditions, callbacks) {
    conditions.forEach((condition) => {
      const { selectors, event } = condition;
      const selectorString = selectors.map(selectorToString).join(", ");
      $$1(selectorString).forEach((el) => {
        selectors.forEach((selector) => {
          if (matches$1(el, selector)) {
            callbacks.forEach((callback) => el.addEventListener(event, callback));
          }
        });
      });
    });
  }
  function removeListeners(conditions, callbacks) {
    conditions.forEach((condition) => {
      const { selectors, event } = condition;
      const selectorString = selectors.map(selectorToString).join(", ");
      $$1(selectorString).forEach((el) => {
        selectors.forEach((selector) => {
          if (matches$1(el, selector)) {
            callbacks.forEach((callback) => el.removeEventListener(event, callback));
          }
        });
      });
    });
  }
  function attachObserverCallback(conditions, nodeList, callbacks) {
    conditions.forEach((condition) => {
      condition.selectors.forEach((selector) => {
        nodeList.forEach((node) => {
          if (matches$1(node, selector)) {
            callbacks.forEach((cb) => node.addEventListener(condition.event, cb));
          }
          if (node instanceof Element) {
            node.querySelectorAll(selectorToString(selector)).forEach((el) => {
              callbacks.forEach((cb) => el.addEventListener(condition.event, cb));
            });
          }
        });
      });
    });
  }
  function formElements$1(form2, selector) {
    if (matches$1(form2, "form")) {
      return Array.from(form2.elements).filter((el) => matches$1(el, selector));
    }
    return toArray(form2.querySelectorAll(selectorToString(selector)));
  }
  function $$1(selector) {
    return toArray(document.querySelectorAll(selector));
  }
  function selectorToString(selector) {
    let str;
    if (typeof selector === "string") {
      str = selector;
    } else {
      str = selector.selector;
    }
    return str;
  }
  var EVENT_DEFAULTS = {
    bubbles: true,
    cancelable: true
  };
  function dispatch3(name, options = {}) {
    const event = new CustomEvent(name, { ...EVENT_DEFAULTS, ...options });
    this.dispatchEvent(event);
    return event;
  }
  function fire$1(element, name, options = {}) {
    const event = dispatch3.call(element, name, options);
    return !event.defaultPrevented;
  }
  function stopEverything$1(event) {
    if (event.target != null)
      fire$1(event.target, "ujs:everythingStopped");
    event.stopPropagation();
    event.stopImmediatePropagation();
    event.preventDefault();
  }
  var prefix = "ajax";
  var AJAX_EVENTS = {
    ajaxBefore: `${prefix}:before`,
    ajaxBeforeSend: `${prefix}:beforeSend`,
    ajaxSend: `${prefix}:send`,
    ajaxResponseError: `${prefix}:response:error`,
    ajaxRequestError: `${prefix}:request:error`,
    ajaxSuccess: `${prefix}:success`,
    ajaxError: `${prefix}:error`,
    ajaxComplete: `${prefix}:complete`,
    ajaxStopped: `${prefix}:stopped`,
    ajaxBeforeNavigation: `${prefix}:beforeNavigation`
  };
  function delegate$1(element, selector, eventType, handler) {
    element.addEventListener(eventType, (event) => {
      let target = event.target;
      while (!(!(target instanceof Element) || matches$1(target, selector))) {
        target = target.parentNode;
      }
      if (target instanceof Element && handler.call(target, event) === false) {
        event.preventDefault();
        event.stopPropagation();
      }
    });
  }
  function findSubmitter(event) {
    var _a2;
    if (event.submitter instanceof HTMLElement) {
      return event.submitter;
    }
    return (_a2 = event.detail) === null || _a2 === void 0 ? void 0 : _a2.submitter;
  }
  function expandUrl(locateable) {
    return new URL(locateable.toString(), document.baseURI);
  }
  function urlsAreEqual2(left, right) {
    return expandUrl(left).href === expandUrl(right).href;
  }
  function mergeHeaders(...sources) {
    const main = {};
    for (const source of sources) {
      for (const [header, value] of source) {
        main[header] = value;
      }
    }
    return new Headers(main);
  }
  function isGetRequest(method2) {
    return method2.toLowerCase() === "get";
  }
  function FetchResponse$1(response) {
    let _text;
    let _json;
    const succeeded = response.ok;
    const status = response.status;
    const failed = !succeeded;
    const clientError = response.status >= 400 && response.status <= 499;
    const serverError = response.status >= 500 && response.status <= 599;
    const redirected = response.redirected;
    const location2 = expandUrl(response.url);
    const contentType = getHeader("content-type");
    const isHtml = Boolean(contentType === null || contentType === void 0 ? void 0 : contentType.match(/^(?:text\/([^\s;,]+\b)?html|application\/xhtml\+xml)\b/));
    const isJson = Boolean(contentType === null || contentType === void 0 ? void 0 : contentType.toLowerCase().match(/(^application\/json|\.json)/));
    async function text() {
      if (_text != null)
        return _text;
      _text = await response.clone().text();
      return _text;
    }
    async function html() {
      if (isHtml)
        return await text();
      return await Promise.reject(response);
    }
    async function json() {
      if (isJson) {
        if (_json != null)
          return _json;
        _json = JSON.parse(await text());
        return _json;
      }
      return await Promise.reject(response);
    }
    function getHeader(name) {
      return response.headers.get(name);
    }
    return {
      succeeded,
      failed,
      redirected,
      clientError,
      serverError,
      location: location2,
      contentType,
      getHeader,
      isHtml,
      isJson,
      text,
      html,
      json,
      response,
      status
    };
  }
  function buildFormElementFormData(element, submitter) {
    const formData = new FormData(element);
    let name;
    let value;
    if (submitter != null) {
      name = submitter.getAttribute("name");
      value = submitter.getAttribute("value");
    }
    if (name != null && value != null && formData.get(name) !== value) {
      formData.append(name, value);
    }
    return formData;
  }
  var FormEncTypes = {
    urlEncoded: "application/x-www-form-urlencoded",
    multipart: "multipart/form-data",
    plain: "text/plain"
  };
  function formEnctypeFromString2(encoding) {
    switch (encoding.toLowerCase()) {
      case FormEncTypes.multipart:
        return FormEncTypes.multipart;
      case FormEncTypes.plain:
        return FormEncTypes.plain;
      default:
        return FormEncTypes.urlEncoded;
    }
  }
  function formDataToStrings(formData) {
    return [...formData].reduce((entries2, [name, value]) => {
      return entries2.concat(typeof value === "string" ? [[name, value]] : []);
    }, []);
  }
  function urlEncodeFormData(formData) {
    return new URLSearchParams(formDataToStrings(formData));
  }
  var BASE_ACCEPT_HEADERS = {
    "*": "*/*",
    any: "*/*",
    text: "text/plain",
    html: "text/html",
    xml: "application/xml, text/xml",
    json: "application/json, text/javascript",
    script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"
  };
  function findResponseTypeHeader(responseType) {
    var _a2, _b, _c;
    const mimeTypes = (_b = (_a2 = window.mrujs) === null || _a2 === void 0 ? void 0 : _a2.mimeTypes) !== null && _b !== void 0 ? _b : BASE_ACCEPT_HEADERS;
    const acceptHeaders = {
      ...mimeTypes
    };
    if (responseType == null) {
      return (_c = acceptHeaders === null || acceptHeaders === void 0 ? void 0 : acceptHeaders.any) !== null && _c !== void 0 ? _c : "*/*";
    }
    responseType = responseType.trim();
    if (acceptHeaders != null && Object.keys(acceptHeaders).includes(responseType)) {
      responseType = acceptHeaders[responseType];
    }
    if (responseType.includes("*/*"))
      return responseType;
    return `${responseType}, */*; q=0.01`;
  }
  function isInsignificantClick(event) {
    return event.target != null && event.target.isContentEditable || event.defaultPrevented || event.button > 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
  }
  function isSignificantClick(event) {
    return !isInsignificantClick(event);
  }
  function preventInsignificantClick$1(event) {
    if (isSignificantClick(event))
      return;
    stopEverything$1(event);
  }
  function getCookieValue2(cookieName) {
    if (cookieName != null) {
      const cookies = document.cookie.trim() !== "" ? document.cookie.split("; ") : [];
      const cookie = cookies.find((cookie2) => cookie2.startsWith(cookieName));
      if (cookie != null) {
        const value = cookie.split("=").slice(1).join("=");
        return value.trim() !== "" ? decodeURIComponent(value) : void 0;
      }
    }
    return void 0;
  }
  function getMetaContent2(str) {
    var _a2;
    const elements = $$1(`meta[name="${str}"]`);
    const element = elements[elements.length - 1];
    return (_a2 = element === null || element === void 0 ? void 0 : element.content) !== null && _a2 !== void 0 ? _a2 : void 0;
  }
  function Csrf() {
    return {
      name: "Csrf",
      connect: connect$3,
      disconnect: disconnect$3,
      observerCallback
    };
  }
  function connect$3() {
    refreshCSRFTokens$1();
  }
  function disconnect$3() {
  }
  function observerCallback(nodeList) {
    for (let i = 0; i < nodeList.length; i++) {
      const node = nodeList[i];
      if (isCsrfToken(node)) {
        refreshCSRFTokens$1();
      }
    }
  }
  function refreshCSRFTokens$1() {
    const token = csrfToken$1();
    const param = csrfParam$1();
    if (token != null && param != null) {
      $$1(`form input[name="${param}"]`).forEach((input) => {
        const inputEl = input;
        inputEl.value = token;
      });
    }
  }
  function isCsrfToken(node) {
    if (node instanceof HTMLMetaElement) {
      return node.matches('meta[name="csrf-token]"');
    }
    return false;
  }
  function csrfToken$1() {
    var _a2;
    return (_a2 = getCookieValue2(csrfParam$1())) !== null && _a2 !== void 0 ? _a2 : getMetaContent2("csrf-token");
  }
  function csrfParam$1() {
    return getMetaContent2("csrf-param");
  }
  function CSRFProtection$1(request2) {
    const token = csrfToken$1();
    const str = "X-CSRF-TOKEN";
    if (token != null && request2.headers.get(str) == null)
      request2.headers.set("X-CSRF-TOKEN", token);
  }
  function FetchRequest$1(input, options = {}) {
    const abortController = new AbortController();
    const abortSignal = abortController.signal;
    let headers;
    let url2;
    let method2 = "get";
    let request2;
    let _isGetRequest = false;
    method2 = getMethod$1(options);
    _isGetRequest = isGetRequest(method2);
    const body = getBody$2(options);
    if (input instanceof Request) {
      url2 = getUrl(input.url, _isGetRequest, body);
      request2 = createRequestFromRequest(input);
    } else {
      url2 = getUrl(input, _isGetRequest, body);
      request2 = createRequestFromLocateable();
    }
    if (!_isGetRequest)
      CSRFProtection$1(request2);
    headers = request2.headers;
    const params2 = url2.searchParams;
    return {
      request: request2,
      method: method2,
      url: url2,
      body,
      params: params2,
      abortController,
      abortSignal,
      cancel,
      headers,
      isGetRequest: _isGetRequest
    };
    function defaultHeaders() {
      const headers2 = new Headers({
        Accept: "*/*",
        "X-REQUESTED-WITH": "XmlHttpRequest"
      });
      return headers2;
    }
    function cancel(event) {
      abortController.abort();
      if (event != null) {
        stopEverything$1(event);
        const { element } = event.detail;
        dispatch3.call(element, AJAX_EVENTS.ajaxStopped, {
          detail: { ...event.detail }
        });
      }
    }
    function createRequestFromRequest(input2) {
      headers = mergeHeaders(defaultHeaders(), input2.headers);
      const mergedOptions = { ...defaultRequestOptions(), ...input2 };
      if (_isGetRequest)
        delete mergedOptions.body;
      return new Request(url2, mergedOptions);
    }
    function createRequestFromLocateable() {
      headers = mergeHeaders(defaultHeaders(), new Headers(options.headers));
      const mergedOptions = { ...defaultRequestOptions(), ...options };
      mergedOptions.headers = headers;
      if (_isGetRequest)
        delete mergedOptions.body;
      return new Request(url2, mergedOptions);
    }
    function defaultRequestOptions() {
      const options2 = {
        method: method2,
        headers,
        credentials: "same-origin",
        redirect: "follow",
        signal: abortSignal
      };
      if (_isGetRequest) {
        return options2;
      }
      options2.body = body;
      return options2;
    }
  }
  function getUrl(url2, getRequest, body) {
    const location2 = expandUrl(url2);
    if (!getRequest)
      return location2;
    return mergeFormDataEntries2(location2, entries(body));
  }
  function entries(body) {
    return body instanceof URLSearchParams ? Array.from(body.entries()) : [];
  }
  function getBody$2(input) {
    var _a2;
    return (_a2 = input.body) !== null && _a2 !== void 0 ? _a2 : new URLSearchParams();
  }
  function getMethod$1(input) {
    var _a2, _b;
    return (_b = (_a2 = input.method) === null || _a2 === void 0 ? void 0 : _a2.toLowerCase()) !== null && _b !== void 0 ? _b : "get";
  }
  function mergeFormDataEntries2(url2, entries2) {
    const currentSearchParams = new URLSearchParams(url2.search);
    for (const [name, value] of entries2) {
      if (value instanceof File)
        continue;
      if (name === "authenticity_token")
        continue;
      if (currentSearchParams.has(name)) {
        currentSearchParams.delete(name);
        url2.searchParams.set(name, value);
      } else {
        url2.searchParams.append(name, value);
      }
    }
    return url2;
  }
  function FormSubmission2(element, submitter) {
    const url2 = expandUrl(getAction2(element, submitter));
    const options = getOptions(element, submitter);
    const fetchRequest = FetchRequest$1(url2, options);
    const request2 = fetchRequest.request;
    return {
      fetchRequest,
      request: request2,
      element,
      submitter
    };
  }
  function getOptions(element, submitter) {
    const method2 = getMethod(element, submitter);
    const headers = getHeaders$1(element);
    const options = {
      method: method2,
      headers
    };
    options.body = getBody$1(element, method2, submitter);
    return options;
  }
  function getHeaders$1(element) {
    let responseType;
    if (element != null) {
      responseType = element.dataset.type;
    }
    const acceptHeader = findResponseTypeHeader(responseType);
    const headers = new Headers({ Accept: acceptHeader });
    headers.set("Accept", acceptHeader);
    return headers;
  }
  function getFormData$1(element, submitter) {
    return buildFormElementFormData(element, submitter);
  }
  function getMethod(element, submitter) {
    var _a2, _b;
    const method2 = (_b = (_a2 = submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("formmethod")) !== null && _a2 !== void 0 ? _a2 : element.getAttribute("method")) !== null && _b !== void 0 ? _b : "get";
    return method2.toLowerCase();
  }
  function getAction2(element, submitter) {
    var _a2, _b;
    const action = (_b = (_a2 = submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("formaction")) !== null && _a2 !== void 0 ? _a2 : element.getAttribute("action")) !== null && _b !== void 0 ? _b : "";
    return action;
  }
  function getBody$1(element, method2, submitter) {
    const formData = getFormData$1(element, submitter);
    if (getEncType(element, submitter) === FormEncTypes.urlEncoded || isGetRequest(method2)) {
      return urlEncodeFormData(formData);
    } else {
      return formData;
    }
  }
  function getEncType(element, submitter) {
    var _a2, _b;
    const elementEncType = element.getAttribute("enctype");
    const encType = (_b = (_a2 = submitter === null || submitter === void 0 ? void 0 : submitter.getAttribute("formenctype")) !== null && _a2 !== void 0 ? _a2 : elementEncType) !== null && _b !== void 0 ? _b : FormEncTypes.urlEncoded;
    const encString = formEnctypeFromString2(encType);
    return encString;
  }
  function ElementDisabler() {
    const callbacks = [disableElement$1];
    let queries = [];
    function initialize3() {
      queries = getQueries$5();
    }
    function connect2() {
      addListeners(queries, callbacks);
    }
    function disconnect2() {
      removeListeners(queries, callbacks);
    }
    function observerCallback2(nodeList) {
      attachObserverCallback(queries, nodeList, callbacks);
    }
    return {
      name: "ElementDisabler",
      initialize: initialize3,
      connect: connect2,
      disconnect: disconnect2,
      observerCallback: observerCallback2,
      queries
    };
  }
  function getQueries$5() {
    const { formSubmitSelector: formSubmitSelector2, linkClickSelector: linkClickSelector2, buttonClickSelector: buttonClickSelector2, inputChangeSelector: inputChangeSelector2 } = window.mrujs;
    return [
      { event: "click", selectors: [buttonClickSelector2, linkClickSelector2] },
      { event: "ajax:send", selectors: [formSubmitSelector2] },
      { event: "turbo:submit-start", selectors: ["form"] },
      { event: "change", selectors: [inputChangeSelector2] }
    ];
  }
  function disableElement$1(event) {
    let element;
    if (event instanceof Event) {
      element = event.target;
    } else {
      element = event;
    }
    if (element == null)
      return;
    const { linkDisableSelector: linkDisableSelector2, buttonDisableSelector: buttonDisableSelector2, formDisableSelector: formDisableSelector2, formSubmitSelector: formSubmitSelector2 } = window.mrujs;
    if (matches$1(element, linkDisableSelector2)) {
      disableLinkElement(element);
    } else if (matches$1(element, buttonDisableSelector2) || matches$1(element, formDisableSelector2)) {
      disableFormElement(element);
    } else if (matches$1(element, formSubmitSelector2)) {
      disableFormElements(element);
    }
  }
  function disableFormElements(form2) {
    formElements$1(form2, window.mrujs.formDisableSelector).forEach((el) => disableFormElement(el));
  }
  function disableFormElement(element) {
    if (element.dataset.ujsDisabled != null)
      return;
    const replacement = element.getAttribute("data-disable-with");
    if (replacement != null) {
      if (matches$1(element, "button")) {
        element.dataset.ujsEnableWith = element.innerHTML;
        element.innerHTML = replacement;
      } else {
        element.dataset.ujsEnableWith = element.value;
        element.value = replacement;
      }
    }
    element.dataset.ujsDisabled = "true";
    setTimeout(() => {
      element.disabled = true;
    });
  }
  function disableLinkElement(element) {
    if (element.dataset.ujsDisabled != null)
      return;
    const replacement = element.dataset.disableWith;
    if (replacement != null) {
      element.dataset.ujsEnableWith = element.innerHTML;
      element.innerHTML = replacement;
    }
    element.addEventListener("click", stopEverything$1);
    element.dataset.ujsDisabled = "true";
  }
  function FormSubmitDispatcher() {
    return {
      name: "FormSubmitDispatcher",
      connect: connect$2,
      disconnect: disconnect$2
    };
  }
  function connect$2() {
    attachListeners("addEventListener");
  }
  function disconnect$2() {
    attachListeners("removeEventListener");
  }
  function startFormSubmission(event) {
    if (event.defaultPrevented) {
      return;
    }
    const element = findTarget(event);
    const submitter = findSubmitter(event);
    if (element.dataset.remote !== "true")
      return;
    if (shouldNotSubmit(element))
      return;
    if (shouldNotSubmit(submitter))
      return;
    if (submitter != null) {
      disableElement$1(submitter);
    }
    event.preventDefault();
    const { fetchRequest, request: request2 } = FormSubmission2(element, submitter);
    const detail = { element, fetchRequest, request: request2, submitter };
    dispatch3.call(element, AJAX_EVENTS.ajaxBefore, { detail });
  }
  function startFetchRequest(event) {
    const { element, fetchRequest, request: request2, submitter } = event.detail;
    if (event.defaultPrevented || shouldNotSubmit(element) || shouldNotSubmit(submitter)) {
      dispatchStopped(event);
      return;
    }
    dispatch3.call(element, AJAX_EVENTS.ajaxBeforeSend, {
      detail: { element, fetchRequest, request: request2, submitter }
    });
  }
  function sendFetchRequest(event) {
    const { element, request: request2, submitter } = event.detail;
    if (event.defaultPrevented || shouldNotSubmit(element) || shouldNotSubmit(submitter)) {
      dispatchStopped(event);
      return;
    }
    dispatch3.call(element, AJAX_EVENTS.ajaxSend, { detail: { ...event.detail } });
    window.fetch(request2).then((resp) => {
      const fetchResponse = FetchResponse$1(resp);
      const { response } = fetchResponse;
      dispatchResponse({ ...event.detail, fetchResponse, response });
    }).catch((error4) => dispatchRequestError({ ...event.detail, error: error4 }));
  }
  function dispatchComplete(event) {
    if (event.defaultPrevented) {
      dispatchStopped(event);
      return;
    }
    dispatch3.call(findTarget(event), AJAX_EVENTS.ajaxComplete, {
      detail: { ...event.detail }
    });
  }
  function dispatchResponse({ element, fetchRequest, request: request2, fetchResponse, response, submitter }) {
    const status = response === null || response === void 0 ? void 0 : response.status;
    if ((fetchResponse === null || fetchResponse === void 0 ? void 0 : fetchResponse.succeeded) === true) {
      dispatch3.call(element, AJAX_EVENTS.ajaxSuccess, {
        detail: { element, fetchRequest, request: request2, fetchResponse, response, submitter, status }
      });
      return;
    }
    dispatch3.call(element, AJAX_EVENTS.ajaxResponseError, {
      detail: { element, fetchRequest, request: request2, fetchResponse, response, submitter, status }
    });
  }
  function dispatchRequestError({ element, fetchRequest, request: request2, error: error4, submitter }) {
    dispatch3.call(element, AJAX_EVENTS.ajaxRequestError, {
      detail: { element, fetchRequest, request: request2, error: error4, submitter }
    });
  }
  function dispatchError(event) {
    if (event.defaultPrevented) {
      dispatchStopped(event);
      return;
    }
    dispatch3.call(findTarget(event), AJAX_EVENTS.ajaxError, {
      detail: { ...event.detail }
    });
  }
  function dispatchStopped(event) {
    dispatch3.call(findTarget(event), AJAX_EVENTS.ajaxStopped, {
      detail: { ...event.detail }
    });
  }
  function attachListeners(fn) {
    document[fn]("submit", startFormSubmission);
    document[fn](AJAX_EVENTS.ajaxBefore, startFetchRequest);
    document[fn](AJAX_EVENTS.ajaxBeforeSend, sendFetchRequest);
    document[fn](AJAX_EVENTS.ajaxSuccess, dispatchComplete);
    document[fn](AJAX_EVENTS.ajaxRequestError, dispatchError);
    document[fn](AJAX_EVENTS.ajaxResponseError, dispatchError);
    document[fn](AJAX_EVENTS.ajaxError, dispatchComplete);
  }
  function findTarget(event) {
    return event.target;
  }
  function shouldNotSubmit(element) {
    return (element === null || element === void 0 ? void 0 : element.dataset.ujsSubmit) === "false";
  }
  function RemoteWatcher() {
    let query;
    function initialize3() {
      query = window.mrujs.remoteSelector;
    }
    function connect2() {
      $$1(query).forEach((el) => {
        addTurboFalse(el);
      });
    }
    function disconnect2() {
    }
    function observerCallback2(nodeList) {
      nodeList.forEach((node) => {
        if (matches$1(node, window.mrujs.remoteSelector)) {
          addTurboFalse(node);
        }
        if (node instanceof Element) {
          node.querySelectorAll(query).forEach((el) => {
            addTurboFalse(el);
          });
        }
      });
    }
    return {
      name: "RemoteWatcher",
      initialize: initialize3,
      connect: connect2,
      disconnect: disconnect2,
      observerCallback: observerCallback2
    };
  }
  function addTurboFalse(el) {
    if (el == null)
      return;
    if (el.getAttribute("data-turbo") != null)
      return;
    el.setAttribute("data-turbo", "false");
  }
  function ClickHandler() {
    const callbacks = [preventInsignificantClick$1];
    let queries = [];
    function initialize3() {
      queries = getQueries$4();
    }
    function connect2() {
      addListeners(queries, callbacks);
    }
    function disconnect2() {
      removeListeners(queries, callbacks);
    }
    function observerCallback2(nodeList) {
      attachObserverCallback(queries, nodeList, callbacks);
    }
    return {
      name: "ClickHandler",
      initialize: initialize3,
      connect: connect2,
      disconnect: disconnect2,
      observerCallback: observerCallback2,
      queries,
      callbacks
    };
  }
  function getQueries$4() {
    const { linkClickSelector: linkClickSelector2, buttonClickSelector: buttonClickSelector2, formInputClickSelector: formInputClickSelector2 } = window.mrujs;
    return [
      {
        event: "click",
        selectors: [
          linkClickSelector2,
          buttonClickSelector2,
          formInputClickSelector2
        ]
      }
    ];
  }
  function Confirm() {
    const callbacks = [handleConfirm$1];
    let queries = [];
    function initialize3() {
      queries = getQueries$3();
    }
    function connect2() {
      addListeners(queries, callbacks);
    }
    function disconnect2() {
      removeListeners(queries, callbacks);
    }
    function observerCallback2(nodeList) {
      attachObserverCallback(queries, nodeList, callbacks);
    }
    return {
      name: "Confirm",
      initialize: initialize3,
      connect: connect2,
      disconnect: disconnect2,
      observerCallback: observerCallback2,
      queries,
      callbacks
    };
  }
  function handleConfirm$1(event) {
    if (!allowAction(event)) {
      stopEverything$1(event);
    }
  }
  function allowAction(event) {
    if (event.currentTarget == null)
      return true;
    const element = event.currentTarget;
    const message = element.dataset.confirm;
    if (message == null)
      return true;
    let answer = false;
    try {
      answer = window.mrujs.confirm(message);
    } catch (e) {
      console.warn('The following error was encountered when calling: "mrujs.confirm"\n\n');
      console.error(e);
    }
    const firedEvent = dispatch3.call(element, "confirm:complete", { detail: { answer } });
    return answer && !firedEvent.defaultPrevented;
  }
  function getQueries$3() {
    const { linkClickSelector: linkClickSelector2, buttonClickSelector: buttonClickSelector2, formInputClickSelector: formInputClickSelector2, inputChangeSelector: inputChangeSelector2, formSubmitSelector: formSubmitSelector2 } = window.mrujs;
    return [
      {
        event: "click",
        selectors: [
          linkClickSelector2,
          buttonClickSelector2,
          formInputClickSelector2
        ]
      },
      {
        event: "change",
        selectors: [
          inputChangeSelector2
        ]
      },
      {
        event: "submit",
        selectors: [
          formSubmitSelector2
        ]
      }
    ];
  }
  function MethodSubmission(element) {
    var _a2, _b;
    const method2 = getElementMethod(element);
    let maskedMethod;
    if ((_a2 = window.mrujs) === null || _a2 === void 0 ? void 0 : _a2.maskLinkMethods) {
      maskedMethod = getMaskedMethod(method2);
    }
    const href = (_b = element.getAttribute("href")) !== null && _b !== void 0 ? _b : element.dataset.url;
    if (href == null) {
      throw Error(`No 'href' or 'data-url' found on ${JSON.stringify(element)}`);
    }
    const url2 = expandUrl(href);
    const options = {
      headers: getHeaders(element)
    };
    options.method = maskedMethod !== null && maskedMethod !== void 0 ? maskedMethod : method2;
    if (!isGetRequest(method2))
      options.body = getBody(method2, element);
    const fetchRequest = FetchRequest$1(url2, options);
    return {
      request: fetchRequest.request,
      fetchRequest
    };
  }
  function getHeaders(element) {
    let responseType;
    if (element != null) {
      responseType = element.dataset.type;
    }
    const acceptHeader = findResponseTypeHeader(responseType);
    const headers = new Headers({ Accept: acceptHeader });
    headers.set("Accept", acceptHeader);
    return headers;
  }
  function getFormData(method2) {
    var _a2;
    const formData = new FormData();
    if ((_a2 = window.mrujs) === null || _a2 === void 0 ? void 0 : _a2.maskLinkMethods) {
      formData.append("_method", method2);
    }
    return formData;
  }
  function getElementMethod(element) {
    var _a2;
    const method2 = (_a2 = element.dataset.method) !== null && _a2 !== void 0 ? _a2 : "get";
    return method2.toLowerCase();
  }
  function getMaskedMethod(method2) {
    return isGetRequest(method2) ? "get" : "post";
  }
  function getBody(method2, element) {
    const encodedFormData = urlEncodeFormData(getFormData(method2));
    const elName = element.getAttribute("name");
    const elValue = element.value;
    if (elName != null && elValue != null)
      encodedFormData.append(elName, elValue);
    const additionalParams = parseParams(element.getAttribute("data-params"));
    if (additionalParams == null)
      return encodedFormData;
    for (const [key, value] of additionalParams) {
      if (value == null)
        continue;
      const val = value.toString();
      const isString = typeof val === "string" || val instanceof String;
      if (!isString)
        continue;
      encodedFormData.append(key, val.toString());
    }
    return encodedFormData;
  }
  function parseParams(params2) {
    if (params2 == null)
      return void 0;
    if (containsEncodedComponents(params2)) {
      params2 = decodeURIComponent(params2);
    }
    try {
      return Object.entries(JSON.parse(params2));
    } catch (_a2) {
    }
    try {
      return new URLSearchParams(params2).entries();
    } catch (_b) {
    }
    return void 0;
  }
  function containsEncodedComponents(x) {
    return decodeURI(x) !== decodeURIComponent(x);
  }
  function Method() {
    const callbacks = [handleMethod$1];
    let queries = [];
    function initialize3() {
      queries = getQueries$2();
    }
    function connect2() {
      addListeners(queries, callbacks);
    }
    function disconnect2() {
      removeListeners(queries, callbacks);
    }
    function observerCallback2(nodeList) {
      attachObserverCallback(queries, nodeList, callbacks);
    }
    return {
      name: "Method",
      initialize: initialize3,
      connect: connect2,
      disconnect: disconnect2,
      observerCallback: observerCallback2,
      queries,
      callbacks
    };
  }
  function handleMethod$1(event) {
    var _a2;
    const element = event.currentTarget;
    if (element.dataset.remote === "false")
      return;
    if (element.dataset.method == null && element.dataset.remote !== "true")
      return;
    const href = (_a2 = element.getAttribute("href")) !== null && _a2 !== void 0 ? _a2 : element.dataset.url;
    if (href == null)
      return;
    event.preventDefault();
    const submitter = event.target;
    const linkSubmission = MethodSubmission(element);
    const { fetchRequest, request: request2 } = linkSubmission;
    dispatch3.call(element, AJAX_EVENTS.ajaxBeforeSend, {
      detail: { element, fetchRequest, request: request2, submitter }
    });
  }
  function getQueries$2() {
    const { linkClickSelector: linkClickSelector2, inputChangeSelector: inputChangeSelector2, buttonClickSelector: buttonClickSelector2 } = window.mrujs;
    return [
      {
        event: "click",
        selectors: [
          linkClickSelector2,
          buttonClickSelector2
        ]
      },
      {
        event: "change",
        selectors: [
          inputChangeSelector2
        ]
      }
    ];
  }
  var ALLOWABLE_ACTIONS = [
    "advance",
    "replace",
    "restore"
  ];
  function NavigationAdapter() {
    const obj = {
      name: "NavigationAdapter",
      connect: connect$1,
      disconnect: disconnect$1,
      cacheContains,
      prefetch,
      navigate
    };
    Object.defineProperties(obj, {
      adapter: { get: function() {
        return findAdapter();
      } },
      snapshotCache: { get: function() {
        return findSnapshotCache(findAdapter());
      } }
    });
    return obj;
  }
  function connect$1() {
    document.addEventListener("ajax:complete", beforeNavigation);
    document.addEventListener("ajax:beforeNavigation", navigateViaEvent);
  }
  function disconnect$1() {
    document.removeEventListener("ajax:complete", beforeNavigation);
    document.removeEventListener("ajax:beforeNavigation", navigateViaEvent);
  }
  function beforeNavigation(event) {
    if (event.defaultPrevented)
      return;
    dispatch3.call(event.detail.element, "ajax:beforeNavigation", { detail: { ...event.detail } });
  }
  function findAdapter() {
    if (useTurbolinks())
      return window.Turbolinks;
    if (useTurbo())
      return window.Turbo;
    return void 0;
  }
  function useTurbolinks() {
    if (window.Turbolinks == null)
      return false;
    if (window.Turbolinks.supported !== true)
      return false;
    return true;
  }
  function useTurbo() {
    if (window.Turbo == null)
      return false;
    return true;
  }
  function prefetch({ html, url: url2 }) {
    const expandedUrl = expandUrl(url2);
    const snapshot = generateSnapshotFromHtml(html);
    putSnapshotInCache(expandedUrl, snapshot);
  }
  function findSnapshotCache(adapter) {
    if (adapter == null)
      return void 0;
    if (useTurbolinks())
      return adapter.controller.cache;
    if (useTurbo())
      return adapter.navigator.view.snapshotCache;
    return void 0;
  }
  function cacheContains(url2) {
    var _a2;
    const expandedUrl = expandUrl(url2);
    const snapshotCache = findSnapshotCache(findAdapter());
    return (_a2 = snapshotCache === null || snapshotCache === void 0 ? void 0 : snapshotCache.has(expandedUrl)) !== null && _a2 !== void 0 ? _a2 : false;
  }
  function navigateViaEvent(event) {
    if (event.defaultPrevented)
      return;
    const { element, fetchResponse, fetchRequest } = event.detail;
    if (!shouldNavigate(element, fetchResponse))
      return;
    navigate(element, fetchRequest, fetchResponse);
  }
  function shouldNavigate(element, fetchResponse) {
    if (element.dataset.ujsNavigate === "false")
      return false;
    if (fetchResponse == null)
      return false;
    if (!fetchResponse.isHtml)
      return false;
    if (element instanceof HTMLFormElement && fetchResponse.succeeded && !fetchResponse.redirected) {
      console.error("Successful form submissions must redirect");
      return false;
    }
    return true;
  }
  function navigate(element, request2, response, action) {
    action = action !== null && action !== void 0 ? action : determineAction(element);
    let location2 = expandUrl(window.location.href);
    if (request2 === null || request2 === void 0 ? void 0 : request2.isGetRequest)
      location2 = request2.url;
    if (response.redirected)
      location2 = response.location;
    const currentLocation = window.location.href;
    const isSamePage = urlsAreEqual2(location2, currentLocation);
    let errorRenderer = "morphdom";
    if (window.mrujs.errorRenderer === "turbo" || element.getAttribute("data-ujs-error-renderer") === "turbo") {
      errorRenderer = "turbo";
    }
    if (response.failed || isSamePage) {
      morphResponse(element, response, !isSamePage, errorRenderer);
      return;
    }
    const adapter = findAdapter();
    if (adapter == null) {
      morphResponse(element, response, isSamePage, errorRenderer);
      return;
    }
    adapter.clearCache();
    preventDoubleVisit(response, location2, action);
  }
  function putSnapshotInCache(location2, snapshot) {
    if (snapshot === "")
      return;
    const snapshotCache = findSnapshotCache(findAdapter());
    snapshotCache === null || snapshotCache === void 0 ? void 0 : snapshotCache.put(expandUrl(location2), snapshot);
  }
  function generateSnapshotFromHtml(html) {
    var _a2, _b, _c;
    const adapter = findAdapter();
    if (adapter == null)
      return "";
    if (useTurbolinks()) {
      return (_a2 = adapter.Snapshot.wrap(html)) !== null && _a2 !== void 0 ? _a2 : "";
    }
    if (useTurbo() && canSnapshot()) {
      return (_c = (_b = adapter.PageSnapshot) === null || _b === void 0 ? void 0 : _b.fromHTMLString(html)) !== null && _c !== void 0 ? _c : "";
    }
    return "";
  }
  function canSnapshot() {
    const adapter = findAdapter();
    if (adapter == null)
      return false;
    if (useTurbolinks())
      return true;
    if (useTurbo()) {
      if (adapter.PageSnapshot == null) {
        console.warn("The version of Turbo you are currently using does not support snapshot generation. Please consider upgrading your version of Turbo.");
        return false;
      }
      return true;
    }
    return false;
  }
  function preventDoubleVisit(response, location2, action) {
    const adapter = findAdapter();
    if (adapter == null)
      return;
    response.html().then((html) => {
      prefetch({ html, url: location2 });
      action = "restore";
      adapter.visit(location2, { action });
    }).catch((error4) => console.error(error4));
  }
  function morphResponse(element, response, pushState = false, errorRenderer = "morphdom") {
    if (!response.isHtml)
      return;
    response.html().then((html) => {
      var _a2;
      if (errorRenderer === "turbo") {
        renderError(html);
      } else if (errorRenderer === "morphdom") {
        const selectorString = element.getAttribute("data-ujs-morph-root");
        let selector = document.body;
        if (selectorString != null) {
          if (selectorString.trim() === "") {
            selector = element;
          } else {
            selector = (_a2 = document.querySelector(selectorString)) !== null && _a2 !== void 0 ? _a2 : document.body;
          }
        }
        morphHtml(html, selector);
      }
      if (pushState) {
        window.history.pushState({}, "", response.location);
      }
    }).catch((error4) => {
      console.error(error4);
    });
  }
  function morphHtml(html, selector = document.body) {
    const template2 = document.createElement("template");
    template2.innerHTML = String(html).trim();
    morphdom_esm_default(selector, template2.content, { childrenOnly: true });
  }
  function renderError(html) {
    const adapter = findAdapter();
    adapter === null || adapter === void 0 ? void 0 : adapter.navigator.view.renderError(generateSnapshotFromHtml(html));
  }
  function determineAction(element) {
    var _a2, _b;
    let action = (_b = (_a2 = element.dataset.turbolinksAction) !== null && _a2 !== void 0 ? _a2 : element.dataset.turboAction) !== null && _b !== void 0 ? _b : "advance";
    if (!ALLOWABLE_ACTIONS.includes(action)) {
      action = "advance";
    }
    return action;
  }
  function DisabledElementChecker() {
    const callbacks = [handleDisabledElement$1];
    let queries = [];
    function initialize3() {
      queries = getQueries$1();
    }
    function connect2() {
      addListeners(queries, callbacks);
    }
    function disconnect2() {
      removeListeners(queries, callbacks);
    }
    function observerCallback2(nodeList) {
      attachObserverCallback(queries, nodeList, callbacks);
    }
    return {
      name: "DisabledElementChecker",
      initialize: initialize3,
      connect: connect2,
      disconnect: disconnect2,
      observerCallback: observerCallback2,
      queries,
      callbacks
    };
  }
  function getQueries$1() {
    const { linkClickSelector: linkClickSelector2, buttonClickSelector: buttonClickSelector2, inputChangeSelector: inputChangeSelector2, formSubmitSelector: formSubmitSelector2, formInputClickSelector: formInputClickSelector2 } = window.mrujs;
    return [
      { event: "click", selectors: [buttonClickSelector2, linkClickSelector2, formInputClickSelector2] },
      { event: "change", selectors: [inputChangeSelector2] },
      { event: "submit", selectors: [formSubmitSelector2] }
    ];
  }
  function handleDisabledElement$1(event) {
    if (this.disabled === true)
      stopEverything$1(event);
  }
  function ElementEnabler() {
    const callbacks = [enableElement$1];
    let queries = [];
    function initialize3() {
      queries = getQueries();
    }
    function connect2() {
      addListeners(queries, callbacks);
    }
    function disconnect2() {
      removeListeners(queries, callbacks);
    }
    function observerCallback2(nodeList) {
      attachObserverCallback(queries, nodeList, callbacks);
    }
    return {
      name: "ElementEnabler",
      initialize: initialize3,
      connect: connect2,
      disconnect: disconnect2,
      observerCallback: observerCallback2,
      callbacks
    };
  }
  function getQueries() {
    const { formSubmitSelector: formSubmitSelector2, buttonDisableSelector: buttonDisableSelector2, linkDisableSelector: linkDisableSelector2, inputChangeSelector: inputChangeSelector2 } = window.mrujs;
    const selectors = [
      linkDisableSelector2,
      buttonDisableSelector2,
      formSubmitSelector2,
      inputChangeSelector2
    ];
    return [
      { event: AJAX_EVENTS.ajaxComplete, selectors },
      { event: AJAX_EVENTS.ajaxStopped, selectors },
      { event: "turbo:submit-end", selectors }
    ];
  }
  function enableElement$1(trigger) {
    let element = trigger;
    if (trigger instanceof Event)
      element = trigger.target;
    const { linkDisableSelector: linkDisableSelector2, buttonDisableSelector: buttonDisableSelector2, formEnableSelector: formEnableSelector2, formSubmitSelector: formSubmitSelector2 } = window.mrujs;
    if (matches$1(element, linkDisableSelector2)) {
      enableLinkElement(element);
      return;
    }
    if (matches$1(element, buttonDisableSelector2) || matches$1(element, formEnableSelector2)) {
      enableFormElement(element);
      return;
    }
    if (matches$1(element, formSubmitSelector2)) {
      enableFormElements(element);
    }
  }
  function enableLinkElement(element) {
    const originalText = element.dataset.ujsEnableWith;
    if (originalText != null) {
      element.innerHTML = originalText;
      element.removeAttribute("data-ujs-enable-with");
    }
    element.removeEventListener("click", stopEverything$1);
    element.removeAttribute("data-ujs-disabled");
  }
  function enableFormElements(form2) {
    const elements = formElements$1(form2, window.mrujs.formEnableSelector);
    elements.forEach(enableFormElement);
  }
  function enableFormElement(element) {
    const originalText = element.dataset.ujsEnableWith;
    if (originalText != null) {
      if (matches$1(element, "button")) {
        element.innerHTML = originalText;
      } else {
        element.value = originalText;
      }
      element.removeAttribute("data-ujs-enable-with");
    }
    element.disabled = false;
    element.removeAttribute("data-ujs-disabled");
  }
  function AddedNodesObserver(callback) {
    const observer = new MutationObserver(callback);
    function connect2() {
      observer.observe(document, { childList: true, subtree: true, attributes: true });
    }
    function disconnect2() {
      observer.disconnect();
    }
    return {
      name: "AddedNodesObserver",
      connect: connect2,
      disconnect: disconnect2
    };
  }
  function Mrujs(obj = {}) {
    var _a2;
    obj.connected = false;
    obj = { ...BASE_SELECTORS };
    obj.FetchResponse = FetchResponse$1;
    obj.FetchRequest = FetchRequest$1;
    obj.addedNodesObserver = AddedNodesObserver(addedNodesCallback);
    obj.remoteWatcher = RemoteWatcher();
    obj.elementEnabler = ElementEnabler();
    obj.elementDisabler = ElementDisabler();
    obj.disabledElementChecker = DisabledElementChecker();
    obj.navigationAdapter = NavigationAdapter();
    obj.clickHandler = ClickHandler();
    obj.confirmClass = Confirm();
    obj.csrf = Csrf();
    obj.method = Method();
    obj.formSubmitDispatcher = FormSubmitDispatcher();
    const corePlugins = [
      obj.addedNodesObserver,
      obj.remoteWatcher,
      obj.csrf,
      obj.elementEnabler,
      obj.clickHandler,
      obj.disabledElementChecker,
      obj.confirmClass,
      obj.elementDisabler,
      obj.method,
      obj.formSubmitDispatcher,
      obj.navigationAdapter
    ];
    obj.corePlugins = corePlugins;
    const plugins = (_a2 = obj.plugins) !== null && _a2 !== void 0 ? _a2 : [];
    obj.plugins = plugins;
    const allPlugins = corePlugins.concat(plugins);
    obj.allPlugins = allPlugins;
    obj.maskLinkMethods = true;
    obj.mimeTypes = { ...BASE_ACCEPT_HEADERS };
    obj.stop = stop;
    obj.restart = restart;
    obj.fetch = fetch3;
    obj.urlEncodeFormData = urlEncodeFormData;
    obj.registerMimeTypes = registerMimeTypes;
    obj.enableElement = enableElement$1;
    obj.enableFormElements = enableFormElements;
    obj.enableFormElement = enableFormElement;
    obj.disableElement = disableElement$1;
    obj.stopEverything = stopEverything$1;
    obj.dispatch = dispatch3;
    obj.addListeners = addListeners;
    obj.removeListeners = removeListeners;
    obj.attachObserverCallback = attachObserverCallback;
    obj.expandUrl = expandUrl;
    obj.findSubmitter = findSubmitter;
    obj.$ = $$1;
    obj.CSRFProtection = CSRFProtection$1;
    obj.csrfParam = csrfParam$1;
    obj.csrfToken = csrfToken$1;
    obj.cspNonce = cspNonce$1;
    obj.confirm = confirm$1;
    obj.handleConfirm = handleConfirm$1;
    obj.handleDisabledElement = handleDisabledElement$1;
    obj.handleMethod = handleMethod$1;
    obj.start = start$1;
    obj.preventInsignificantClick = preventInsignificantClick$1;
    obj.refreshCSRFTokens = refreshCSRFTokens$1;
    obj.delegate = delegate$1;
    obj.fire = fire$1;
    obj.formElements = formElements$1;
    obj.matches = matches$1;
    obj.toArray = toArray;
    return obj;
  }
  function start$1(options = {}) {
    var _a2;
    window.Rails = window.mrujs = this;
    if (window.mrujs.connected) {
      return window.mrujs;
    }
    Object.assign(this, options);
    this.allPlugins = this.corePlugins.concat(this.plugins);
    for (let i = 0; i < this.allPlugins.length; i++) {
      const plugin = this.allPlugins[i];
      (_a2 = plugin.initialize) === null || _a2 === void 0 ? void 0 : _a2.call(plugin);
    }
    connect();
    return this;
  }
  function stop() {
    disconnect();
  }
  function restart() {
    disconnect();
    connect();
  }
  function connect() {
    var _a2;
    reEnableDisabledElements();
    window.addEventListener("pageshow", reEnableDisabledElements);
    for (let i = 0; i < window.mrujs.allPlugins.length; i++) {
      const plugin = window.mrujs.allPlugins[i];
      (_a2 = plugin.connect) === null || _a2 === void 0 ? void 0 : _a2.call(plugin);
    }
    window.mrujs.connected = true;
  }
  function disconnect() {
    var _a2;
    window.removeEventListener("pageshow", reEnableDisabledElements);
    for (let i = 0; i < window.mrujs.allPlugins.length; i++) {
      const plugin = window.mrujs.allPlugins[i];
      (_a2 = plugin.disconnect) === null || _a2 === void 0 ? void 0 : _a2.call(plugin);
    }
    window.mrujs.connected = false;
  }
  function confirm$1(message) {
    return window.confirm(message);
  }
  function addedNodesCallback(mutationList, _observer) {
    for (const mutation of mutationList) {
      let addedNodes;
      if (mutation.type === "attributes") {
        addedNodes = [mutation.target];
      } else {
        addedNodes = Array.from(mutation.addedNodes);
      }
      window.setTimeout(() => {
        var _a2;
        for (let i = 0; i < window.mrujs.allPlugins.length; i++) {
          const plugin = window.mrujs.allPlugins[i];
          (_a2 = plugin.observerCallback) === null || _a2 === void 0 ? void 0 : _a2.call(plugin, addedNodes);
        }
      }, 0);
    }
  }
  function fetch3(input, options = {}) {
    let { element, submitter, dispatchEvents } = options;
    delete options.element;
    delete options.submitter;
    delete options.dispatchEvents;
    const fetchRequest = FetchRequest$1(input, options);
    if (dispatchEvents === true) {
      if (element == null)
        element = document.documentElement;
      dispatch3.call(element, AJAX_EVENTS.ajaxBeforeSend, {
        detail: { element, fetchRequest, request: fetchRequest.request, submitter }
      });
      return void 0;
    }
    return window.fetch(fetchRequest.request);
  }
  function registerMimeTypes(mimeTypes) {
    mimeTypes.forEach((mimeType) => {
      const { shortcut, header } = mimeType;
      window.mrujs.mimeTypes[shortcut] = header;
    });
    return window.mrujs.mimeTypes;
  }
  function reEnableDisabledElements() {
    const { formEnableSelector: formEnableSelector2, linkDisableSelector: linkDisableSelector2 } = window.mrujs;
    $$1(`${formEnableSelector2}, ${linkDisableSelector2}`).forEach((element) => {
      const el = element;
      enableElement$1(el);
    });
  }
  function cspNonce$1() {
    return getMetaContent2("csp-nonce");
  }
  var mrujs = Mrujs();
  var { $, CSRFProtection, buttonClickSelector, buttonDisableSelector, cspNonce, csrfParam, csrfToken, confirm: confirm2, delegate, disableElement, enableElement, fileInputSelector, fire, formDisableSelector, formElements, formEnableSelector, formInputClickSelector, formSubmitSelector, handleConfirm, handleDisabledElement, handleMethod, inputChangeSelector, linkClickSelector, linkDisableSelector, matches, preventInsignificantClick, refreshCSRFTokens, start: start2, stopEverything, FetchResponse: FetchResponse2, FetchRequest: FetchRequest2 } = mrujs;

  // ../../node_modules/mrujs/plugins/dist/plugins.module.js
  var CableCar = class {
    constructor(cableReady, { mimeType } = {}) {
      this.cableReady = cableReady;
      this.mimeType = mimeType !== null && mimeType !== void 0 ? mimeType : "application/vnd.cable-ready.json";
      this.boundPerform = this.perform.bind(this);
    }
    get name() {
      return "CableCar";
    }
    initialize() {
      const anyHeader = window.mrujs.mimeTypes.any;
      window.mrujs.registerMimeTypes([
        { shortcut: "any", header: `${this.mimeType}, ${anyHeader}` },
        { shortcut: "cablecar", header: this.mimeType }
      ]);
    }
    connect() {
      document.addEventListener("ajax:beforeNavigation", this.boundPerform);
    }
    disconnect() {
      document.removeEventListener("ajax:beforeNavigation", this.boundPerform);
    }
    perform(event) {
      const fetchResponse = event.detail.fetchResponse;
      if ((fetchResponse === null || fetchResponse === void 0 ? void 0 : fetchResponse.contentType) == null)
        return;
      if (!this.isCableReadyResponse(fetchResponse.contentType))
        return;
      event.preventDefault();
      fetchResponse.json().then((response) => {
        this.cableReady.perform(response);
      }).catch((err) => {
        console.error(err);
      });
    }
    isCableReadyResponse(contentType) {
      return Boolean(contentType.includes(this.mimeType));
    }
  };

  // application.js
  mrujs.start({
    plugins: [
      new CableCar(javascript_default)
    ]
  });
})();
//# sourceMappingURL=application.js.map
