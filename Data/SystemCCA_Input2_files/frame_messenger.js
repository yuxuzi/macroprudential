window.$j = $;
// Generated by CoffeeScript 1.10.0
var FrameMessenger,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

FrameMessenger = (function() {
  FrameMessenger._ALLOWED_CHILD_ORIGINS = ["https://www.dropboxstatic.com", "https://cf.dropboxstatic.com", "https://www.dropbox.com", "https://dl-doc.dropbox.com", "https://dl-web.dropbox.com", "https://dl.dropboxusercontent.com", "null"];

  FrameMessenger._ALLOWED_PARENT_ORIGINS = ["https://www.dropbox.com"];

  FrameMessenger._REQUEST_PARENT_ORIGIN_POLL_DELAY = 100;

  FrameMessenger.prototype._childIframeQuery = null;

  FrameMessenger.prototype._trustedChildOriginForPosting = null;

  FrameMessenger.prototype._trustedParentOriginForPosting = null;

  FrameMessenger.prototype._validActionsFromChild = [];

  FrameMessenger.prototype._validActionsFromParent = [];

  FrameMessenger.prototype._trustedMessageFromChildHandler = null;

  FrameMessenger.prototype._trustedMessageFromParentHandler = null;

  FrameMessenger.prototype._parentMessageQueue = [];

  FrameMessenger.prototype._requestParentOriginPollRetry = null;

  FrameMessenger.prototype._onParentReady = null;

  function FrameMessenger() {
    this.handleUntrustedMessage = bind(this.handleUntrustedMessage, this);
    Object.defineProperty(this, "trustedParentOriginForPosting", {
      get: function() {
        return this._trustedParentOriginForPosting;
      }
    });
    Object.defineProperty(this, "trustedChildOriginForPosting", {
      get: function() {
        var $childIframes, i, iframe, len;
        if (this._trustedChildOriginForPosting != null) {
          return this._trustedChildOriginForPosting;
        }
        $childIframes = $j(this._childIframeQuery);
        for (i = 0, len = $childIframes.length; i < len; i++) {
          iframe = $childIframes[i];
          if (this._validateChildOriginForPosting(iframe.src)) {
            break;
          }
        }
        return this._trustedChildOriginForPosting;
      }
    });
  }

  FrameMessenger.prototype.resetOriginsForPosting = function() {
    this._trustedChildOriginForPosting = null;
    return this._trustedParentOriginForPosting = null;
  };

  FrameMessenger.prototype.configureChildMessaging = function(childIframeQuery, trustedMessageFromChildHandler, validActionsFromChild) {
    this._childIframeQuery = childIframeQuery;
    this._trustedChildOriginForPosting = null;
    this._validActionsFromChild = validActionsFromChild;
    return this._trustedMessageFromChildHandler = trustedMessageFromChildHandler;
  };

  FrameMessenger.prototype.configureParentMessaging = function(trustedMessageFromParentHandler, validActionsFromParent, onParentReady) {
    if (onParentReady == null) {
      onParentReady = null;
    }
    this._trustedParentOriginForPosting = null;
    this._validActionsFromParent = validActionsFromParent;
    this._trustedMessageFromParentHandler = trustedMessageFromParentHandler;
    return this._onParentReady = onParentReady;
  };

  FrameMessenger.prototype.startListening = function() {
    window.addEventListener('message', this.handleUntrustedMessage);
    if ((this._validActionsFromParent != null) && this._validActionsFromParent.length > 0 && (this._trustedMessageFromParentHandler != null)) {
      this._requestParentOrigin();
    }
    if ((this._validActionsFromChild != null) && this._validActionsFromChild.length > 0 && (this._trustedMessageFromChildHandler != null)) {
      return this.postMessageToChildren("parent-ready");
    }
  };

  FrameMessenger.prototype.stopListening = function() {
    return window.removeEventListener('message', this.handleUntrustedMessage);
  };

  FrameMessenger.prototype._getOriginFromUrl = function(url) {
    var temp_link;
    temp_link = document.createElement('a');
    temp_link.href = url;
    return "https://" + temp_link.hostname;
  };

  FrameMessenger.prototype._isChildOriginAllowed = function(origin) {
    return indexOf.call(this.constructor._ALLOWED_CHILD_ORIGINS, origin) >= 0 || this._isDevVmOrigin(origin);
  };

  FrameMessenger.prototype._isParentOriginAllowed = function(origin) {
    return indexOf.call(this.constructor._ALLOWED_PARENT_ORIGINS, origin) >= 0 || this._isDevVmOrigin(origin);
  };

  FrameMessenger.prototype._isDevVmOrigin = function(origin) {
    var regexMatch;
    regexMatch = origin.match(/\.dev\.corp\.dropbox(static|usercontent)?\.com$/);
    return (regexMatch != null ? regexMatch.length : void 0) >= 1;
  };

  FrameMessenger.prototype._validateChildOriginForPosting = function(url) {
    var origin;
    if (url === "null") {
      origin = "*";
    } else {
      origin = this._getOriginFromUrl(url);
    }
    if (!(url === "null" || this._isChildOriginAllowed(origin))) {
      console.warn("Untrusted message from child blocked: " + url);
      return false;
    }
    this._trustedChildOriginForPosting = origin;
    return true;
  };

  FrameMessenger.prototype.childIsValidated = function() {
    return this._trustedChildOriginForPosting != null;
  };

  FrameMessenger.prototype._validateParentOriginForPosting = function(url) {
    var i, len, message, messageJson, origin, previousParentOrigin, ref;
    previousParentOrigin = this._trustedParentOriginForPosting;
    origin = this._getOriginFromUrl(url);
    if (!this._isParentOriginAllowed(origin)) {
      console.warn("Untrusted message from parent blocked: " + url);
      return false;
    }
    this._trustedParentOriginForPosting = origin;
    if (this._parentMessageQueue.length > 0) {
      ref = this._parentMessageQueue;
      for (i = 0, len = ref.length; i < len; i++) {
        message = ref[i];
        messageJson = JSON.parse(message);
        this.postMessageToParent(messageJson.action, messageJson.parameters);
      }
      this._parentMessageQueue = [];
    }
    if ((this._trustedParentOriginForPosting != null) && (previousParentOrigin == null) && (this._onParentReady != null)) {
      this._onParentReady();
    }
    return true;
  };

  FrameMessenger.prototype.handleUntrustedMessage = function(message) {
    var error, error1, messageJson, ref, ref1;
    if (!(this._isChildOriginAllowed(message.origin) || this._isParentOriginAllowed(message.origin))) {
      console.warn("Message received not in parent or child origin whitelist: " + message.origin);
      return;
    }
    try {
      messageJson = JSON.parse(message.data);
    } catch (error1) {
      error = error1;
      return;
    }
    if (messageJson.action == null) {
      return;
    }
    if (messageJson.action === "child-requesting-parent-origin") {
      if (this._validateChildOriginForPosting(message.origin)) {
        this.postMessageToChildren("parent-ready");
      }
      return;
    }
    if (messageJson.action === "parent-ready") {
      this._validateParentOriginForPosting(message.origin);
      return;
    }
    if ((ref = messageJson.action, indexOf.call(this._validActionsFromChild, ref) >= 0) && (this._validateChildOriginForPosting(message.origin) && (this._trustedMessageFromChildHandler != null))) {
      this._trustedMessageFromChildHandler(messageJson);
      return;
    }
    if ((ref1 = messageJson.action, indexOf.call(this._validActionsFromParent, ref1) >= 0) && (this._validateParentOriginForPosting(message.origin) && (this._trustedMessageFromParentHandler != null))) {
      this._trustedMessageFromParentHandler(messageJson);
    }
  };

  FrameMessenger.prototype._packagePostMessage = function(action, parameterJson) {
    var messageJson, trustedChildOrigin;
    trustedChildOrigin = this.trustedChildOriginForPosting;
    messageJson = {
      "action": action,
      "parameters": parameterJson
    };
    return JSON.stringify(messageJson);
  };

  FrameMessenger.prototype.postMessageToChildElements = function($iframes, action, parameterJson) {
    var i, iframe, len, message, results;
    if (parameterJson == null) {
      parameterJson = {};
    }
    if (this.trustedChildOriginForPosting == null) {
      return;
    }
    message = this._packagePostMessage(action, parameterJson);
    results = [];
    for (i = 0, len = $iframes.length; i < len; i++) {
      iframe = $iframes[i];
      results.push(iframe.contentWindow.postMessage(message, this.trustedChildOriginForPosting));
    }
    return results;
  };

  FrameMessenger.prototype.postMessageToChildren = function(action, parameterJson, iframeQuery) {
    var $iframes;
    if (parameterJson == null) {
      parameterJson = {};
    }
    if (iframeQuery == null) {
      iframeQuery = null;
    }
    if (iframeQuery == null) {
      iframeQuery = this._childIframeQuery;
    }
    $iframes = $j(iframeQuery);
    return this.postMessageToChildElements($iframes, action, parameterJson);
  };

  FrameMessenger.prototype.postMessageToParent = function(action, parameterJson) {
    var message;
    if (parameterJson == null) {
      parameterJson = {};
    }
    message = this._packagePostMessage(action, parameterJson);
    if (this.trustedParentOriginForPosting == null) {
      this._parentMessageQueue.push(message);
      return;
    }
    return window.parent.postMessage(message, this.trustedParentOriginForPosting);
  };

  FrameMessenger.prototype._requestParentOrigin = function() {
    var tryRequestParentOrigin;
    window.parent.postMessage('{"action": "child-requesting-parent-origin"}', '*');
    tryRequestParentOrigin = function() {
      this._requestParentOriginPollRetry = null;
      if (this._trustedParentOriginForPosting != null) {
        return;
      }
      return this._requestParentOrigin();
    };
    return setTimeout($j.proxy(tryRequestParentOrigin, this), this._REQUEST_PARENT_ORIGIN_POLL_DELAY);
  };

  return FrameMessenger;

})();
