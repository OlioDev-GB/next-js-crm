/**
 * Zoho Embedded App SDK shim for Generate Client Proposal.
 * Routes CRM calls to /api/widgets/generate-client-proposal?action=…
 */
(function () {
  const API = "/api/widgets/generate-client-proposal";

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
        const entityData = { EntityId: id, Entity: "Deals" };
        pageLoadHandlers.forEach(function (handler) {
          try {
            handler(entityData);
          } catch (err) {
            console.error("[generate-client-proposal shim] PageLoad error", err);
          }
        });
      },
    },
    CRM: {
      UI: {
        Resize: function () {
          return Promise.resolve();
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

        getRelatedRecords: async function (config) {
          const entity = String((config && config.Entity) || "Deals").trim();
          const recordId = String((config && config.RecordID) || "").trim();
          const related = String((config && config.RelatedList) || "").trim();
          const page = config && config.page != null ? config.page : 1;
          const perPage =
            config && config.per_page != null ? config.per_page : 50;
          return jsonFetch(
            apiUrl(
              "related",
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

        getUser: async function (config) {
          const id = String((config && config.ID) || "").trim();
          return jsonFetch(apiUrl("user", "id=" + encodeURIComponent(id)));
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

        attachFile: async function (config) {
          const entity = String((config && config.Entity) || "Deals").trim();
          const recordId = String((config && config.RecordID) || "").trim();
          const file = config && config.File;
          const name = String((file && file.Name) || "proposal.pdf").trim();
          const content = file && file.Content;
          if (!recordId) throw new Error("attachFile: missing RecordID");
          if (!content) throw new Error("attachFile: missing File.Content");

          const form = new FormData();
          form.append("module", entity);
          form.append("recordId", recordId);
          form.append(
            "file",
            content instanceof Blob ?
              content
            : new Blob([content], { type: "application/pdf" }),
            name,
          );
          return jsonFetch(apiUrl("attach"), { method: "POST", body: form });
        },
      },
      CONFIG: {
        getCurrentUser: async function () {
          try {
            return await jsonFetch(apiUrl("me"));
          } catch (err) {
            console.warn(
              "[generate-client-proposal shim] getCurrentUser failed",
              err,
            );
            return { users: [{ id: "", email: "", full_name: "" }] };
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
