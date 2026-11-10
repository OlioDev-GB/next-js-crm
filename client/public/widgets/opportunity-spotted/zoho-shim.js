/**
 * Zoho Embedded App SDK shim for Opportunity Spotted Stage.
 * Routes CRM calls to /api/widgets/opportunity-spotted?action=…
 */
(function () {
  const API = "/api/widgets/opportunity-spotted";

  function recordIdFromQuery() {
    const params = new URLSearchParams(window.location.search);
    return (params.get("recordId") || params.get("id") || "").trim();
  }

  function apiUrl(action, extraQuery) {
    var q = "action=" + encodeURIComponent(action);
    if (extraQuery) q += "&" + extraQuery;
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
      err.data = body.data;
      throw err;
    }
    return body;
  }

  const pageLoadHandlers = [];

  window.ZOHO = {
    embeddedApp: {
      on: function (event, handler) {
        if (event === "PageLoad" && typeof handler === "function") {
          pageLoadHandlers.push(handler);
        }
      },
      init: function () {
        const id = recordIdFromQuery();
        // Original widget reads EntityId[0]
        const entityData = { EntityId: id ? [id] : [], Entity: "Deals" };
        const run = function () {
          pageLoadHandlers.forEach(function (handler) {
            try {
              handler(entityData);
            } catch (err) {
              console.error("[opportunity-spotted shim] PageLoad error", err);
            }
          });
        };
        // Match Zoho SDK: init() returns a thenable
        return Promise.resolve().then(run);
      },
    },
    CRM: {
      UI: {
        Resize: function () {
          return Promise.resolve({ status: "success" });
        },
        Popup: {
          closeReload: function () {
            try {
              window.parent.postMessage(
                { type: "opportunity-spotted:close", reload: true },
                "*",
              );
            } catch (e) {}
            return Promise.resolve({ status: "success" });
          },
          close: function () {
            try {
              window.parent.postMessage(
                { type: "opportunity-spotted:close", reload: false },
                "*",
              );
            } catch (e) {}
            return Promise.resolve({ status: "success" });
          },
        },
      },
      API: {
        getRecord: async function (config) {
          const entity = String((config && config.Entity) || "Deals").trim();
          const recordId = String((config && config.RecordID) || "").trim();
          return jsonFetch(
            apiUrl(
              "record",
              "module=" +
                encodeURIComponent(entity) +
                "&id=" +
                encodeURIComponent(recordId),
            ),
          );
        },
        updateRecord: async function (config) {
          return jsonFetch(apiUrl("update"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              Entity: config && config.Entity,
              APIData: config && config.APIData,
              Trigger: config && config.Trigger,
            }),
          });
        },
      },
    },
  };
})();
