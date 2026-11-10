/**
 * Zoho Embedded App SDK shim for Send SOW (sow sourcing status).
 * Routes CRM calls to /api/widgets/send-sow?action=…
 */
(function () {
  const API = "/api/widgets/send-sow";

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
      err.code = body.code || body.error;
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
        pageLoadHandlers.forEach(function (handler) {
          try {
            handler(entityData);
          } catch (err) {
            console.error("[send-sow shim] PageLoad error", err);
          }
        });
      },
    },
    CRM: {
      UI: {
        Resize: function () {
          return Promise.resolve();
        },
        Popup: {
          closeReload: function () {
            try {
              window.parent.postMessage(
                { type: "send-sow:close", reload: true },
                "*",
              );
            } catch (e) {}
            return Promise.resolve({ status: "success" });
          },
          close: function () {
            try {
              window.parent.postMessage(
                { type: "send-sow:close", reload: false },
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

        uploadFile: async function (config) {
          const file = config && config.FILE && config.FILE.file;
          if (!file) throw new Error("uploadFile: missing FILE.file");
          const form = new FormData();
          form.append("file", file, file.name || "attachment");
          const recordId = recordIdFromQuery();
          if (recordId) form.append("recordId", recordId);
          return jsonFetch(apiUrl("upload"), { method: "POST", body: form });
        },
      },
      FUNCTIONS: {
        execute: async function (name, reqData) {
          return jsonFetch(apiUrl("function"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: name,
              arguments:
                reqData && reqData.arguments != null ?
                  reqData.arguments
                : "{}",
            }),
          });
        },
      },
    },
  };
})();
