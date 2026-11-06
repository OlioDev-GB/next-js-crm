/**
 * Zoho SDK shim for Approved by Ops (Vendor Invoice Widget Ops).
 * Routes CRM calls to /api/widgets/approved-by-ops?action=…
 */
(function () {
  const API = "/api/widgets/approved-by-ops";

  function recordIdsFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const multi = (params.get("recordIds") || "").trim();
    if (multi) {
      return multi
        .split(",")
        .map(function (id) {
          return id.trim();
        })
        .filter(Boolean);
    }
    const single = (params.get("recordId") || params.get("id") || "").trim();
    return single ? [single] : [];
  }

  function apiUrl(action, extra) {
    var q = "action=" + encodeURIComponent(action);
    if (extra) q += "&" + extra;
    return API + "?" + q;
  }

  async function jsonFetch(url, options) {
    const res = await fetch(url, options);
    const body = await res.json().catch(function () {
      return {};
    });
    if (!res.ok) {
      const err = new Error(body.error || body.message || "HTTP " + res.status);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return body;
  }

  var pageLoadHandlers = [];

  window.ZOHO = {
    embeddedApp: {
      on: function (event, handler) {
        if (event === "PageLoad" && typeof handler === "function") {
          pageLoadHandlers.push(handler);
        }
      },
      init: function () {
        var ids = recordIdsFromQuery();
        var entityData = {
          EntityId: ids,
          Entity: "Vendor_Invoices",
        };
        pageLoadHandlers.forEach(function (handler) {
          try {
            handler(entityData);
          } catch (err) {
            console.error("[approved-by-ops shim] PageLoad error", err);
          }
        });
      },
    },
    CRM: {
      API: {
        updateRecord: async function (config) {
          return jsonFetch(apiUrl("update"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              Entity: config && config.Entity,
              APIData: config && config.APIData,
            }),
          });
        },
      },
      CONFIG: {
        getCurrentUser: async function () {
          try {
            return await jsonFetch(apiUrl("me"));
          } catch (err) {
            console.warn("[approved-by-ops shim] getCurrentUser failed", err);
            return { users: [{ id: "", profile: { name: "" } }] };
          }
        },
      },
      FUNCTIONS: {
        execute: async function (name, reqData) {
          return jsonFetch(apiUrl("function"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: name,
              arguments: reqData && reqData.arguments,
            }),
          });
        },
      },
      UI: {
        Popup: {
          close: function () {
            try {
              window.parent.postMessage(
                { type: "approved-by-ops:close" },
                window.location.origin,
              );
            } catch (err) {
              console.warn("[approved-by-ops shim] Popup.close failed", err);
            }
          },
        },
      },
    },
  };

  // Optional Groq key for Compare with AI (never hardcode secrets).
  jsonFetch(apiUrl("config"))
    .then(function (body) {
      if (body && body.groqApiKey) {
        window.__GROQ_API_KEY = String(body.groqApiKey);
      }
    })
    .catch(function () {
      /* AI compare stays disabled without GROQ_API_KEY */
    });
})();
