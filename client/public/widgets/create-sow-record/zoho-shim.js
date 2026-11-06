/**
 * Zoho SDK shim for Create SOW Records — List.
 * Routes CRM calls to /api/widgets/create-sow-record?action=…
 */
(function () {
  const API = "/api/widgets/create-sow-record";

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

  function moduleFromQuery() {
    const params = new URLSearchParams(window.location.search);
    return (params.get("module") || "Accounts").trim() || "Accounts";
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
          Entity: moduleFromQuery(),
        };
        pageLoadHandlers.forEach(function (handler) {
          try {
            handler(entityData);
          } catch (err) {
            console.error("[create-sow-record shim] PageLoad error", err);
          }
        });
      },
    },
    CRM: {
      API: {
        getRecord: async function (config) {
          var entity = String((config && config.Entity) || "Accounts").trim();
          var recordId = String((config && config.RecordID) || "").trim();
          return jsonFetch(
            apiUrl(
              "record",
              "id=" +
                encodeURIComponent(recordId) +
                "&module=" +
                encodeURIComponent(entity),
            ),
          );
        },
        insertRecord: async function (config) {
          return jsonFetch(apiUrl("insert"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              Entity: config && config.Entity,
              APIData: config && config.APIData,
              Trigger: config && config.Trigger,
            }),
          });
        },
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
        searchRecord: async function (config) {
          return jsonFetch(apiUrl("search"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              Entity: config && config.Entity,
              Type: config && config.Type,
              Query: config && config.Query,
            }),
          });
        },
      },
      CONFIG: {
        getCurrentUser: async function () {
          try {
            return await jsonFetch(apiUrl("me"));
          } catch (err) {
            console.warn("[create-sow-record shim] getCurrentUser failed", err);
            return { users: [{ id: "", email: "" }] };
          }
        },
      },
    },
  };
})();
