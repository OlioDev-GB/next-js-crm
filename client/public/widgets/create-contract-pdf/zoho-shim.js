/**
 * Zoho Embedded App SDK shim for Create Contract PDF (SOW / Deals).
 * Routes CRM calls to /api/widgets/create-contract-pdf?action=…
 */
(function () {
  const API = "/api/widgets/create-contract-pdf";

  function recordIdFromQuery() {
    const params = new URLSearchParams(window.location.search);
    return (params.get("recordId") || params.get("id") || "").trim();
  }

  function moduleFromQuery() {
    const params = new URLSearchParams(window.location.search);
    return (params.get("module") || "Deals").trim() || "Deals";
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
        const entityData = {
          EntityId: id,
          Entity: moduleFromQuery(),
        };
        pageLoadHandlers.forEach(function (handler) {
          try {
            handler(entityData);
          } catch (err) {
            console.error("[create-contract-pdf shim] PageLoad error", err);
          }
        });
      },
    },
    CRM: {
      API: {
        getRecord: async function (config) {
          const entity = String((config && config.Entity) || "").trim();
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

        getRelatedRecords: async function (config) {
          const entity = String((config && config.Entity) || "Deals").trim();
          const recordId = String((config && config.RecordID) || "").trim();
          const related = String((config && config.RelatedList) || "").trim();
          const page = config && config.page != null ? config.page : 1;
          const perPage =
            config && config.per_page != null ? config.per_page : 100;
          return jsonFetch(
            apiUrl(
              "related-list",
              "module=" +
                encodeURIComponent(entity) +
                "&id=" +
                encodeURIComponent(recordId) +
                "&related=" +
                encodeURIComponent(related) +
                "&page=" +
                encodeURIComponent(String(page)) +
                "&per_page=" +
                encodeURIComponent(String(perPage)),
            ),
          );
        },

        uploadFile: async function (config) {
          const file = config && config.FILE && config.FILE.file;
          if (!file) throw new Error("uploadFile: missing FILE.file");
          const form = new FormData();
          form.append("file", file, file.name || "contract.pdf");
          const recordId = recordIdFromQuery();
          if (recordId) form.append("recordId", recordId);
          form.append("module", moduleFromQuery());
          return jsonFetch(apiUrl("upload"), { method: "POST", body: form });
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
      },
      CONFIG: {
        getCurrentUser: async function () {
          try {
            const body = await jsonFetch(apiUrl("me"));
            const users = Array.isArray(body.users) ? body.users : [];
            if (users.length > 0) return { users: users };
            return { users: [{ id: "", email: "" }] };
          } catch (err) {
            console.warn("[create-contract-pdf shim] getCurrentUser failed", err);
            return { users: [{ id: "", email: "" }] };
          }
        },
      },
      FUNCTIONS: {
        execute: async function (name, reqData) {
          const payload =
            reqData && typeof reqData === "object" ?
              reqData
            : { arguments: "{}" };
          return jsonFetch(apiUrl("function"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: name,
              arguments:
                payload.arguments != null ? payload.arguments : "{}",
            }),
          });
        },
      },
    },
  };
})();
